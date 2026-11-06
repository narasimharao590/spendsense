import { cx } from '../../lib/cx.js';

export default function BrandMark({ className, showWordmark = true, size = 'md' }) {
  const glyph = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const word = size === 'sm' ? 'text-base' : 'text-lg';
  const pill = size === 'sm' ? 'py-1.5 pl-1.5 pr-3.5' : 'py-2 pl-2 pr-4';

  return (
    <span
      className={cx(
        'inline-flex items-center gap-2.5 rounded-full border border-line bg-surface shadow-sm',
        pill,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'grid shrink-0 place-items-center rounded-xl bg-primary-500 text-white shadow-sm',
          glyph,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8.5h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h9" />
          <circle cx="16" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {showWordmark ? (
        <span className={cx('font-semibold tracking-tight text-ink', word)}>SpendSense</span>
      ) : null}
    </span>
  );
}
