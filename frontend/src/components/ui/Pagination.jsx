import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '../../lib/cx.js';

const LIMIT_OPTIONS = [10, 20, 50];

const NAV_BUTTON =
  'inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50';

export default function Pagination({
  page,
  pages,
  total,
  limit,
  loading = false,
  onPrevious,
  onNext,
  onLimitChange,
}) {
  const safePages = Math.max(Number(pages) || 0, 1);
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), safePages);
  const from = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);
  const noPrevious = currentPage <= 1;
  const noNext = currentPage >= safePages;

  return (
    <div className="flex flex-col gap-3 border-t border-line-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-muted">
          Showing <span className="money font-medium text-ink-soft">{from}</span>–
          <span className="money font-medium text-ink-soft">{to}</span> of{' '}
          <span className="money font-medium text-ink-soft">{total}</span>
        </p>
        <label className="flex items-center gap-1.5 text-sm text-ink-muted">
          <span className="hidden sm:inline">Per page</span>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-sm text-ink-soft transition focus:border-primary-500 focus:outline-none"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={noPrevious || loading}
          aria-label="Previous page"
          className={NAV_BUTTON}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Prev
        </button>
        <span className="money text-sm text-ink-muted">
          Page {currentPage} of {safePages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={noNext || loading}
          aria-label="Next page"
          className={NAV_BUTTON}
        >
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
