import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/cx.js';

const VARIANTS = {
  primary:
    'bg-primary-500 text-white shadow-sm hover:bg-primary-600 disabled:hover:bg-primary-500',
  secondary:
    'bg-surface text-ink-soft ring-1 ring-inset ring-line hover:bg-surface-muted hover:text-ink',
  ghost: 'text-ink-muted hover:bg-ink/5 hover:text-ink',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:hover:bg-rose-600',
};

const SIZES = {
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
  icon: 'h-9 w-9',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  type = 'button',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
