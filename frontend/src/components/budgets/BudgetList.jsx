import { Pencil, Trash2 } from 'lucide-react';
import { categoryColor } from '../../lib/colors.js';
import { formatMoney } from '../../lib/format.js';
import { useCurrency } from '../../hooks/useCurrency.js';
import CategoryIcon from '../ui/CategoryIcon.jsx';
import Money from '../ui/Money.jsx';

function usagePercent(budget) {
  const raw = Number(budget.percentUsed);
  if (Number.isFinite(raw)) {
    return raw;
  }
  const amount = Number(budget.amount) || 0;
  if (amount <= 0) {
    return 0;
  }
  return ((Number(budget.spent) || 0) / amount) * 100;
}

function stateOf(percentUsed) {
  if (percentUsed > 100) {
    return {
      key: 'over',
      bar: 'bg-expense',
      text: 'text-expense',
      chip: 'Over budget',
    };
  }
  if (percentUsed >= 80) {
    return {
      key: 'warning',
      bar: 'bg-caution',
      text: 'text-caution',
      chip: 'Close to limit',
    };
  }
  return {
    key: 'under',
    bar: 'bg-primary-600',
    text: 'text-slate-500',
    chip: 'On track',
  };
}

function BudgetRow({ budget, onEdit, onDelete }) {
  const currency = useCurrency();
  const percentUsed = usagePercent(budget);
  const state = stateOf(percentUsed);
  const remaining = Number(budget.remaining);
  const overspend = Math.abs(Number(budget.spent || 0) - Number(budget.amount || 0));
  const color = categoryColor(budget.category?.color);

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
            style={{ backgroundColor: color }}
          >
            <CategoryIcon icon={budget.category?.icon} size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {budget.category?.name ?? 'Category'}
            </p>
            <p className="money mt-0.5 text-xs text-slate-500">
              <Money value={budget.spent} /> of {formatMoney(budget.amount, currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(budget)}
            aria-label={`Edit the ${budget.category?.name ?? ''} budget`}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-primary-50 hover:text-primary-700"
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(budget)}
            aria-label={`Delete the ${budget.category?.name ?? ''} budget`}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`${budget.category?.name ?? 'Category'} budget used`}
          aria-valuenow={Math.round(Math.min(percentUsed, 100))}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${state.bar}`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={`font-semibold ${state.text}`}>
            {percentUsed.toFixed(0)}% used · {state.chip}
          </span>
          <span className="money text-slate-500">
            {state.key === 'over'
              ? `${formatMoney(overspend, currency)} over budget`
              : `${formatMoney(Number.isFinite(remaining) ? remaining : 0, currency)} left`}
          </span>
        </div>
      </div>
    </li>
  );
}

export default function BudgetList({ budgets, onEdit, onDelete }) {
  return (
    <ul className="space-y-3">
      {budgets.map((budget) => (
        <BudgetRow key={budget.id} budget={budget} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}
