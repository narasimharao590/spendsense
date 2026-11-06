import { cx } from '../../lib/cx.js';

export default function SegmentedControl({ value, onChange, options, ariaLabel, className }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        'inline-flex w-full items-center gap-1 rounded-xl border border-line bg-surface p-1 sm:w-auto',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition sm:flex-none',
              active
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
            )}
          >
            {option.icon ? <option.icon size={15} aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
