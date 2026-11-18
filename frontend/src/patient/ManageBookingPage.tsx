import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { Ticket } from '../components/Ticket';
import { TicketActions } from '../components/TicketActions';
import { formatDateTime, formatWhen } from '../lib/dates';
import { LookupForm } from './LookupForm';
import { MoveVisit } from './MoveVisit';
import { bookingLookup, type BookingLookup } from './validation';
import { isWatched, turnOf, useBuzzWhenCalled } from './turn';
import { YourTurn } from './YourTurn';

type Booking = Schemas['BookingDetails'];

/** What opens a booking: there is no account, only the code and the e-mail used to book. */
type Found = { code: string; email: string };

/** On the day of the visit, while the patient waits for the number or the call. */
const WATCH_EVERY = 5_000;

const TITLE = 'La mia prenotazione - Poliambulatorio Valdoria';

function lookup(code: string, email: string) {
  return unwrap(
    api.POST('/api/v1/bookings/{code}/lookup', { params: { path: { code } }, body: { email } }),
  );
}

/** A patient has no account: the booking code plus the e-mail used to book open the booking. */
export function ManageBookingPage() {
  const queryClient = useQueryClient();
  const [found, setFound] = useState<Found>();
  // Typed on the home page, which sends the patient here to see the booking.
  const location = useLocation();
  const [typedElsewhere, setTypedElsewhere] = useState(() => lookupIn(location.state));

  async function lookUp({ code, email }: BookingLookup) {
    const booking = await lookup(code, email);
    queryClient.setQueryData(['booking', booking.code], booking);
    setFound({ code: booking.code, email });
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-[2.1rem]/tight font-extrabold tracking-[-0.02em] sm:text-5xl/tight">
        La mia prenotazione
      </h1>
      {found ? (
        <FoundBooking
          found={found}
          onSearchAgain={() => {
            setFound(undefined);
            setTypedElsewhere(undefined);
          }}
        />
      ) : (
        <div className="max-w-xl space-y-6">
          <title>{TITLE}</title>
          <p>Scrivi il codice che hai ricevuto e l’email con cui hai prenotato.</p>
          <LookupForm submitLabel="Cerca prenotazione" initial={typedElsewhere} onSubmit={lookUp} />
        </div>
      )}
    </div>
  );
}

/**
 * The booking lives in the query cache: what the patient changes is written there, and on the
 * day of the visit the page asks the server again every few seconds, for the number and the call.
 */
function FoundBooking({ found, onSearchAgain }: { found: Found; onSearchAgain: () => void }) {
  const queryClient = useQueryClient();
  const key = ['booking', found.code];
  const { data: booking } = useQuery({
    queryKey: key,
    queryFn: () => lookup(found.code, found.email),
    staleTime: WATCH_EVERY,
    refetchInterval: (query) =>
      query.state.data && isWatched(query.state.data, new Date()) ? WATCH_EVERY : false,
    refetchIntervalInBackground: true,
  });
  if (!booking) {
    return null;
  }
  return (
    <BookingView
      booking={booking}
      email={found.email}
      onChange={(changed) => {
        queryClient.setQueryData(key, changed);
      }}
      onSearchAgain={onSearchAgain}
    />
  );
}

function lookupIn(state: unknown): BookingLookup | undefined {
  const parsed = bookingLookup.safeParse(state);
  return parsed.success ? parsed.data : undefined;
}

type BookingViewProps = {
  booking: Booking;
  email: string;
  onChange: (booking: Booking) => void;
  onSearchAgain: () => void;
};

function BookingView({ booking, email, onChange, onSearchAgain }: BookingViewProps) {
  const [asking, setAsking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string>();
  const [justCancelled, setJustCancelled] = useState(false);
  const [moving, setMoving] = useState(false);
  const [justMoved, setJustMoved] = useState(false);
  const canChange = booking.status === 'BOOKED' && new Date(booking.startsAt) > new Date();
  const turn = turnOf(booking, new Date());
  useBuzzWhenCalled(booking.calledAt);

  async function cancel() {
    setCancelling(true);
    setError(undefined);
    try {
      const cancelled = await unwrap(
        api.POST('/api/v1/bookings/{code}/cancellation', {
          params: { path: { code: booking.code } },
          body: { email },
        }),
      );
      onChange(cancelled);
      setJustCancelled(true);
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setCancelling(false);
      setAsking(false);
    }
  }

  return (
    <div className="space-y-8">
      <title>{turn?.kind === 'called' ? 'È il tuo turno - Poliambulatorio Valdoria' : TITLE}</title>
      {turn && <YourTurn booking={booking} turn={turn} />}
      <div className="grid items-start gap-x-16 gap-y-8 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <Ticket
          specialty={booking.specialty}
          doctor={booking.doctorName}
          startsAt={booking.startsAt}
          patient={booking.patientName}
          code={booking.code}
          status={booking.status}
        />
        <div className="min-w-0 space-y-6">
          {justCancelled && (
            <Notice kind="success">
              Prenotazione annullata. L’orario è di nuovo disponibile per altri pazienti.
            </Notice>
          )}
          {justMoved && (
            <Notice kind="success">
              Visita spostata a {formatWhen(booking.startsAt)}. Il codice resta lo stesso; ti
              abbiamo scritto anche per email.
            </Notice>
          )}
          {error && <Notice kind="error">{error}</Notice>}
          {moving ? (
            <MoveVisit
              booking={booking}
              email={email}
              onMoved={(moved) => {
                onChange(moved);
                setMoving(false);
                setJustMoved(true);
              }}
              onClose={() => {
                setMoving(false);
              }}
            />
          ) : (
            <>
              {booking.status === 'BOOKED' && <TicketActions booking={booking} />}
              {canChange && !asking && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setJustMoved(false);
                      setMoving(true);
                    }}
                  >
                    Sposta la visita
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAsking(true);
                    }}
                  >
                    Annulla prenotazione
                  </Button>
                </div>
              )}
              {canChange && asking && (
                <div className="space-y-3 border-l-8 border-danger bg-paper p-4">
                  <p className="font-bold">
                    Vuoi annullare la visita di {formatDateTime(booking.startsAt)}?
                  </p>
                  <p>Non potrai ripristinarla: dovrai prenotare di nuovo.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="danger" disabled={cancelling} onClick={() => void cancel()}>
                      Sì, annulla la visita
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={cancelling}
                      onClick={() => {
                        setAsking(false);
                      }}
                    >
                      No, la tengo
                    </Button>
                  </div>
                </div>
              )}
              <p>
                <Button variant="quiet" onClick={onSearchAgain}>
                  Cerca un’altra prenotazione
                </Button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
