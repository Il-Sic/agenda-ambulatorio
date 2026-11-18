import { useId } from 'react';
import { Link } from 'react-router';
import type { Schemas } from '../api/client';
import { formatWhen } from '../lib/dates';

type DoctorStepProps = {
  doctors: Schemas['DoctorSummary'][];
  firstFreeSlots: Schemas['FirstFreeSlot'][] | undefined;
  /** True while the first free slots are still on their way. */
  searching: boolean;
  hrefFor: (doctorId: number) => string;
};

/** The doctors of the chosen specialty, each with the first visit it can still offer. */
export function DoctorStep({ doctors, firstFreeSlots, searching, hrefFor }: DoctorStepProps) {
  return (
    <ul aria-label="Medici" className="divide-y divide-rule border-y border-rule">
      {doctors.map((doctor) => (
        <DoctorRow
          key={doctor.id}
          doctor={doctor}
          href={hrefFor(doctor.id)}
          firstFreeSlot={firstFreeSlots?.find((slot) => slot.doctorId === doctor.id)}
          searching={searching}
        />
      ))}
    </ul>
  );
}

type DoctorRowProps = {
  doctor: Schemas['DoctorSummary'];
  href: string;
  firstFreeSlot: Schemas['FirstFreeSlot'] | undefined;
  searching: boolean;
};

function DoctorRow({ doctor, href, firstFreeSlot, searching }: DoctorRowProps) {
  const whenId = useId();
  return (
    <li className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-5 pl-11">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[calc(50%-11px)] left-0 size-[22px] rounded-full border-[6px] border-(--line) bg-paper"
      />
      {/* The link is the name alone, but it covers the whole row. */}
      <Link
        to={href}
        viewTransition
        aria-describedby={whenId}
        className="text-[1.6rem]/tight font-extrabold tracking-tight decoration-(--line) decoration-4 underline-offset-8 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
      >
        {doctor.name}
      </Link>
      <p id={whenId} className="leading-snug sm:text-right">
        {firstFreeSlot ? (
          <>
            <span className="block text-sm text-ink-soft">Primo posto libero</span>{' '}
            <span className="block font-bold sm:text-lg">{formatWhen(firstFreeSlot.startsAt)}</span>
          </>
        ) : (
          !searching && (
            <span className="text-sm text-ink-soft">
              Nessun posto libero nei prossimi 90 giorni
            </span>
          )
        )}
      </p>
    </li>
  );
}
