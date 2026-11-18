import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api, unwrap, type Schemas } from '../api/client';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Loadable } from '../components/Loadable';
import { Notice } from '../components/Notice';
import { addDays, formatWhen, todayAtTheClinic } from '../lib/dates';
import { SlotStep } from './SlotStep';

const DAYS_PER_PAGE = 14;
const BOOKING_HORIZON_DAYS = 90;

type MoveVisitProps = {
  booking: Schemas['BookingDetails'];
  email: string;
  onMoved: (booking: Schemas['BookingDetails']) => void;
  onClose: () => void;
};

/**
 * Another time with the same doctor. The visit keeps its code, and the old time is given up only
 * when the new one is confirmed: there is never a moment without a visit.
 */
export function MoveVisit({ booking, email, onMoved, onClose }: MoveVisitProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const today = todayAtTheClinic();
  const [from, setFrom] = useState(today);
  const [chosen, setChosen] = useState<string>();
  const [moving, setMoving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const to = addDays(from, DAYS_PER_PAGE - 1);

  const slots = useQuery({
    queryKey: ['slots', booking.doctorId, from],
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/doctors/{doctorId}/slots', {
          params: { path: { doctorId: booking.doctorId }, query: { from, to } },
        }),
      ),
  });

  useEffect(() => {
    heading.current?.focus();
  }, []);

  async function move(startsAt: string) {
    setMoving(true);
    setFailure(undefined);
    try {
      onMoved(
        await unwrap(
          api.POST('/api/v1/bookings/{code}/rescheduling', {
            params: { path: { code: booking.code } },
            body: { email, startsAt },
          }),
        ),
      );
    } catch (error) {
      // Most likely someone took that time first: back to the times, fetched again.
      setFailure(messageFor(error));
      setChosen(undefined);
      void slots.refetch();
    } finally {
      setMoving(false);
    }
  }

  return (
    <section aria-labelledby="sposta-visita" className="space-y-5">
      <h2
        id="sposta-visita"
        ref={heading}
        tabIndex={-1}
        className="text-2xl/tight font-extrabold tracking-tight"
      >
        Scegli il nuovo orario
      </h2>
      <p className="text-ink-soft">
        Con {booking.doctorName}. Il codice resta lo stesso, e l’orario di adesso resta tuo finché
        non confermi quello nuovo.
      </p>
      {failure && <Notice kind="error">{failure}</Notice>}
      {chosen ? (
        <div className="space-y-3 rounded-2xl bg-paper p-4">
          <p className="font-bold">
            Spostare la visita da {formatWhen(booking.startsAt, today)} a{' '}
            {formatWhen(chosen, today)}?
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={moving} onClick={() => void move(chosen)}>
              {moving ? 'Spostamento in corso…' : 'Sì, sposta la visita'}
            </Button>
            <Button
              variant="secondary"
              disabled={moving}
              onClick={() => {
                setChosen(undefined);
              }}
            >
              Scegli un altro orario
            </Button>
          </div>
        </div>
      ) : (
        <Loadable query={slots} loading="Carico gli orari…">
          {(list) => (
            <SlotStep
              slots={list}
              from={from}
              to={to}
              onChoose={setChosen}
              onEarlier={
                from > today
                  ? () => {
                      setFrom(addDays(from, -DAYS_PER_PAGE));
                    }
                  : undefined
              }
              onLater={
                addDays(from, DAYS_PER_PAGE) <= addDays(today, BOOKING_HORIZON_DAYS)
                  ? () => {
                      setFrom(addDays(from, DAYS_PER_PAGE));
                    }
                  : undefined
              }
            />
          )}
        </Loadable>
      )}
      <Button variant="quiet" onClick={onClose}>
        Lascia la visita com’è
      </Button>
    </section>
  );
}
