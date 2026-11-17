import { useId, type InputHTMLAttributes, type Ref } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
};

/** A labelled input. Hint and error are tied to the input, so screen readers announce them. */
export function Field({ label, hint, error, className = '', ...input }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : undefined, hint ? hintId : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={
          'mt-1 block min-h-12 w-full rounded border-2 bg-paper px-3 text-base ' +
          (error ? 'border-danger' : 'border-ink-soft')
        }
        {...input}
      />
      {error && (
        <p id={errorId} className="mt-1 font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
