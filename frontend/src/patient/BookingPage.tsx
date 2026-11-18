import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { isProblem, messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Loadable } from '../components/Loadable';
import { Notice } from '../components/Notice';
import { Slip } from '../components/Slip';
import { addDays, formatDateTime, todayAtTheClinic } from '../lib/dates';
import { dayOrUndefined, instantOrUndefined, numberOrUndefined } from '../lib/params';
import { randomKey } from '../lib/randomKey';
import { lineColor } from '../lib/specialty';
import { ChoiceList } from './ChoiceList';
import { DetailsStep } from './DetailsStep';
import { Home } from './Home';
import { Path, Step } from './Path';
import { SlotStep } from './SlotStep';
import { stepHeadingId } from './stepHeading';
import type { PatientDetails } from './validation';

const DAYS_PER_PAGE = 14;
// The server offers slots up to this many days ahead, and no further.
const BOOKING_HORIZON_DAYS = 90;

/**
 * The choices made so far live in the URL (?specialita=1&medico=7&orario=…): the browser's
 * back button undoes the last step, and a reload keeps the patient where they were.
 */
export function BookingPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const specialtyId = numberOrUndefined(params.get('specialita'));
  const doctorId = numberOrUndefined(params.get('medico'));
  const startsAt = instantOrUndefined(params.get('orario'));
  const today = todayAtTheClinic();
  const from = dayOrUndefined(params.get('dal')) ?? today;
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

  const step = specialtyId === undefined ? 1 : doctorId === undefined ? 2 : startsAt ? 4 : 3;
  // Asked again every minute while the page is open: the home page says how fresh it is.
  const firstFreeSlots = useQuery({
    queryKey: ['first-free-slots'],
    enabled: step === 1,
    refetchInterval: 60_000,
    queryFn: () => unwrap(api.GET('/api/v1/first-free-slots')),
  });

  const specialty = specialties.data?.find((candidate) => candidate.id === specialtyId);
  const doctor = doctors.data?.find((candidate) => candidate.id === doctorId);

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

  // One key per attempt at a slot. If the answer gets lost and the patient tries again, the
  // server recognises the repetition and returns the booking it already made.
  const attempt = useRef<{ slot: string; key: string }>(undefined);

  async function book(patient: PatientDetails) {
    if (doctorId === undefined || !startsAt) {
      return;
    }
    const slot = `${String(doctorId)}|${startsAt}`;
    if (attempt.current?.slot !== slot) {
      attempt.current = { slot, key: randomKey() };
    }
    setDetails(patient);
    try {
      const booking = await unwrap(
        api.POST('/api/v1/bookings', {
          params: { header: { 'Idempotency-Key': attempt.current.key } },
          body: { doctorId, startsAt, ...patient },
        }),
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
      void queryClient.invalidateQueries({ queryKey: ['first-free-slots'] });
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

  if (step === 1) {
    return <Home specialties={specialties} firstFreeSlots={firstFreeSlots} />;
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
          state="done"
          summary={specialty?.name}
          editLabel="Cambia specialità"
          onEdit={() => {
            goTo({});
          }}
        />

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
                onLater={
                  addDays(from, DAYS_PER_PAGE) <= addDays(today, BOOKING_HORIZON_DAYS)
                    ? () => {
                        goTo({
                          specialita: specialtyId,
                          medico: doctorId,
                          dal: addDays(from, DAYS_PER_PAGE),
                        });
                      }
                    : undefined
                }
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
