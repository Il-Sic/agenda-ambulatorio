import type { ReactNode } from 'react';
import type { Schemas } from '../api/client';
import { formatDay, formatSpokenTime } from '../lib/dates';
import { lineColor, lineName } from '../lib/specialty';
import { QrCode } from './QrCode';

type Status = Schemas['BookingDetails']['status'];

const STATUS_LABELS: Record<Status, string> = {
  BOOKED: 'Confermata',
  ARRIVED: 'Visita svolta',
  NO_SHOW: 'Paziente non presentato',
  CANCELLED: 'Annullata',
};

type TicketProps = {
  specialty?: string;
  doctor?: string;
  startsAt?: string;
  patient?: string;
  /** Printed only once the booking is confirmed. */
  code?: string;
  status?: Status;
  /** While the patient is choosing: each value printed for the first time comes out slowly. */
  live?: boolean;
};

/**
 * The appointment ticket. It is the only object on the page, so the only thing with a shadow,
 * and the only text in the monospaced face, because it is printed. It fills in as the patient
 * chooses.
 */
export function Ticket({
  specialty,
  doctor,
  startsAt,
  patient,
  code,
  status,
  live = false,
}: TicketProps) {
  const struck = status === 'CANCELLED' ? 'line-through' : '';
  const line = lineColor(specialty);

  return (
    <section
      aria-label="Tagliando della visita"
      className="ticket w-[calc(100%-1.5rem)] max-w-[21rem] font-mono"
    >
      <div className="ticket-body bg-paper px-6 pt-7 pb-5">
        <p className="text-sm text-ink-soft">Poliambulatorio Valdoria</p>
        <p
          className="-mx-6 mt-3 px-6 py-2 font-sans text-2xl font-extrabold tracking-tight text-white"
          style={{ background: line }}
        >
          {specialty ?? 'Specialità'}
        </p>
        <dl className="mt-4 space-y-2.5">
          <Printed label="Medico" value={doctor} printing={live} />
          <Printed
            label="Giorno"
            value={startsAt && formatDay(startsAt)}
            printing={live}
            className={struck}
          />
          <Printed
            label="Ora"
            value={startsAt && formatSpokenTime(startsAt)}
            placeholder="--:--"
            printing={live}
            className={`text-6xl tracking-tight ${struck}`}
          />
          {patient && <Printed label="Paziente" value={patient} />}
        </dl>
        {specialty && (
          <p className="mt-4 flex gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-5 shrink-0 rounded-full"
              style={{ background: line }}
            />
            In sede segui la linea {lineName(specialty)}.
          </p>
        )}
      </div>
      <div className="ticket-stub flex items-center gap-4 rounded-b-2xl border-t-2 border-dashed border-rule bg-paper px-6 pt-4 pb-5">
        {code ? (
          <>
            <QrCode text={code} />
            <dl className="min-w-0">
              <dt className="text-sm text-ink-soft">Codice</dt>
              {/* Two groups of four are easier to read out; copied, the code stays one word. */}
              <dd className="text-2xl font-bold tracking-[0.06em]">
                <span>{code.slice(0, 4)}</span>
                <span className="ml-[0.45em]">{code.slice(4)}</span>
              </dd>
              {status && (
                <>
                  <dt className="sr-only">Stato</dt>
                  <dd className="mt-1 text-sm font-bold">{STATUS_LABELS[status]}</dd>
                </>
              )}
            </dl>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="size-16 shrink-0 rounded-md border-2 border-dashed border-rule"
            />
            <p className="leading-snug text-ink-soft">
              <span className="block text-sm">Codice</span>
              si stampa alla conferma
            </p>
          </>
        )}
      </div>
    </section>
  );
}

type PrintedProps = {
  label: string;
  value?: string;
  placeholder?: string;
  printing?: boolean;
  className?: string;
};

function Printed({
  label,
  value,
  placeholder = 'da scegliere',
  printing = false,
  className = '',
}: PrintedProps) {
  const look = value ? `font-bold ${printing ? 'print-in' : ''}` : 'text-ink-soft';
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      {/* A new key for a new value: the line is printed again. */}
      <dd key={value ?? ''} className={`${look} ${className}`}>
        {value ?? placeholder}
      </dd>
    </div>
  );
}

type DispenserProps = { children: ReactNode; issuing?: boolean };

/** The slot of the ticket machine; with `issuing`, the ticket slides out of it. */
export function TicketDispenser({ children, issuing = false }: DispenserProps) {
  return (
    <div className="w-full max-w-[23rem]">
      <div aria-hidden="true" className="dispenser" />
      <div className="-mx-8 -mt-[15px] overflow-hidden px-8 pb-10">
        <div className={`flex justify-center ${issuing ? 'issue' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
