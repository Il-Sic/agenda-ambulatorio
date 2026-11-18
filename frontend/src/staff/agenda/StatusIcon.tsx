import type { Status } from './status';

/** A small sign for each status, next to its name. */
export function StatusIcon({ status, className = '' }: { status: Status; className?: string }) {
  const common = {
    'aria-hidden': true,
    width: 13,
    height: 13,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `shrink-0 ${className}`,
  };
  switch (status) {
    case 'ARRIVED':
      return (
        <svg {...common} strokeWidth="3.2">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case 'NO_SHOW':
    case 'CANCELLED':
      return (
        <svg {...common} strokeWidth="3">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'BOOKED':
      return (
        <svg {...common} strokeWidth="2.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}
