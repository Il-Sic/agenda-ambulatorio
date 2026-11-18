import { useId, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Schemas } from '../api/client';
import { Loadable } from '../components/Loadable';
import { formatTime, formatWhen, todayAtTheClinic } from '../lib/dates';
import { lineColor } from '../lib/specialty';
import { LookupForm } from './LookupForm';
import { stepHeadingId } from './stepHeading';

type Query<T> = {
  data: T | undefined;
  error: unknown;
  isPending: boolean;
  dataUpdatedAt: number;
  refetch: () => unknown;
};

type HomeProps = {
  specialties: Query<Schemas['SpecialtySummary'][]>;
  firstFreeSlots: Query<Schemas['FirstFreeSlot'][]>;
};

/**
 * The first step of a booking, and the front door of the site: every specialty is a line that
 * comes down from "you are here" and bends into its row, like the lines on a hospital floor.
 */
export function Home({ specialties, firstFreeSlots }: HomeProps) {
  const navigate = useNavigate();
  const count = specialties.data?.length ?? 0;
  const colours = [...(specialties.data ?? [])].reverse().map(({ name }) => lineColor(name));

  return (
    <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <title>Prenota una visita - Poliambulatorio Valdoria</title>
      {/* Until the specialties arrive, keep room for the usual five lines: nothing jumps. */}
      <div className="line-map min-w-0" style={{ '--n': count || 5 } as CSSProperties}>
        <div className="line-map-row">
          <div aria-hidden="true" className="relative">
            <span className="line-origin">Sei qui</span>
            {colours.map((colour, line) => (
              <span
                key={line}
                className="line paint"
                style={{ '--k': line, '--line': colour } as CSSProperties}
              />
            ))}
          </div>
          <div className="pb-8 sm:pb-11">
            <h1
              id={stepHeadingId(1)}
              tabIndex={-1}
              className="text-[2.6rem] leading-none font-extrabold tracking-[-0.025em] sm:text-[4.25rem]"
            >
              Segui la linea.
            </h1>
            <p className="mt-3 max-w-[30em] text-ink-soft sm:mt-5 sm:text-xl/[1.45]">
              Ogni specialità ha il suo colore. Scegli la tua: vedi subito il primo posto libero e
              prenoti con nome, email e telefono, senza registrarti.
            </p>
            <FreshnessNote firstFreeSlots={firstFreeSlots} />
          </div>
        </div>
        <Loadable query={specialties} loading="Carico le specialità…">
          {(list) => (
            <ul aria-label="Specialità">
              {list.map((specialty, row) => (
                <SpecialtyRow
                  key={specialty.id}
                  specialty={specialty}
                  row={row}
                  colours={colours}
                  firstFreeSlot={firstFreeSlots.data?.find(
                    (slot) => slot.specialtyId === specialty.id,
                  )}
                  searching={firstFreeSlots.isPending}
                />
              ))}
            </ul>
          )}
        </Loadable>
      </div>

      <aside aria-labelledby="gia-prenotato" className="hidden lg:block lg:pt-1">
        <h2 id="gia-prenotato" className="text-2xl font-extrabold tracking-tight">
          Hai già prenotato?
        </h2>
        <p className="mt-2 text-ink-soft">
          Con il codice di prenotazione e la tua email puoi rivedere, spostare o annullare la
          visita.
        </p>
        <div className="ticket mt-5">
          <div aria-hidden="true" className="ticket-torn-top" />
          <div className="rounded-b-2xl bg-paper px-6 pt-5 pb-6">
            <LookupForm
              submitLabel="Ritrova la prenotazione"
              onSubmit={async (lookup) => {
                await navigate('/prenotazione', { state: lookup });
              }}
            />
          </div>
        </div>
        <p className="mt-9 text-ink-soft">
          <strong className="text-ink">Via dei Tigli 12, Valdoria</strong>
          <br />
          Aperto dal lunedì al venerdì dalle 8:30 alle 19:00, il sabato fino alle 13:00.
        </p>
      </aside>

      <div className="ticket lg:hidden">
        <div aria-hidden="true" className="ticket-torn-top" />
        <div className="rounded-b-2xl bg-paper px-5 pt-3 pb-4">
          <p className="font-extrabold">Hai già prenotato?</p>
          <Link
            to="/prenotazione"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Ritrova la prenotazione con il codice
          </Link>
        </div>
      </div>
    </div>
  );
}

