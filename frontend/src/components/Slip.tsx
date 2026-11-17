import type { CSSProperties } from 'react';
import type { Schemas } from '../api/client';
import { formatDateTime } from '../lib/dates';
import { lineColor } from '../lib/specialty';

const STATUS_LABELS: Record<Schemas['BookingDetails']['status'], string> = {
  BOOKED: 'Confermata',
  ARRIVED: 'Visita svolta',
  NO_SHOW: 'Paziente non presentato',
  CANCELLED: 'Annullata',
};

/** The appointment reminder a patient would be handed at the desk. */
export function Slip({ booking }: { booking: Schemas['BookingDetails'] }) {
  const cancelled = booking.status === 'CANCELLED';
  return (
    <section
      aria-label="Promemoria della visita"
      className="slip"
      style={{ '--line': lineColor(booking.specialty) } as CSSProperties}
    >
      <p className="text-sm text-ink-soft">Poliambulatorio Valdoria</p>
      <p className="mt-3 text-xl font-bold">{booking.specialty}</p>
      <p>{booking.doctorName}</p>
      <p className={`mt-3 text-lg font-bold ${cancelled ? 'line-through' : ''}`}>
        {formatDateTime(booking.startsAt)}
      </p>
      <p className="mt-1">Paziente: {booking.patientName}</p>
      <dl className="mt-5 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 border-t-2 border-dashed border-rule pt-4">
        <dt className="text-sm text-ink-soft">Codice</dt>
        <dd className="font-mono text-2xl font-bold tracking-[0.18em]">{booking.code}</dd>
        <dt className="text-sm text-ink-soft">Stato</dt>
        <dd className="font-bold">{STATUS_LABELS[booking.status]}</dd>
      </dl>
    </section>
  );
}
