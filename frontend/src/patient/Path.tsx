import type { CSSProperties, ReactNode } from 'react';
import { Button } from '../components/Button';
import { stepHeadingId } from './stepHeading';

type PathProps = { line: string; children: ReactNode };

/** The steps of a booking, strung along a line in the colour of the chosen specialty. */
export function Path({ line, children }: PathProps) {
  return (
    <ol
      aria-label="Passi della prenotazione"
      className="path"
      style={{ '--line': line } as CSSProperties}
    >
      {children}
    </ol>
  );
}

type StepProps = {
  number: number;
  title: string;
  state: 'done' | 'current' | 'todo';
  /** What was chosen, shown once the step is done. */
  summary?: string;
  editLabel?: string;
  onEdit?: () => void;
  children?: ReactNode;
};

export function Step({ number, title, state, summary, editLabel, onEdit, children }: StepProps) {
  return (
    <li
      className="path-step"
      data-state={state}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      <span className="path-stop" aria-hidden="true">
        {number}
      </span>
      <h2
        id={stepHeadingId(number)}
        tabIndex={-1}
        className={
          state === 'done'
            ? 'flex min-h-9 items-center font-bold text-ink-soft'
            : 'flex min-h-9 items-center text-xl font-bold'
        }
      >
        <span className="sr-only">Passo {number}:&nbsp;</span>
        {title}
      </h2>
      {state === 'done' && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg font-bold">{summary}</p>
          {onEdit && (
            <Button variant="quiet" aria-label={editLabel} onClick={onEdit}>
              Cambia
            </Button>
          )}
        </div>
      )}
      {state === 'current' && <div className="mt-3">{children}</div>}
    </li>
  );
}
