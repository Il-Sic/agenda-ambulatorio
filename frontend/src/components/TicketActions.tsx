import type { Schemas } from '../api/client';
import { calendarFile } from '../lib/calendar';
import { Button } from './Button';

/**
 * What a patient does with the ticket: put the visit in the phone's calendar, or print the ticket
 * alone (the page's print style hides everything else).
 */
export function TicketActions({ booking }: { booking: Schemas['BookingDetails'] }) {
  const calendar = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendarFile(booking))}`;
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={calendar}
        download={`visita-${booking.code}.ics`}
        className="inline-flex min-h-12 items-center gap-2.5 rounded bg-ink px-5 font-bold text-white hover:bg-[#0c1b29]"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        Aggiungi al calendario
      </a>
      <Button
        variant="secondary"
        onClick={() => {
          window.print();
        }}
      >
        Stampa il tagliando
      </Button>
    </div>
  );
}
