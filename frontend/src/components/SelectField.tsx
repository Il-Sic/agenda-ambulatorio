import { useId, type Ref, type SelectHTMLAttributes } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  ref?: Ref<HTMLSelectElement>;
};

export function SelectField({ label, className = '', children, ...select }: SelectFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <select
        id={id}
        className="mt-1 block min-h-12 w-full rounded border-2 border-ink-soft bg-paper px-3 text-base"
        {...select}
      >
        {children}
      </select>
    </div>
  );
}
