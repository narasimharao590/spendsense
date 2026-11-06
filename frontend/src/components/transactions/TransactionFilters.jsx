import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import SegmentedControl from '../ui/SegmentedControl.jsx';

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const SORT_OPTIONS = [
  { value: '-date', label: 'Newest first' },
  { value: 'date', label: 'Oldest first' },
  { value: '-amount', label: 'Highest amount' },
  { value: 'amount', label: 'Lowest amount' },
];

const FIELD_CLASS =
  'h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 transition focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100';

export default function TransactionFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  categoryId,
  onCategoryIdChange,
  categories = [],
  from,
  onFromChange,
  to,
  onToChange,
  sort,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
  onThisMonth,
  total,
  loading,
  onAdd,
}) {
  return (
    <section
      aria-label="Filter transactions"
      className="card space-y-4 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by title or note"
            aria-label="Search transactions"
            className={`${FIELD_CLASS} w-full pl-9 sm:h-10`}
          />
        </div>
        <Button onClick={onAdd} className="w-full sm:w-auto">
          <Plus size={16} aria-hidden="true" />
          Add transaction
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="Transaction type"
            value={type}
            onChange={onTypeChange}
            options={TYPE_OPTIONS}
          />

          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span className="sr-only">Category</span>
            <select
              value={categoryId}
              onChange={(event) => onCategoryIdChange(event.target.value)}
              aria-label="Filter by category"
              className={FIELD_CLASS}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden sm:inline">From</span>
              <input
                type="date"
                value={from}
                onChange={(event) => onFromChange(event.target.value)}
                aria-label="From date"
                className={FIELD_CLASS}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden sm:inline">To</span>
              <input
                type="date"
                value={to}
                onChange={(event) => onToChange(event.target.value)}
                aria-label="To date"
                className={FIELD_CLASS}
              />
            </label>
            <button
              type="button"
              onClick={onThisMonth}
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              This month
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-500">
          <SlidersHorizontal size={14} aria-hidden="true" className="text-slate-400" />
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            aria-label="Sort transactions"
            className={FIELD_CLASS}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-500" role="status" aria-live="polite">
          {loading
            ? 'Loading transactions…'
            : `${total} ${total === 1 ? 'transaction' : 'transactions'}`}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary-700 transition hover:bg-primary-50"
          >
            <X size={13} aria-hidden="true" />
            Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}
