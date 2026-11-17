import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { SelectField } from '../components/SelectField';
import { addDays, dayKey, formatDayKeyLong, formatTime, todayAtTheClinic } from '../lib/dates';
import { numberOrUndefined } from '../lib/params';
import { lineColor } from '../lib/specialty';

type Visit = Schemas['AgendaEntry'];
type Action = 'arrival' | 'no-show' | 'cancellation';

const STATUS: Record<Visit['status'], { label: string; style: string }> = {
  BOOKED: { label: 'In attesa', style: 'border-ink-soft bg-paper' },
  ARRIVED: { label: 'Arrivato', style: 'border-ok bg-ok-soft' },
  NO_SHOW: { label: 'Non presentato', style: 'border-line-ochre bg-warn-soft' },
  CANCELLED: { label: 'Annullata', style: 'border-rule bg-ground text-ink-soft line-through' },
};

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

/** The visits of one day, doctor by doctor, and what happened to each of them. */
export function AgendaPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const today = todayAtTheClinic();
  const day = params.get('giorno') ?? today;
  const doctorId = numberOrUndefined(params.get('medico'));
  const [failure, setFailure] = useState<string>();

  const doctors = useQuery({
    queryKey: ['staff-doctors'],
    queryFn: () => unwrap(api.GET('/api/v1/staff/doctors')),
  });
  const agenda = useQuery({
    queryKey: ['agenda', day, doctorId],
    queryFn: () =>
      unwrap(api.GET('/api/v1/staff/agenda', { params: { query: { date: day, doctorId } } })),
    // Patients book all day long: the list keeps itself fresh.
    refetchInterval: 30_000,
  });
  const change = useMutation({
    mutationFn: ({ action, id }: { action: Action; id: number }) => send(action, id),
    onMutate: () => {
      setFailure(undefined);
    },
    onError: (error) => {
      setFailure(messageFor(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['agenda'] }),
  });

  function show(next: { giorno?: string; medico?: number }) {
    const merged = { giorno: day, medico: doctorId, ...next };
    const search = new URLSearchParams();
    if (merged.giorno !== today) {
      search.set('giorno', merged.giorno);
    }
    if (merged.medico !== undefined) {
      search.set('medico', String(merged.medico));
    }
    setParams(search);
  }

  const specialtyOf = new Map(doctors.data?.map((doctor) => [doctor.id, doctor.specialty]));

  return (
    <div className="space-y-6">
      <title>Agenda - Segreteria Valdoria</title>
      <h1 className="text-3xl font-bold">Agenda</h1>

      <div className="flex flex-wrap items-end gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            show({ giorno: addDays(day, -1) });
          }}
        >
          Giorno precedente
        </Button>
        <Button
          variant="secondary"
          disabled={day === today}
          onClick={() => {
            show({ giorno: today });
          }}
        >
          Oggi
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            show({ giorno: addDays(day, 1) });
          }}
        >
          Giorno successivo
        </Button>
        <DayField
          day={day}
          onChange={(giorno) => {
            show({ giorno });
          }}
        />
        <SelectField
          label="Medico"
          value={doctorId ?? ''}
          onChange={(event) => {
            show({ medico: numberOrUndefined(event.target.value) });
          }}
        >
          <option value="">Tutti i medici</option>
          {doctors.data?.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
            </option>
          ))}
        </SelectField>
      </div>

      <h2 className="text-xl font-bold">{formatDayKeyLong(day)}</h2>
      {failure && <Notice kind="error">{failure}</Notice>}
      {agenda.error && <Notice kind="error">{messageFor(agenda.error)}</Notice>}
      {agenda.isPending && <p className="text-ink-soft">Carico l’agenda…</p>}
      {agenda.data?.length === 0 && <p>Nessuna visita in questo giorno.</p>}

      {groupByDoctor(agenda.data ?? []).map((group) => (
        <DoctorAgenda
          key={group.doctorId}
          doctorName={group.doctorName}
          line={lineColor(specialtyOf.get(group.doctorId))}
          visits={group.visits}
          today={today}
          busy={change.isPending}
          onAction={(action, id) => {
            change.mutate({ action, id });
          }}
        />
      ))}
    </div>
  );
}

