import { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, isMonthKey, monthLabel } from '../lib/format.js';
import { cx } from '../lib/cx.js';

export default function MonthPicker({ month, onChange, label = 'Month', className }) {
  const inputId = useId();

  function handleStep(delta) {
    onChange(addMonths(month, delta));
  }

  function handleNativeChange(event) {
    const next = event.target.value;
    if (isMonthKey(next) && next !== month) {
      onChange(next);
    }
  }

  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span
          aria-live="polite"
          className="min-w-[8.75rem] px-1 text-center text-sm font-semibold text-slate-800"
        >
          {monthLabel(month)}
        </span>
        <button
          type="button"
          onClick={() => handleStep(1)}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="month"
        value={month}
        onChange={handleNativeChange}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition focus:border-primary-500 focus:outline-none"
      />
    </div>
  );
}
