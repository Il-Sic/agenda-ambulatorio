import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, unwrap, type Schemas } from '../api/client';
import { Flaps } from '../components/Flaps';
import { LogoMark } from '../components/Logo';
import { LineChip, WayArrow } from '../components/Wayfinding';
import { formatSpokenTime } from '../lib/dates';
import { directions, lineColor } from '../lib/specialty';

type Call = Schemas['WaitingRoomCall'];

/** The screen hangs in a room full of people waiting for their number: it asks every few seconds. */
const REFRESH_EVERY = 3_000;

const SOFT = 'text-[#c9d5de]';
const RULE = 'border-t border-[#36506a]';

/**
 * The screen of the waiting room: the number called now and where to go, the calls before it and
 * the time. Numbers, never names. It needs no account and keeps itself up to date.
 */
export function WaitingRoomPage() {
  useScreenScale();
  const now = useClock();
  const calls = useQuery({
    queryKey: ['waiting-room'],
    queryFn: () => unwrap(api.GET('/api/v1/waiting-room/calls')),
    refetchInterval: REFRESH_EVERY,
    refetchIntervalInBackground: true,
  });
  const [current, ...earlier] = calls.data ?? [];

  return (
    <div className="on-ink flex min-h-dvh flex-col bg-ink text-white">
      <title>Sala d’attesa - Poliambulatorio Valdoria</title>
      <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-5 pt-[1.375rem] pb-2.5 sm:px-10">
        <div className="flex items-center gap-3.5">
          <span className="size-10 shrink-0 [&>svg]:size-full">
            <LogoMark />
          </span>
          <h1 className="leading-[1.15]">
            <span className={`block text-base ${SOFT}`}>Poliambulatorio Valdoria</span>{' '}
            <span className="block text-2xl font-extrabold">Sala d’attesa, piano terra</span>
          </h1>
        </div>
        <p className="font-mono text-[2.75rem] font-bold tracking-[-0.02em]">
          <span className="sr-only">Sono le </span>
          <time dateTime={now.toISOString()}>{formatSpokenTime(now.toISOString())}</time>
        </p>
      </header>

      <main className="grid flex-1 gap-7 px-5 pt-[1.125rem] pb-[1.625rem] sm:px-10 lg:grid-cols-[minmax(0,1fr)_26.25rem]">
        {/* Read out as soon as a number is called, or called again. */}
        <section
          aria-labelledby="chiamata"
          aria-live="polite"
          className="flex min-w-0 flex-col justify-center"
        >
          {current ? <CurrentCall call={current} /> : <NoCallYet />}
        </section>
        <section
          aria-labelledby="precedenti"
          className="self-stretch rounded-[1.25rem] bg-[#1c3550] px-6 py-[1.375rem]"
        >
          <h2 id="precedenti" className="mb-2 text-[1.375rem] font-extrabold">
            Chiamate precedenti
          </h2>
          {earlier.length === 0 ? (
            <p className={`${RULE} pt-3.5 text-lg ${SOFT}`}>
              Qui restano le ultime chiamate, per chi si è distratto.
            </p>
          ) : (
            <ol>
              {earlier.map((call) => (
                <EarlierCall key={`${String(call.number)}-${call.calledAt}`} call={call} />
              ))}
            </ol>
          )}
        </section>
      </main>

      <footer className="bg-[#0b1724] px-5 pt-4 pb-[1.125rem] text-[1.3125rem] sm:px-10">
        <p>
          Ti chiamiamo con il numero che ricevi in accettazione. Sullo schermo non compare mai il
          tuo nome.
        </p>
        {calls.isError && (
          <p role="alert" className="mt-1 font-bold text-[#ffd27a]">
            Collegamento interrotto: le chiamate potrebbero non essere aggiornate.
          </p>
        )}
      </footer>
    </div>
  );
}

function CurrentCall({ call }: { call: Call }) {
  return (
    <>
      <h2 id="chiamata" className={`text-[1.75rem] ${SOFT}`}>
        Ora tocca al numero
      </h2>{' '}
      {/* A new call, or the same number called again, turns the tiles anew. */}
      <Flaps
        key={`${String(call.number)}-${call.calledAt}`}
        value={call.number}
        flip
        className="mt-4 text-[9.75rem]"
      />{' '}
      <p className="mt-[1.625rem] flex flex-wrap items-center gap-x-[1.125rem] text-[3rem] leading-none font-extrabold tracking-[-0.025em] sm:text-[4.75rem]">
        <WayArrow className="size-[0.76em]" />
        {call.room || call.specialty}
      </p>{' '}
      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2.5 text-[1.625rem]">
        {call.room && (
          <>
            <LineChip specialty={call.specialty} className="px-3.5 py-1" />{' '}
          </>
        )}
        {directions(call.floor, call.specialty)}
      </p>
    </>
  );
}

function NoCallYet() {
  return (
    <>
      <h2 id="chiamata" className={`text-[1.75rem] ${SOFT}`}>
        Nessuna chiamata per ora
      </h2>{' '}
      <p className="mt-4 max-w-[16em] text-[2.5rem] leading-[1.1] font-extrabold tracking-[-0.02em] sm:text-[3.25rem]">
        Quando tocca a te, qui compaiono il tuo numero e dove andare.
      </p>
    </>
  );
}

function EarlierCall({ call }: { call: Call }) {
  return (
    <li className={`flex items-center gap-3.5 py-3.5 ${RULE}`}>
      <Flaps value={call.number} className="text-[2.125rem]" />{' '}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[1.375rem] font-extrabold">{call.room || call.specialty}</span>{' '}
        {call.room && (
          <span className={`flex items-center gap-2 text-[1.0625rem] ${SOFT}`}>
            <span
              aria-hidden="true"
              className="h-1.5 w-[1.375rem] shrink-0 rounded-full"
              style={{ background: lineColor(call.specialty) }}
            />
            {call.specialty}
          </span>
        )}
      </span>{' '}
      <span className={`font-mono text-xl ${SOFT}`}>
        <span className="sr-only">chiamato alle </span>
        {formatSpokenTime(call.calledAt)}
      </span>
    </li>
  );
}

/** While the screen is shown, the whole page scales with the window (see `board-scale`). */
function useScreenScale() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('board-scale');
    return () => {
      root.classList.remove('board-scale');
    };
  }, []);
}

/** The time on the screen moves on by itself, at most a few seconds late. */
function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5_000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return now;
}
