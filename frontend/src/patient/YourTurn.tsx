import type { Schemas } from '../api/client';
import { Flaps } from '../components/Flaps';
import { LineChip, WayArrow } from '../components/Wayfinding';
import { formatSpokenTime } from '../lib/dates';
import { directions, lineColor } from '../lib/specialty';
import type { Turn } from './turn';

type Booking = Schemas['BookingDetails'];

/**
 * The news of the waiting room screen, on the patient's own phone: the number taken at the desk,
 * then "it's your turn" with where to go.
 */
export function YourTurn({ booking, turn }: { booking: Booking; turn: Turn }) {
  switch (turn.kind) {
    case 'arriving':
      return (
        <section
          aria-labelledby="oggi"
          className="rounded-2xl border-l-8 bg-paper px-5 py-4"
          style={{ borderColor: lineColor(booking.specialty) }}
        >
          <h2 id="oggi" className="text-xl font-extrabold">
            La visita è oggi alle {formatSpokenTime(booking.startsAt)}
          </h2>
          <p className="mt-1">
            Quando arrivi, passa in accettazione: ricevi un numero e da qui vedi quando tocca a te.
            In sala d’attesa ti chiamiamo con il numero, mai con il nome.
          </p>
        </section>
      );
    case 'waiting':
      return (
        <section
          aria-labelledby="il-tuo-numero"
          className="on-ink rounded-2xl bg-ink px-5 py-5 text-white sm:px-6"
        >
          <h2 id="il-tuo-numero" className="text-lg text-[#c9d5de]">
            Il tuo numero
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Flaps value={turn.number} className="text-[4rem]" />
            <p className="max-w-[26rem] text-lg">
              Ti chiamiamo sullo schermo della sala d’attesa e anche qui: tieni aperta questa
              pagina.
            </p>
          </div>
        </section>
      );
    case 'called':
      return (
        // An alert: whoever uses a screen reader hears it at once, wherever they are on the page.
        <section
          role="alert"
          aria-labelledby="tocca-a-te"
          className="on-ink rounded-2xl bg-ink px-5 py-5 text-white sm:px-6"
        >
          <h2 id="tocca-a-te" className="text-[2rem] leading-tight font-extrabold tracking-tight">
            È il tuo turno
          </h2>{' '}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Flaps value={turn.number} flip className="text-[4rem]" />{' '}
            <p className="flex items-center gap-3 text-[2rem] leading-none font-extrabold">
              <WayArrow className="size-[0.8em]" />
              {booking.room || booking.specialty}
            </p>
          </div>{' '}
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-lg">
            {booking.room && (
              <>
                <LineChip specialty={booking.specialty} className="px-3 py-0.5" />{' '}
              </>
            )}
            {directions(booking.floor, booking.specialty)}
          </p>
        </section>
      );
  }
}
