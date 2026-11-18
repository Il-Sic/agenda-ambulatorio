import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { PAGE } from '../app/page';
import { lineColor } from '../lib/specialty';

type Stop = { title: string; href: string };

type BookingBandProps = {
  specialty?: string;
  doctor?: string;
  /** 2, 3 or 4: the specialty is always chosen by the time the band appears. */
  step: number;
  /** Where each finished step takes the patient back to, from the first. */
  hrefs: string[];
};

const TITLES = ['Specialità', 'Medico', 'Giorno e ora', 'I tuoi dati'];

/**
 * The band in the colour of the chosen specialty, as wide as the window: the patient is on that
 * line now. Its stops are the steps of the booking; the ones behind can be taken again.
 */
export function BookingBand({ specialty, doctor, step, hrefs }: BookingBandProps) {
  const current = step - 1;
  const stops: Stop[] = TITLES.map((title, index) => ({ title, href: hrefs[index] ?? '/' }));
  const line = lineColor(specialty);

  return (
    <section
      aria-label="Il tuo percorso"
      className="full-bleed on-ink bg-(--line) text-white"
      style={{ '--line': line } as CSSProperties}
    >
      <div
        className={`${PAGE} flex flex-wrap items-center justify-between gap-x-12 gap-y-5 py-5 sm:py-6`}
      >
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="size-6 shrink-0 rounded-full border-[6px] border-white sm:size-[30px] sm:border-8"
          />
          <p className="leading-tight">
            <span className="block text-[1.6rem] font-extrabold tracking-tight sm:text-4xl">
              {specialty}
            </span>
            {doctor && <span className="mt-0.5 block sm:text-lg">{doctor}</span>}
          </p>
        </div>

        <div
          className="relative w-full sm:max-w-[33rem]"
          style={{ '--done': current, '--todo': 3 - current } as CSSProperties}
        >
          <span
            aria-hidden="true"
            className="absolute top-[14px] left-[12.5%] h-1.5 w-[calc(var(--done)*25%)] bg-white"
          />
          <span
            aria-hidden="true"
            className="absolute top-[14px] left-[calc(12.5%+var(--done)*25%)] h-1.5 w-[calc(var(--todo)*25%)] bg-[repeating-linear-gradient(90deg,#fff_0_10px,transparent_10px_18px)]"
          />
          <ol aria-label="Passi della prenotazione" className="relative grid grid-cols-4">
            {stops.map((stop, index) => (
              <li key={stop.title} aria-current={index === current ? 'step' : undefined}>
                {index < current ? (
                  <Link
                    to={stop.href}
                    viewTransition
                    className="flex flex-col items-center gap-1.5 text-center text-xs sm:text-sm underline underline-offset-4"
                  >
                    <Marker state="done" />
                    <span>
                      <span className="sr-only">Cambia</span> {stop.title}
                    </span>
                  </Link>
                ) : (
                  <span
                    className={`flex flex-col items-center gap-1.5 text-center text-xs sm:text-sm ${index === current ? 'font-extrabold' : ''}`}
                  >
                    <Marker state={index === current ? 'current' : 'todo'} />
                    {stop.title}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Marker({ state }: { state: 'done' | 'current' | 'todo' }) {
  return (
    <span aria-hidden="true" className="flex h-[34px] items-center justify-center">
      {state === 'done' && (
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-(--line)">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      )}
      {state === 'current' && (
        <span className="flex size-[34px] items-center justify-center rounded-full bg-white">
          <span className="size-3.5 rounded-full bg-(--line)" />
        </span>
      )}
      {state === 'todo' && (
        <span className="size-6 rounded-full border-[5px] border-white bg-(--line)" />
      )}
    </span>
  );
}
