import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { formatSpokenTime } from '../../lib/dates';
import { lineColor } from '../../lib/specialty';
import { possibleActions, STATUS, type Visit } from './status';

export type Action = 'arrival' | 'no-show' | 'cancellation';

type VisitPanelProps = {
  visit: Visit;
  specialty: string | undefined;
  today: string;
  now: Date;
  busy: boolean;
  onAction: (action: Action, visit: Visit) => void;
  onClose: () => void;
};

/** Everything about the visit chosen in the grid, and what can be recorded about it. */
export function VisitPanel({
  visit,
  specialty,
  today,
  now,
  busy,
  onAction,
  onClose,
}: VisitPanelProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const can = possibleActions(visit, today, now);

  // Drawn afresh for each visit chosen in the grid (see the key where it is used): it takes the
  // focus, so a keyboard or screen reader user lands on what they chose.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section aria-labelledby="visita-scelta" className="rounded-2xl bg-paper p-5">
      <p className="text-sm text-ink-soft">Visita scelta</p>
      <h2
        id="visita-scelta"
        ref={heading}
        tabIndex={-1}
        className="text-2xl/tight font-extrabold tracking-tight"
      >
        {visit.patientName}
      </h2>
      <p className="mt-3 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-11 w-2 shrink-0 rounded-full"
          style={{ background: lineColor(specialty) }}
        />
        <span className="leading-snug">
          <span className="block text-lg font-bold tabular-nums">
            {formatSpokenTime(visit.startsAt)} – {formatSpokenTime(visit.endsAt)}
          </span>
          <span className="block text-sm">{visit.doctorName}</span>
        </span>
      </p>
      <dl className="mt-4 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-rule pt-3 text-sm">
        <dt className="text-ink-soft">Stato</dt>
        <dd className="font-bold">{STATUS[visit.status].label}</dd>
        <dt className="text-ink-soft">Telefono</dt>
        <dd>{visit.patientPhone}</dd>
        <dt className="text-ink-soft">Email</dt>
        <dd className="[overflow-wrap:anywhere]">{visit.patientEmail}</dd>
        <dt className="text-ink-soft">Codice</dt>
        <dd className="font-mono font-bold tracking-wider">{visit.code}</dd>
      </dl>

      <div className="mt-5 flex flex-col gap-2">
        {can.arrive && (
          <Button
            disabled={busy}
            aria-label={`Segna arrivato: ${visit.patientName}`}
            onClick={() => {
              onAction('arrival', visit);
            }}
          >
            Segna arrivato
          </Button>
        )}
        {can.miss && (
          <Button
            variant="secondary"
            disabled={busy}
            aria-label={`Segna non presentato: ${visit.patientName}`}
            onClick={() => {
              onAction('no-show', visit);
            }}
          >
            Non si è presentato
          </Button>
        )}
        {can.cancel && !confirmingCancel && (
          <Button
            variant="quiet"
            aria-label={`Annulla visita: ${visit.patientName}`}
            className="self-start font-bold text-danger"
            onClick={() => {
              setConfirmingCancel(true);
            }}
          >
            Annulla la visita
          </Button>
        )}
      </div>

      {can.cancel && confirmingCancel && (
        <div className="mt-3 space-y-3 rounded-xl bg-danger-soft p-3">
          <p className="font-bold">
            Annullare la visita di {visit.patientName} delle {formatSpokenTime(visit.startsAt)}? Il
            paziente riceverà un’email.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                setConfirmingCancel(false);
                onAction('cancellation', visit);
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

      <Button variant="quiet" className="mt-3" onClick={onClose}>
        Chiudi
      </Button>
    </section>
  );
}
