import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded px-5 text-base font-bold ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-[#0c1b29]',
  secondary: 'border-2 border-ink bg-paper text-ink hover:bg-ground',
  danger: 'bg-danger text-white hover:bg-[#8f1e18]',
  quiet: 'min-h-11 px-2 font-normal text-ink underline underline-offset-4 hover:bg-ground',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = 'primary', className = '', type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
