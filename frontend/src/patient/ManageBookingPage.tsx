import { useState } from 'react';
import { useLocation } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { Slip } from '../components/Slip';
import { formatDateTime } from '../lib/dates';
import { LookupForm } from './LookupForm';
import { bookingLookup, type BookingLookup } from './validation';

type Found = { booking: Schemas['BookingDetails']; email: string };

/** A patient has no account: the booking code plus the e-mail used to book open the booking. */
export function ManageBookingPage() {
  const [found, setFound] = useState<Found>();
  // Typed on the home page, which sends the patient here to see the booking.
  const location = useLocation();
  const [typedElsewhere, setTypedElsewhere] = useState(() => lookupIn(location.state));

  async function lookUp({ code, email }: BookingLookup) {
    const booking = await unwrap(
      api.POST('/api/v1/bookings/{code}/lookup', {
        params: { path: { code } },
        body: { email },
      }),
    );
    setFound({ booking, email });
  }

  return (
    <div className="max-w-xl space-y-6">
      <title>La mia prenotazione - Poliambulatorio Valdoria</title>
      <h1 className="text-3xl font-bold">La mia prenotazione</h1>
      {found ? (
        <FoundBooking
          found={found}
          onChange={(booking) => {
            setFound({ ...found, booking });
          }}
          onSearchAgain={() => {
            setFound(undefined);
            setTypedElsewhere(undefined);
          }}
        />
      ) : (
        <>
          <p>Scrivi il codice che hai ricevuto e l’email con cui hai prenotato.</p>
          <LookupForm submitLabel="Cerca prenotazione" initial={typedElsewhere} onSubmit={lookUp} />
        </>
      )}
    </div>
  );
}

function lookupIn(state: unknown): BookingLookup | undefined {
  const parsed = bookingLookup.safeParse(state);
  return parsed.success ? parsed.data : undefined;
}

type FoundBookingProps = {
  found: Found;
  onChange: (booking: Schemas['BookingDetails']) => void;
  onSearchAgain: () => void;
};

function FoundBooking({ found, onChange, onSearchAgain }: FoundBookingProps) {
  const { booking, email } = found;
  const [asking, setAsking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string>();
  const [justCancelled, setJustCancelled] = useState(false);
  const canCancel = booking.status === 'BOOKED' && new Date(booking.startsAt) > new Date();

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
    <div className="space-y-6">
      {justCancelled && (
        <Notice kind="success">
          Prenotazione annullata. L’orario è di nuovo disponibile per altri pazienti.
        </Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      <Slip booking={booking} />
      {canCancel && !asking && (
        <Button
          variant="secondary"
          onClick={() => {
            setAsking(true);
          }}
        >
          Annulla prenotazione
        </Button>
      )}
      {canCancel && asking && (
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
    </div>
  );
}
