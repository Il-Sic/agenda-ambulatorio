import type { CSSProperties } from 'react';

type FlapsProps = {
  value: number;
  /** Sets the size: a tile is as large as the font size given here. */
  className?: string;
  /** The tiles fall into place one by one, as when a new number comes up. */
  flip?: boolean;
};

/**
 * A call number on split-flap tiles, at least two of them, as on the screen of the waiting room.
 * Read out as a plain number.
 */
export function Flaps({ value, className = '', flip = false }: FlapsProps) {
  const digits = String(value).padStart(2, '0').split('');
  return (
    <span className={`inline-flex ${className}`}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="flex gap-[0.08em]">
        {digits.map((digit, position) => (
          <span
            // The tiles of a number only ever change all together, when the key above changes.
            key={position}
            className={flip ? 'flap flip' : 'flap'}
            style={
              flip ? ({ '--delay': `${String(150 * position)}ms` } as CSSProperties) : undefined
            }
          >
            {digit}
          </span>
        ))}
      </span>
    </span>
  );
}
