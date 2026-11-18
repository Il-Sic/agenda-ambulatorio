import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, unwrap, type Schemas } from '../api/client';
import { isProblem, messageFor } from '../api/problem';
import { Button } from '../components/Button';
import { Loadable } from '../components/Loadable';
import { Notice } from '../components/Notice';
import { Ticket, TicketDispenser } from '../components/Ticket';
import { TicketActions } from '../components/TicketActions';
import { addDays, todayAtTheClinic } from '../lib/dates';
import { dayOrUndefined, instantOrUndefined, numberOrUndefined } from '../lib/params';
import { randomKey } from '../lib/randomKey';
import { lineColor } from '../lib/specialty';
import { BookingBand } from './BookingBand';
import { DetailsStep } from './DetailsStep';
import { DoctorStep } from './DoctorStep';
import { Home } from './Home';
import { PhoneTicket } from './PhoneTicket';
import { SlotStep } from './SlotStep';
import { stepHeadingId } from './stepHeading';
import type { PatientDetails } from './validation';

const DAYS_PER_PAGE = 14;
// The server offers slots up to this many days ahead, and no further.
const BOOKING_HORIZON_DAYS = 90;

const QUESTIONS: Record<number, string> = {
  2: 'Con quale medico?',
  3: 'Quando vuoi venire?',
  4: 'I tuoi dati',
};

const HEADING = 'text-[2.1rem]/tight font-extrabold tracking-[-0.02em] sm:text-5xl/tight';

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

  const step = specialtyId === undefined ? 1 : doctorId === undefined ? 2 : startsAt ? 4 : 3;

  const specialties = useQuery({
    queryKey: ['specialties'],
    queryFn: () => unwrap(api.GET('/api/v1/specialties')),
  });
  // Asked again every minute while the page is open: the home page says how fresh it is.
  const firstFreeSlots = useQuery({
    queryKey: ['first-free-slots'],
    enabled: step === 1,
    refetchInterval: 60_000,
    queryFn: () => unwrap(api.GET('/api/v1/first-free-slots')),
  });
  const doctors = useQuery({
    queryKey: ['doctors', specialtyId],
    enabled: specialtyId !== undefined,
    queryFn: () =>
      unwrap(api.GET('/api/v1/doctors', { params: { query: { specialtyId: specialtyId ?? 0 } } })),
  });
  const doctorsFirstFreeSlots = useQuery({
    queryKey: ['first-free-slots', 'doctors', specialtyId],
    enabled: step === 2,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/doctors/first-free-slots', {
          params: { query: { specialtyId: specialtyId ?? 0 } },
        }),
      ),
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
    setParams(search(choices), { viewTransition: true });
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

  const firstSlot = slots.data?.[0];
  const intros: Record<number, ReactNode> = {
    2: 'Accanto a ogni nome trovi il suo primo posto libero.',
    3: firstSlot
      ? `Le visite durano ${String(minutesBetween(firstSlot.startsAt, firstSlot.endsAt))} minuti. Gli orari sono quelli di Roma.`
      : 'Gli orari sono quelli di Roma.',
    4: 'Servono solo per questa visita: niente account e niente password.',
  };

  return (
    <div style={{ '--line': lineColor(specialty?.name) } as CSSProperties}>
      <title>Prenota una visita - Poliambulatorio Valdoria</title>
      <BookingBand
        specialty={specialty?.name}
        doctor={doctor?.name}
        step={step}
        hrefs={[
          '/',
          `/${search({ specialita: specialtyId })}`,
          `/${search({ specialita: specialtyId, medico: doctorId })}`,
        ]}
      />

      <div className="mt-8 grid items-start gap-x-20 gap-y-10 pb-32 sm:mt-11 lg:grid-cols-[minmax(0,1fr)_23rem] lg:pb-0">
        <div className="min-w-0">
          <h1 id={stepHeadingId(step)} tabIndex={-1} className={HEADING}>
            {QUESTIONS[step]}
          </h1>
          <p className="mt-2 text-ink-soft">{intros[step]}</p>

          <div className="mt-7">
            {step === 2 && (
              <Loadable query={doctors} loading="Carico i medici…">
                {(list) => (
                  <DoctorStep
                    doctors={list}
                    firstFreeSlots={doctorsFirstFreeSlots.data}
                    searching={doctorsFirstFreeSlots.isPending}
                    hrefFor={(id) => `/${search({ specialita: specialtyId, medico: id })}`}
                  />
                )}
              </Loadable>
            )}

            {step === 3 && (
              <>
                {slotTakenMessage && (
                  <div className="mb-6">
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
              </>
            )}

            {step === 4 && (
              <div className="max-w-xl">
                <DetailsStep initial={details} onSubmit={book} />
              </div>
            )}
          </div>
        </div>

        <aside aria-label="Il tuo tagliando" className="hidden lg:sticky lg:top-6 lg:block">
          <TicketDispenser>
            <Ticket live specialty={specialty?.name} doctor={doctor?.name} startsAt={startsAt} />
          </TicketDispenser>
          <p className="-mt-6 text-center text-sm text-ink-soft">
            Il tagliando si stampa mentre scegli.
          </p>
        </aside>
      </div>

      <PhoneTicket specialty={specialty?.name} doctor={doctor?.name} startsAt={startsAt} />
    </div>
  );
}

function search(choices: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(choices)) {
    if (value !== undefined) {
      query.set(name, String(value));
    }
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

function minutesBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

type ConfirmationProps = {
  booking: Schemas['BookingDetails'];
  email: string | undefined;
  onBookAnother: () => void;
};

/** The moment the ticket comes out of the machine, whole, with its code. */
function Confirmation({ booking, email, onBookAnother }: ConfirmationProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // The form was further down: the ticket coming out of the slot is at the top of the page.
    document.documentElement.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-20 gap-y-8 pt-4 [grid-template-areas:'head'_'ticket'_'next'] lg:grid-cols-[minmax(0,1fr)_23rem] lg:[grid-template-areas:'head_ticket'_'next_ticket']">
      <title>Prenotazione confermata - Poliambulatorio Valdoria</title>
      <div className="[grid-area:head]">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-ok text-white"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 ref={heading} tabIndex={-1} className={`mt-5 ${HEADING}`}>
          Prenotazione confermata
        </h1>
        <p className="mt-4 max-w-[34em] text-lg [overflow-wrap:anywhere]">
          Ti abbiamo mandato il codice anche per email{email ? `, a ${email}` : ''}. Con il codice e
          l’email puoi rivedere, spostare o annullare la visita quando vuoi.
        </p>
        <p className="mt-3 max-w-[34em] text-sm text-ink-soft">
          In questo sito dimostrativo l’email non parte davvero: la segreteria la vede tra le
          notifiche inviate.
        </p>
      </div>
      <div className="flex justify-center [grid-area:ticket] lg:justify-end">
        <TicketDispenser issuing>
          <Ticket
            specialty={booking.specialty}
            doctor={booking.doctorName}
            startsAt={booking.startsAt}
            patient={booking.patientName}
            code={booking.code}
          />
        </TicketDispenser>
      </div>
      <div className="space-y-4 [grid-area:next]">
        <TicketActions booking={booking} />
        <div className="flex flex-wrap gap-3">
          <Link
            to="/prenotazione"
            state={email ? { code: booking.code, email } : undefined}
            className="inline-flex min-h-11 items-center px-2 font-bold underline underline-offset-4 hover:bg-ground"
          >
            Gestisci la prenotazione
          </Link>
          <Button variant="quiet" onClick={onBookAnother}>
            Prenota un’altra visita
          </Button>
        </div>
      </div>
    </div>
  );
}
