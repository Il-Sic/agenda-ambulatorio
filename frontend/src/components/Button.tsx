import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet';
type Size = 'regular' | 'small';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded font-bold ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

// Even the small size keeps a comfortable target for a finger.
const SIZES: Record<Size, string> = {
  regular: 'min-h-12 px-5 text-base',
  small: 'min-h-11 px-3 text-sm',
};

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-[#0c1b29]',
  secondary: 'border-2 border-ink bg-paper text-ink hover:bg-ground',
  danger: 'bg-danger text-white hover:bg-[#8f1e18]',
  quiet: 'px-2 font-normal text-ink underline underline-offset-4 hover:bg-ground',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({
  variant = 'primary',
  size = 'regular',
  className = '',
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={`${BASE} ${SIZES[variant === 'quiet' ? 'small' : size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