function FreshnessNote({ firstFreeSlots }: { firstFreeSlots: HomeProps['firstFreeSlots'] }) {
  if (firstFreeSlots.data) {
    return (
      <p className="mt-3 text-sm text-ink-soft">
        Posti liberi aggiornati alle{' '}
        {formatTime(new Date(firstFreeSlots.dataUpdatedAt).toISOString())}
      </p>
    );
  }
  if (firstFreeSlots.error) {
    return (
      <p className="mt-3 text-sm text-ink-soft">
        In questo momento non vedo i primi posti liberi: li trovi scegliendo la specialità.
      </p>
    );
  }
  return null;
}

type SpecialtyRowProps = {
  specialty: Schemas['SpecialtySummary'];
  row: number;
  /** Colour of each line, the leftmost first. */
  colours: string[];
  firstFreeSlot: Schemas['FirstFreeSlot'] | undefined;
  searching: boolean;
};

/**
 * One specialty. Its line is the one that bends here; the lines of the rows below go on past it.
 * The top row takes the rightmost line, so that no two lines ever cross.
 */
function SpecialtyRow({ specialty, row, colours, firstFreeSlot, searching }: SpecialtyRowProps) {
  const id = useId();
  const own = colours.length - 1 - row;
  const colour = colours[own];
  const last = own === 0;

  return (
    <li
      className={`line-map-row ${last ? '' : 'pb-2 sm:pb-3'}`}
      style={{ '--delay': `${String(260 + row * 90)}ms`, '--line': colour } as CSSProperties}
    >
      {colours.slice(0, own).map((passing, line) => (
        <span
          key={line}
          aria-hidden="true"
          className="line paint"
          style={{ '--k': line, '--line': passing } as CSSProperties}
        />
      ))}
      <span
        aria-hidden="true"
        className="line-bend paint-bend"
        style={{ '--k': own } as CSSProperties}
      />
      <span aria-hidden="true" className="line-stop pop" />
      {/* Name and first free slot side by side only when the row is wide enough for both:
          the room depends on the column, not on the window. */}
      <div className="@container col-start-2 min-w-0 pt-[15px] pb-4 pl-8 sm:pt-[25px] sm:pb-5 sm:pl-11">
        <div className="flex flex-col gap-x-6 gap-y-2 @[28rem]:flex-row @[28rem]:flex-wrap @[28rem]:items-start @[28rem]:justify-between">
          <div className="min-w-0">
            {/* The link is the name alone, but it covers the whole row, line included. */}
            <Link
              to={`?specialita=${String(specialty.id)}`}
              aria-describedby={`${id}-doctors ${id}-when`}
              className="block text-[1.625rem]/[1.15] font-extrabold tracking-[-0.015em] decoration-(--line) decoration-[5px] underline-offset-[9px] after:absolute after:inset-0 after:rounded-xl after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink sm:text-4xl/[1.1]"
            >
              {specialty.name}
            </Link>
            <p id={`${id}-doctors`} className="mt-1 text-sm text-ink-soft sm:text-base">
              {specialty.doctors.join(', ')}
            </p>
          </div>
          <p id={`${id}-when`} className="shrink-0 leading-snug @[28rem]:pt-1 @[28rem]:text-right">
            {firstFreeSlot ? (
              <>
                <span className="block text-sm text-ink-soft">Primo posto libero</span>{' '}
                <span className="block font-bold @[28rem]:text-xl">
                  {formatWhen(firstFreeSlot.startsAt, todayAtTheClinic())}
                </span>
              </>
            ) : (
              !searching && (
                <span className="text-sm text-ink-soft">
                  Nessun posto libero nei prossimi 90 giorni
                </span>
              )
            )}
          </p>
        </div>
      </div>
    </li>
  );
}
