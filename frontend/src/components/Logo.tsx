/**
 * Five lines turning a corner together: the wayfinding lines of the clinic, one per specialty.
 * Drawn on a 44 by 44 grid; the colours are those of the lines on the home page.
 */
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      strokeWidth="4"
    >
      <path d="M4 0V10A30 30 0 0 0 34 40H44" stroke="var(--color-line-violet)" />
      <path d="M10 0V10A24 24 0 0 0 34 34H44" stroke="var(--color-line-green)" />
      <path d="M16 0V10A18 18 0 0 0 34 28H44" stroke="var(--color-line-blue)" />
      <path d="M22 0V10A12 12 0 0 0 34 22H44" stroke="var(--color-line-ochre)" />
      <path d="M28 0V10A6 6 0 0 0 34 16H44" stroke="var(--color-line-red)" />
    </svg>
  );
}

/** The mark with the clinic's name, as it appears at the top of every page. */
export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      <span className="flex flex-col leading-[1.1]">
        <span className="text-sm text-ink-soft">Poliambulatorio</span>{' '}
        <span className="text-2xl font-extrabold tracking-tight">Valdoria</span>
      </span>
    </span>
  );
}
