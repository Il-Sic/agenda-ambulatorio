import type { Schemas } from '../../api/client';
import { Button } from '../../components/Button';
import { formatSpokenTime } from '../../lib/dates';
import { lineColor } from '../../lib/specialty';
import type { Visit } from './status';

type NextArrivalsProps = {
  visits: Visit[];
  doctorOf: (doctorId: number) => Schemas['DoctorDay'] | undefined;
  busy: boolean;
  onArrived: (visit: Visit) => void;
};

/** Who the desk is expecting next today, with the one thing most often done: they arrived. */
export function NextArrivals({ visits, doctorOf, busy, onArrived }: NextArrivalsProps) {
  return (
    <section aria-labelledby="prossimi-arrivi" className="rounded-2xl bg-paper px-5 pt-4 pb-2">
      <h2 id="prossimi-arrivi" className="text-xl font-extrabold tracking-tight">
        Prossimi arrivi
      </h2>
      {visits.length === 0 ? (
        <p className="py-3 text-ink-soft">Nessun paziente atteso per il resto della giornata.</p>
      ) : (
        <ul className="mt-1">
          {visits.map((visit) => {
            const doctor = doctorOf(visit.doctorId);
            return (
              <li key={visit.code} className="flex items-center gap-3 border-t border-rule py-2.5">
                <span className="w-12 shrink-0 font-extrabold tabular-nums">
                  {formatSpokenTime(visit.startsAt)}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  {/* A long name goes on two lines: here it is the one thing to read. */}
                  <span className="block font-bold break-words">{visit.patientName}</span>{' '}
                  {/* The surname heads the doctor's column in the grid, with the same colour. */}
                  <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: lineColor(doctor?.specialty) }}
                    />
                    <span aria-hidden="true">{doctor?.lastName ?? visit.doctorName}</span>
                    <span className="sr-only">{visit.doctorName}</span>
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
