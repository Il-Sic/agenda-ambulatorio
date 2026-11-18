import { Button } from '../../components/Button';
import { formatSpokenTime } from '../../lib/dates';
import { lineColor } from '../../lib/specialty';
import type { Visit } from './status';

type NextArrivalsProps = {
  visits: Visit[];
  specialtyOf: (doctorId: number) => string | undefined;
  busy: boolean;
  onArrived: (visit: Visit) => void;
};

/** Who the desk is expecting next today, with the one thing most often done: they arrived. */
export function NextArrivals({ visits, specialtyOf, busy, onArrived }: NextArrivalsProps) {
  return (
    <section aria-labelledby="prossimi-arrivi" className="rounded-2xl bg-paper px-5 pt-4 pb-2">
      <h2 id="prossimi-arrivi" className="text-xl font-extrabold tracking-tight">
        Prossimi arrivi
      </h2>
      {visits.length === 0 ? (
        <p className="py-3 text-ink-soft">Nessun paziente atteso per il resto della giornata.</p>
      ) : (
        <ul className="mt-1">
          {visits.map((visit) => (
            <li key={visit.code} className="flex items-center gap-3 border-t border-rule py-2.5">
              <span className="w-12 shrink-0 font-extrabold tabular-nums">
                {formatSpokenTime(visit.startsAt)}
              </span>
              <span className="min-w-0 flex-1 leading-snug">
                <span className="block truncate font-bold">{visit.patientName}</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: lineColor(specialtyOf(visit.doctorId)) }}
                  />
                  {visit.doctorName}
                </span>
              </span>
              <Button
                variant="secondary"
                size="small"
                disabled={busy}
                aria-label={`Segna arrivato: ${visit.patientName}`}
                onClick={() => {
                  onArrived(visit);
                }}
              >
                Arrivato
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
