import type { components } from './schema';

/** The error body of the API (RFC 9457 Problem Details). */
export type Problem = components['schemas']['Problem'];

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem | undefined;

  constructor(status: number, problem?: Problem) {
    super(problem?.detail ?? `HTTP ${String(status)}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

// The API speaks English and identifies each error by a stable type; the words are ours.
const MESSAGES: Record<string, string> = {
  '/problems/slot-not-available': 'Questo orario non è più disponibile. Scegline un altro.',
  '/problems/booking-not-found':
    'Non troviamo una prenotazione con questo codice e questa email. Controlla di averli scritti come nell’email di conferma.',
  '/problems/appointment-state': 'Questa operazione non è più possibile per questa visita.',
  '/problems/validation': 'Controlla i campi segnalati e riprova.',
  '/problems/doctor-not-found': 'Questo medico non è più in elenco.',
  '/problems/invalid-period': 'Il periodo richiesto non è valido.',
  '/problems/bad-credentials': 'Nome utente o password non corretti.',
  '/problems/unauthenticated': 'La sessione è scaduta. Accedi di nuovo.',
  '/problems/forbidden': 'Non hai i permessi per questa operazione.',
  '/problems/concurrent-update':
    'Qualcun altro ha appena modificato questa visita. Aggiorna la pagina e riprova.',
  '/problems/appointment-not-found': 'Questa visita non esiste più.',
  '/problems/availability-overlap':
    'Questa fascia si sovrappone a un’altra dello stesso giorno. Cambia gli orari.',
  '/problems/invalid-availability': 'L’ora di fine deve venire dopo l’ora di inizio.',
  '/problems/closure-exists': 'Questo giorno è già segnato come chiuso.',
};

const GENERIC = 'Qualcosa non ha funzionato. Riprova tra poco.';
const NETWORK = 'Connessione non riuscita. Controlla la rete e riprova.';

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    return (error.problem && MESSAGES[error.problem.type]) ?? GENERIC;
  }
  // fetch() rejects with a TypeError when the server cannot be reached.
  return error instanceof TypeError ? NETWORK : GENERIC;
}

export function isProblem(error: unknown, type: string): boolean {
  return error instanceof ApiError && error.problem?.type === type;
}

/** Names of the fields the server rejected, when the problem is a validation error. */
export function fieldErrors(error: unknown): string[] {
  if (!(error instanceof ApiError)) {
    return [];
  }
  return (error.problem?.errors ?? []).map((invalid) => invalid.field);
}
