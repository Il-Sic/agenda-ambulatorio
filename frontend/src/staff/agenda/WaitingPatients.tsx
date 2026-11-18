import type { Schemas } from '../../api/client';
import { Button } from '../../components/Button';
import { formatSpokenTime } from '../../lib/dates';
import { lineColor } from '../../lib/specialty';
import type { Visit } from './status';

type WaitingPatientsProps = {
  /** Arrived today with a number and not called yet, in the order of their visits. */
  visits: Visit[];
  doctorOf: (doctorId: number) => Schemas['DoctorDay'] | undefined;
  busy: boolean;
  onCall: (visit: Visit) => void;
};

/**
 * Who is in the waiting room with a number: the desk calls them when the doctor is ready, and
 * the number goes on the screen. The desk can open that screen from here, to see what it shows.
 */
export function WaitingPatients({ visits, doctorOf, busy, onCall }: WaitingPatientsProps) {
  return (
    <section aria-labelledby="in-sala" className="rounded-2xl bg-paper px-5 pt-4 pb-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="in-sala" className="text-xl font-extrabold tracking-tight">
          In sala d’attesa
        </h2>
        <a
          href="/sala"
          target="_blank"
          rel="noopener"
          className="text-sm font-bold underline underline-offset-4"
        >
          Apri lo schermo della sala
          <span className="sr-only"> (si apre in una nuova scheda)</span>
        </a>
      </div>
      {visits.length === 0 ? (
        <p className="py-3 text-ink-soft">
          Nessuno da chiamare. Chi segni come arrivato riceve un numero e compare qui.
        </p>
      ) : (
        <ul className="mt-1">
          {visits.map((visit) => {
            const doctor = doctorOf(visit.doctorId);
            return (
              <li key={visit.code} className="flex items-center gap-3 border-t border-rule py-2.5">
                <span className="w-12 shrink-0 text-2xl font-extrabold tabular-nums">
                  <span className="sr-only">Numero </span>
                  {visit.callNumber}
                </span>{' '}
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="block font-bold break-words">{visit.patientName}</span>{' '}
                  <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: lineColor(doctor?.specialty) }}
                    />
                    <span aria-hidden="true">
                      {doctor?.lastName ?? visit.doctorName}, {formatSpokenTime(visit.startsAt)}
                    </span>
                    <span className="sr-only">
                      {visit.doctorName}, alle {formatSpokenTime(visit.startsAt)}
                    </span>
                  </span>
                </span>
                <Button
                  size="small"
                  disabled={busy}
                  aria-label={`Chiama in sala: ${visit.patientName}`}
                  onClick={() => {
                    onCall(visit);
                  }}
                >
                  Chiama
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
