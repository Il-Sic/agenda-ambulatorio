import { lineColor } from '../lib/specialty';

/** The arrow of a sign in the building: "this way". Never used on a button. */
export function WayArrow({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

/** The specialty's name on the colour of its line, as on the ticket's band. */
export function LineChip({ specialty, className = '' }: { specialty: string; className?: string }) {
  return (
    <span
      className={`rounded-lg font-extrabold text-white ${className}`}
      style={{ background: lineColor(specialty) }}
    >
      {specialty}
    </span>
  );
}
