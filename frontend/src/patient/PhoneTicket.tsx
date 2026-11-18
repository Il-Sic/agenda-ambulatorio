import { dayKey, formatDayShort, formatSpokenTime } from '../lib/dates';

type PhoneTicketProps = { specialty?: string; doctor?: string; startsAt?: string };

/**
 * On a phone the ticket waits at the bottom of the screen, showing what has been chosen so far,
 * while the steps scroll above it.
 */
export function PhoneTicket({ specialty, doctor, startsAt }: PhoneTicketProps) {
  const chosen = [doctor, startsAt && formatDayShort(dayKey(startsAt))].filter(Boolean);
  return (
    <section
      aria-label="Il tuo tagliando"
      className="fixed inset-x-0 bottom-0 z-10 [filter:drop-shadow(0_-4px_14px_rgb(20_41_61/0.16))] lg:hidden"
    >
      <div aria-hidden="true" className="ticket-torn-top" />
      <div className="flex items-center gap-3 bg-paper px-5 pt-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] font-mono">
        <span aria-hidden="true" className="w-2 self-stretch rounded-full bg-(--line)" />
        <p className="min-w-0 flex-1 leading-snug">
          <span className="block text-sm text-ink-soft">Il tuo tagliando</span>
          <span className="block truncate font-bold">
            {chosen.length > 0 ? chosen.join(', ') : specialty}
          </span>
        </p>
        <p
          className={`shrink-0 text-4xl font-bold tracking-tight ${startsAt ? '' : 'text-ink-soft'}`}
        >
          {startsAt ? formatSpokenTime(startsAt) : '--:--'}
        </p>
      </div>
    </section>
  );
}
