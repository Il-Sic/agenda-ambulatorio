import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { messageFor } from '../api/problem';
import { Notice } from '../components/Notice';
import {
  addDays,
  formatDayKeyLong,
  formatSpokenTime,
  minutesOfDay,
  todayAtTheClinic,
} from '../lib/dates';
import { dayOrUndefined } from '../lib/params';
import { CallerBooking } from './agenda/CallerBooking';
import { DayGrid, type Range, type Selection } from './agenda/DayGrid';
import { NextArrivals } from './agenda/NextArrivals';
import type { Visit } from './agenda/status';
import { VisitPanel, type Action } from './agenda/VisitPanel';

type DoctorDay = Schemas['DoctorDay'];
type Part = 'mattina' | 'pomeriggio' | 'giornata';

const PARTS: { value: Part; label: string }[] = [
  { value: 'mattina', label: 'Mattina' },
  { value: 'pomeriggio', label: 'Pomeriggio' },
  { value: 'giornata', label: 'Giornata' },
];

// The afternoon starts at one o'clock, as everyone at the clinic says.
const AFTERNOON = 13 * 60;

function send(action: Action, id: number) {
  const params = { params: { path: { id } } };
  switch (action) {
    case 'arrival':
      return unwrap(api.POST('/api/v1/staff/appointments/{id}/arrival', params));
    case 'no-show':
      return unwrap(api.POST('/api/v1/staff/appointments/{id}/no-show', params));
    case 'cancellation':
      return unwrap(api.POST('/api/v1/staff/appointments/{id}/cancellation', params));
  }
}

