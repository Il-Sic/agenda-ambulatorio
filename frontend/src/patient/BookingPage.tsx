import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { isProblem, messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { Slip } from '../components/Slip';
import { addDays, formatDateTime, todayAtTheClinic } from '../lib/dates';
import { numberOrUndefined } from '../lib/params';
import { lineColor } from '../lib/specialty';
import { ChoiceList } from './ChoiceList';
import { DetailsStep } from './DetailsStep';
import { Path, Step } from './Path';
import { SlotStep } from './SlotStep';
import { stepHeadingId } from './stepHeading';
import type { PatientDetails } from './validation';

const DAYS_PER_PAGE = 14;

/**
 * The choices made so far live in the URL (?specialita=1&medico=7&orario=…): the browser's
 * back button undoes the last step, and a reload keeps the patient where they were.
 */
export function BookingPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const specialtyId = numberOrUndefined(params.get('specialita'));
  const doctorId = numberOrUndefined(params.get('medico'));
  const startsAt = params.get('orario') ?? undefined;
  const today = todayAtTheClinic();
  const from = params.get('dal') ?? today;
  const to = addDays(from, DAYS_PER_PAGE - 1);

  const [details, setDetails] = useState<PatientDetails>();
  const [slotTakenMessage, setSlotTakenMessage] = useState<string>();
  const [confirmed, setConfirmed] = useState<Schemas['BookingDetails']>();

  const specialties = useQuery({
    queryKey: ['specialties'],
    queryFn: () => unwrap(api.GET('/api/v1/specialties')),
  });
  const doctors = useQuery({
    queryKey: ['doctors', specialtyId],
    enabled: specialtyId !== undefined,
    queryFn: () =>
      unwrap(api.GET('/api/v1/doctors', { params: { query: { specialtyId: specialtyId ?? 0 } } })),
  });
  const slots = useQuery({
    queryKey: ['slots', doctorId, from],
    enabled: doctorId !== undefined,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/doctors/{doctorId}/slots', {
          params: { path: { doctorId: doctorId ?? 0 }, query: { from, to } },
        }),
      ),
  });

  const specialty = specialties.data?.find((candidate) => candidate.id === specialtyId);
  const doctor = doctors.data?.find((candidate) => candidate.id === doctorId);
  const step = specialtyId === undefined ? 1 : doctorId === undefined ? 2 : startsAt ? 4 : 3;

  // When the step changes, focus follows it, so keyboard and screen reader users are not left
  // behind at a button that no longer exists.
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      document.getElementById(stepHeadingId(step))?.focus();
    }
  }, [step]);

  function goTo(choices: { specialita?: number; medico?: number; orario?: string; dal?: string }) {
    const next = new URLSearchParams();
    for (const [name, value] of Object.entries(choices)) {
      next.set(name, String(value));
    }
    setParams(next);
  }

  async function book(patient: PatientDetails) {
    if (doctorId === undefined || !startsAt) {
      return;
    }
    setDetails(patient);
    try {
      const booking = await unwrap(
        api.POST('/api/v1/bookings', { body: { doctorId, startsAt, ...patient } }),
      );
      setConfirmed(booking);
      setParams({}, { replace: true });
    } catch (error) {
      if (!isProblem(error, '/problems/slot-not-available')) {
        throw error;
      }
      // Someone was faster. Back to the slots, which are fetched again.
      setSlotTakenMessage(messageFor(error));
      goTo({ specialita: specialtyId, medico: doctorId });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['slots'] });
    }
  }

  if (confirmed) {
    return (
      <Confirmation
        booking={confirmed}
        email={details?.patientEmail}
        onBookAnother={() => {
          setConfirmed(undefined);
          setDetails(undefined);
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl">
      <title>Prenota una visita - Poliambulatorio Valdoria</title>
      <h1 className="text-3xl font-bold">Prenota una visita</h1>
      <p className="mt-2 mb-8 text-ink-soft">
        Scegli specialità, medico e orario. Non serve registrarsi.
      </p>

      <Path line={lineColor(specialty?.name)}>
        <Step
          number={1}
          title="Specialità"
          state={step === 1 ? 'current' : 'done'}
          summary={specialty?.name}
          editLabel="Cambia specialità"
          onEdit={() => {
            goTo({});
          }}
        >
          <Loadable query={specialties} loading="Carico le specialità…">
            {(list) => (
              <ChoiceList
                choices={list.map(({ id, name }) => ({ id, label: name, line: lineColor(name) }))}
                onChoose={(id) => {
                  goTo({ specialita: id });
                }}
              />
            )}
          </Loadable>
        </Step>

        <Step
          number={2}
          title="Medico"
          state={step === 2 ? 'current' : step > 2 ? 'done' : 'todo'}
          summary={doctor?.name}
          editLabel="Cambia medico"
          onEdit={() => {
            goTo({ specialita: specialtyId });
          }}
        >
          <Loadable query={doctors} loading="Carico i medici…">
            {(list) => (
              <ChoiceList
                choices={list.map(({ id, name, specialty: of }) => ({
                  id,
                  label: name,
                  line: lineColor(of),
                }))}
                onChoose={(id) => {
                  goTo({ specialita: specialtyId, medico: id });
                }}
              />
            )}
          </Loadable>
        </Step>

        <Step
          number={3}
          title="Giorno e ora"
          state={step === 3 ? 'current' : step > 3 ? 'done' : 'todo'}
          summary={startsAt && formatDateTime(startsAt)}
          editLabel="Cambia giorno e ora"
          onEdit={() => {
            goTo({ specialita: specialtyId, medico: doctorId });
          }}
        >
          {slotTakenMessage && (
            <div className="mb-4">
              <Notice kind="error">{slotTakenMessage}</Notice>
            </div>
          )}
          <Loadable query={slots} loading="Carico gli orari…">
            {(list) => (
              <SlotStep
                slots={list}
                from={from}
                to={to}
                onChoose={(chosen) => {
                  setSlotTakenMessage(undefined);
                  goTo({ specialita: specialtyId, medico: doctorId, orario: chosen });
                }}
                onEarlier={
                  from > today
                    ? () => {
                        goTo({
                          specialita: specialtyId,
                          medico: doctorId,
                          dal: addDays(from, -DAYS_PER_PAGE),
                        });
                      }
                    : undefined
                }
                onLater={() => {
                  goTo({
                    specialita: specialtyId,
                    medico: doctorId,
                    dal: addDays(from, DAYS_PER_PAGE),
                  });
                }}
              />
            )}
          </Loadable>
        </Step>

        <Step number={4} title="I tuoi dati" state={step === 4 ? 'current' : 'todo'}>
          <DetailsStep initial={details} onSubmit={book} />
        </Step>
      </Path>
    </div>
  );
}

type LoadableProps<T> = {
  query: { data: T | undefined; error: unknown; isPending: boolean; refetch: () => unknown };
  loading: string;
  children: (data: T) => React.ReactNode;
};

/** The three faces of a request: waiting, failed (with a way to retry), done. */
function Loadable<T>({ query, loading, children }: LoadableProps<T>) {
  if (query.data !== undefined) {
    return children(query.data);
  }
  if (query.error) {
    return (
      <div className="space-y-3">
        <Notice kind="error">{messageFor(query.error)}</Notice>
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Riprova
        </Button>
      </div>
    );
  }
  return query.isPending ? <p className="text-ink-soft">{loading}</p> : null;
}

type ConfirmationProps = {
  booking: Schemas['BookingDetails'];
  email: string | undefined;
  onBookAnother: () => void;
};

function Confirmation({ booking, email, onBookAnother }: ConfirmationProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="max-w-xl space-y-6">
      <title>Prenotazione confermata - Poliambulatorio Valdoria</title>
      <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">
        Prenotazione confermata
      </h1>
      <Slip booking={booking} />
      <p>
        Conserva il codice. Con il codice e la tua email{email ? ` (${email})` : ''} puoi rivedere o
        annullare la prenotazione quando vuoi.
      </p>
      <p className="text-sm text-ink-soft">
        In questo sito dimostrativo l’email di conferma non parte davvero: la segreteria la vede tra
        le notifiche inviate.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/prenotazione"
          className="inline-flex min-h-12 items-center rounded bg-ink px-5 font-bold text-white hover:bg-[#0c1b29]"
        >
          Gestisci la prenotazione
        </Link>
        <Button variant="secondary" onClick={onBookAnother}>
          Prenota un’altra visita
        </Button>
      </div>
    </div>
  );
}