function DayField({ day, onChange }: { day: string; onChange: (day: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block font-bold">
        Giorno
      </label>
      <input
        id={id}
        type="date"
        value={day}
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
        className="mt-1 block min-h-12 rounded border-2 border-ink-soft bg-paper px-3 text-base"
      />
    </div>
  );
}

type DoctorAgendaProps = {
  doctorName: string;
  line: string;
  visits: Visit[];
  today: string;
  busy: boolean;
  onAction: (action: Action, id: number) => void;
};

function DoctorAgenda({ doctorName, line, visits, today, busy, onAction }: DoctorAgendaProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="border-l-[0.625rem] bg-paper"
      style={{ borderColor: line }}
    >
      <h3 id={headingId} className="border-b border-rule px-4 py-3 text-lg font-bold">
        {doctorName}
      </h3>
      <ul className="divide-y divide-rule">
        {visits.map((visit) => (
          <VisitRow key={visit.id} visit={visit} today={today} busy={busy} onAction={onAction} />
        ))}
      </ul>
    </section>
  );
}

type VisitRowProps = Pick<DoctorAgendaProps, 'today' | 'busy' | 'onAction'> & { visit: Visit };

function VisitRow({ visit, today, busy, onAction }: VisitRowProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const status = STATUS[visit.status];
  // The same rules the server applies, so the staff are only offered what will work.
  const dayHasCome = dayKey(visit.startsAt) <= today;
  const notStarted = new Date(visit.startsAt) > new Date();
  const canArrive = dayHasCome && (visit.status === 'BOOKED' || visit.status === 'NO_SHOW');
  const canMiss = dayHasCome && (visit.status === 'BOOKED' || visit.status === 'ARRIVED');
  const canCancel = visit.status === 'BOOKED' && notStarted;

  return (
    <li className="grid gap-x-6 gap-y-2 px-4 py-3 lg:grid-cols-[4.5rem_minmax(0,1fr)_9.5rem_27rem] lg:items-center">
      <p className="text-lg font-bold tabular-nums">{formatTime(visit.startsAt)}</p>
      <div className="min-w-0">
        <p className="font-bold">{visit.patientName}</p>
        <p className="text-sm break-words text-ink-soft">
          <span>{visit.patientPhone}</span>, <span>{visit.patientEmail}</span>
        </p>
      </div>
      <p>
        <span
          className={`inline-block rounded border-2 px-2 py-0.5 text-sm font-bold ${status.style}`}
        >
          {status.label}
        </span>
      </p>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {canArrive && (
          <Button
            variant="secondary"
            size="small"
            disabled={busy}
            aria-label={`Segna arrivato: ${visit.patientName}`}
            onClick={() => {
              onAction('arrival', visit.id);
            }}
          >
            Segna arrivato
          </Button>
        )}
        {canMiss && (
          <Button
            variant="secondary"
            size="small"
            disabled={busy}
            aria-label={`Segna non presentato: ${visit.patientName}`}
            onClick={() => {
              onAction('no-show', visit.id);
            }}
          >
            Segna non presentato
          </Button>
        )}
        {canCancel && !confirmingCancel && (
          <Button
            variant="secondary"
            size="small"
            aria-label={`Annulla visita: ${visit.patientName}`}
            onClick={() => {
              setConfirmingCancel(true);
            }}
          >
            Annulla visita
          </Button>
        )}
      </div>
      {canCancel && confirmingCancel && (
        <div className="space-y-3 border-l-8 border-danger bg-danger-soft p-3 lg:col-span-4">
          <p className="font-bold">
            Annullare la visita di {visit.patientName} delle {formatTime(visit.startsAt)}? Il
            paziente riceverà un’email.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                setConfirmingCancel(false);
                onAction('cancellation', visit.id);
              }}
            >
              Sì, annulla la visita
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmingCancel(false);
              }}
            >
              No, la tengo
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

type DoctorGroup = { doctorId: number; doctorName: string; visits: Visit[] };

function groupByDoctor(visits: Visit[]): DoctorGroup[] {
  const groups = new Map<number, DoctorGroup>();
  for (const visit of visits) {
    const group = groups.get(visit.doctorId) ?? {
      doctorId: visit.doctorId,
      doctorName: visit.doctorName,
      visits: [],
    };
    group.visits.push(visit);
    groups.set(visit.doctorId, group);
  }
  return [...groups.values()].sort((a, b) => a.doctorName.localeCompare(b.doctorName, 'it'));
}