/** A day of the clinic, doctor by doctor, as a grid the front desk works on. */
export function AgendaPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const today = todayAtTheClinic();
  const day = dayOrUndefined(params.get('giorno')) ?? today;
  const part = PARTS.find(({ value }) => value === params.get('parte'))?.value ?? 'giornata';
  const now = useNow();
  const [selection, setSelection] = useState<Selection>();
  const [search, setSearch] = useState('');
  const [failure, setFailure] = useState<string>();
  const [booked, setBooked] = useState<string>();

  const plan = useQuery({
    queryKey: ['day-plan', day],
    queryFn: () => unwrap(api.GET('/api/v1/staff/day-plan', { params: { query: { date: day } } })),
    // Patients book all day long: the grid keeps itself fresh.
    refetchInterval: 30_000,
  });
  const change = useMutation({
    mutationFn: ({ action, visit }: { action: Action; visit: Visit }) => send(action, visit.id),
    onMutate: () => {
      setFailure(undefined);
      setBooked(undefined);
    },
    onError: (error) => {
      setFailure(messageFor(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['day-plan'] }),
  });

  function show(next: { giorno?: string; parte?: Part }) {
    const query = new URLSearchParams();
    const giorno = next.giorno ?? day;
    const parte = next.parte ?? (next.giorno ? undefined : params.get('parte'));
    if (giorno !== today) {
      query.set('giorno', giorno);
    }
    if (parte && parte !== 'giornata') {
      query.set('parte', parte);
    }
    if (next.giorno) {
      setSelection(undefined);
      setSearch('');
    }
    setParams(query);
  }

  const doctors = plan.data?.doctors ?? [];
  const working = doctors.filter(
    (doctor) =>
      doctor.hours.length > 0 || doctor.appointments.some((visit) => visit.status !== 'CANCELLED'),
  );
  const resting = doctors.filter((doctor) => !working.includes(doctor));
  const visits = doctors.flatMap((doctor) => doctor.appointments);
  const range = rangeOf(working, part);
  const matches = search.trim() ? matching(visits, search) : undefined;
  const chosenVisit =
    selection?.kind === 'visit' ? visits.find((visit) => visit.code === selection.code) : undefined;
  const chosenDoctor =
    selection?.kind === 'free' ? doctors.find(({ id }) => id === selection.doctorId) : undefined;
  const doctorOf = (doctorId: number) => doctors.find(({ id }) => id === doctorId);
  const specialtyOf = (doctorId: number) => doctorOf(doctorId)?.specialty;
  const expected = visits
    .filter((visit) => visit.status === 'BOOKED' && new Date(visit.endsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <title>Agenda - Segreteria Valdoria</title>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="sr-only">Agenda</h1>
          <h2 className="text-[1.9rem]/tight font-extrabold tracking-tight first-letter:uppercase">
            {formatDayKeyLong(day)}
          </h2>
          <p className="mt-1 text-ink-soft">{plan.data && summary(doctors)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <SearchField
            value={search}
            onChange={setSearch}
            onSubmit={() => {
              const [only, ...others] = matches ? [...matches] : [];
              if (only && others.length === 0) {
                setSelection({ kind: 'visit', code: only });
              }
            }}
          />
          <div
            role="group"
            aria-label="Parte della giornata"
            className="flex gap-0.5 rounded-xl bg-paper p-1"
          >
            {PARTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === part}
                onClick={() => {
                  show({ parte: value });
                }}
                className="min-h-10 rounded-lg px-3.5 aria-pressed:bg-ink aria-pressed:font-bold aria-pressed:text-white"
              >
                {label}
              </button>
            ))}
          </div>
          <DayNavigation
            day={day}
            today={today}
            onShow={(giorno) => {
              show({ giorno });
            }}
          />
        </div>
      </div>

      {failure && <Notice kind="error">{failure}</Notice>}
      {booked && (
        <Notice kind="success">
          Prenotazione fatta, codice {booked}. Il paziente riceve il codice per email.
        </Notice>
      )}
      {plan.error && <Notice kind="error">{messageFor(plan.error)}</Notice>}
      {plan.isPending && <p className="text-ink-soft">Carico l’agenda…</p>}
      {plan.data?.closure && (
        <p className="rounded-2xl bg-paper px-5 py-4 text-lg">
          Il poliambulatorio è chiuso: {plan.data.closure}.
        </p>
      )}

      {plan.data && !plan.data.closure && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            {range ? (
              <DayGrid
                key={day}
                doctors={working}
                range={range}
                now={day === today ? minutesOfDay(now) : undefined}
                selection={selection}
                matches={matches}
                onSelect={(next) => {
                  setBooked(undefined);
                  setSelection(next);
                }}
              />
            ) : (
              <p className="rounded-2xl bg-paper px-5 py-4">
                {working.length === 0
                  ? 'Nessun medico riceve in questo giorno.'
                  : `Nessun medico riceve di ${part === 'mattina' ? 'mattina' : 'pomeriggio'}.`}
              </p>
            )}
            {resting.length > 0 && working.length > 0 && (
              <p className="text-sm text-ink-soft">
                Non ricevono in questo giorno: {resting.map(({ name }) => name).join(', ')}.
              </p>
            )}
            <CancelledVisits visits={visits.filter((visit) => visit.status === 'CANCELLED')} />
          </div>

          <aside aria-label="Dettagli" className="space-y-4 xl:sticky xl:top-4">
            {chosenVisit && (
              <VisitPanel
                key={chosenVisit.code}
                visit={chosenVisit}
                specialty={specialtyOf(chosenVisit.doctorId)}
                today={today}
                now={now}
                busy={change.isPending}
                onAction={(action, visit) => {
                  change.mutate({ action, visit });
                }}
                onClose={() => {
                  setSelection(undefined);
                }}
              />
            )}
            {selection?.kind === 'free' && chosenDoctor && (
              <CallerBooking
                key={`${String(chosenDoctor.id)}-${selection.startsAt}`}
                doctorId={chosenDoctor.id}
                doctorName={chosenDoctor.name}
                specialty={chosenDoctor.specialty}
                startsAt={selection.startsAt}
                onBooked={(code) => {
                  setBooked(code);
                  setSelection({ kind: 'visit', code });
                  void queryClient.invalidateQueries({ queryKey: ['day-plan'] });
                }}
                onClose={() => {
                  setSelection(undefined);
                }}
              />
            )}
            {!chosenVisit && selection?.kind !== 'free' && day === today && (
              <NextArrivals
                visits={expected}
                doctorOf={doctorOf}
                busy={change.isPending}
                onArrived={(visit) => {
                  change.mutate({ action: 'arrival', visit });
                }}
              />
            )}
            {!chosenVisit && selection?.kind !== 'free' && (
              <p className="px-1 text-sm text-ink-soft">
                Scegli una visita per vederne i dati, o un posto libero per prenotare per chi
                telefona.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

/** Re-drawn every minute, so the line of the present moves on its own. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return now;
}

/** From the first to the last minute anybody receives, cut to the part of the day asked for. */
function rangeOf(doctors: DoctorDay[], part: Part): Range | undefined {
  const periods = doctors.flatMap((doctor) => [
    ...doctor.hours,
    ...doctor.appointments.filter((visit) => visit.status !== 'CANCELLED'),
  ]);
  if (periods.length === 0) {
    return undefined;
  }
  let start = Math.min(...periods.map(({ startsAt }) => minutesOfDay(startsAt)));
  let end = Math.max(...periods.map(({ endsAt }) => minutesOfDay(endsAt)));
  if (part === 'mattina') {
    end = Math.min(end, AFTERNOON);
  }
  if (part === 'pomeriggio') {
    start = Math.max(start, AFTERNOON);
  }
  start = Math.floor(start / 30) * 30;
  end = Math.ceil(end / 30) * 30;
  return end > start ? { start, end } : undefined;
}

/** A name, or a booking code typed or read by a scanner. */
function matching(visits: Visit[], search: string): Set<string> {
  const wanted = search.trim().toLowerCase();
  const code = wanted.replaceAll(' ', '').toUpperCase();
  return new Set(
    visits
      .filter(
        (visit) =>
          visit.status !== 'CANCELLED' &&
          (visit.patientName.toLowerCase().includes(wanted) || visit.code === code),
      )
      .map((visit) => visit.code),
  );
}

function summary(doctors: DoctorDay[]): string {
  const visits = doctors
    .flatMap((doctor) => doctor.appointments)
    .filter((visit) => visit.status !== 'CANCELLED');
  if (visits.length === 0) {
    return 'Nessuna visita in questo giorno.';
  }
  const count = (status: Visit['status']) =>
    visits.filter((visit) => visit.status === status).length;
  const free = doctors.reduce((total, doctor) => total + doctor.freeSlots.length, 0);
  const arrived = count('ARRIVED');
  const missed = count('NO_SHOW');
  const parts = [`${String(arrived)} ${arrived === 1 ? 'arrivato' : 'arrivati'}`];
  parts.push(`${String(count('BOOKED'))} in attesa`);
  if (missed > 0) {
    parts.push(`${String(missed)} ${missed === 1 ? 'non presentato' : 'non presentati'}`);
  }
  const total = visits.length === 1 ? '1 visita' : `${String(visits.length)} visite`;
  const left =
    free === 0
      ? ''
      : free === 1
        ? ' Resta 1 posto libero.'
        : ` Restano ${String(free)} posti liberi.`;
  return `${total}: ${parts.join(', ')}.${left}`;
}

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

function SearchField({ value, onChange, onSubmit }: SearchFieldProps) {
  const id = useId();
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={id} className="block text-sm font-bold">
        Cerca paziente o codice
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="mt-1 block min-h-11 w-64 rounded-xl border-[1.5px] border-ink-soft bg-paper px-3"
      />
    </form>
  );
}

type DayNavigationProps = { day: string; today: string; onShow: (day: string) => void };

function DayNavigation({ day, today, onShow }: DayNavigationProps) {
  const id = useId();
  const round =
    'flex size-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-paper';
  return (
    <div className="flex items-end gap-1.5">
      <button
        type="button"
        aria-label="Giorno precedente"
        className={round}
        onClick={() => {
          onShow(addDays(day, -1));
        }}
      >
        <Chevron back />
      </button>
      <button
        type="button"
        disabled={day === today}
        className="min-h-11 rounded-full border-[1.5px] border-ink bg-paper px-4 font-bold disabled:border-ink-soft disabled:text-ink-soft"
        onClick={() => {
          onShow(today);
        }}
      >
        Oggi
      </button>
      <button
        type="button"
        aria-label="Giorno successivo"
        className={round}
        onClick={() => {
          onShow(addDays(day, 1));
        }}
      >
        <Chevron />
      </button>
      <div className="ml-2">
        <label htmlFor={id} className="block text-sm font-bold">
          Giorno
        </label>
        <input
          id={id}
          type="date"
          value={day}
          onChange={(event) => {
            if (event.target.value) {
              onShow(event.target.value);
            }
          }}
          className="mt-1 block min-h-11 rounded-xl border-[1.5px] border-ink-soft bg-paper px-3"
        />
      </div>
    </div>
  );
}

function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={back ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

function CancelledVisits({ visits }: { visits: Visit[] }) {
  if (visits.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="annullate" className="rounded-2xl bg-paper px-5 pt-4 pb-2">
      <h2 id="annullate" className="text-lg font-extrabold">
        Annullate
      </h2>
      <ul>
        {visits.map((visit) => (
          <li
            key={visit.code}
            className="flex flex-wrap items-baseline gap-x-3 border-t border-rule py-2 text-sm"
          >
            <span className="font-bold tabular-nums">{formatSpokenTime(visit.startsAt)}</span>
            <span className="font-bold">{visit.patientName}</span>
            <span className="text-ink-soft">{visit.doctorName}</span>
            <span className="ml-auto text-ink-soft">Annullata</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
