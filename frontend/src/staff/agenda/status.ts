import type { Schemas } from '../../api/client';
import { dayKey } from '../../lib/dates';

export type Visit = Schemas['AgendaEntry'];
export type Status = Visit['status'];

/** What each status is called and how its block looks: never told by colour alone. */
export const STATUS: Record<Status, { label: string; block: string }> = {
  BOOKED: { label: 'In attesa', block: 'border-[1.5px] border-ink-soft bg-paper' },
  ARRIVED: { label: 'Arrivato', block: 'bg-ok-soft' },
  NO_SHOW: { label: 'Non presentato', block: 'bg-warn-soft' },
  CANCELLED: { label: 'Annullata', block: 'bg-ground text-ink-soft line-through' },
};

/** The same rules the server applies, so the staff are only offered what will work. */
export function possibleActions(visit: Visit, today: string, now: Date) {
  const dayHasCome = dayKey(visit.startsAt) <= today;
  const notStarted = new Date(visit.startsAt) > now;
  return {
    arrive: dayHasCome && (visit.status === 'BOOKED' || visit.status === 'NO_SHOW'),
    miss: dayHasCome && (visit.status === 'BOOKED' || visit.status === 'ARRIVED'),
    cancel: visit.status === 'BOOKED' && notStarted,
  };
}
