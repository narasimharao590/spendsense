import { categoryColor, SERIES_COLORS } from '../../lib/colors.js';
import { useCurrency } from '../../hooks/useCurrency.js';
import { formatMoney } from '../../lib/format.js';
import ArrowLink from '../ui/ArrowLink.jsx';
import CategoryIcon from '../ui/CategoryIcon.jsx';

function percentUsed(budget) {
  const raw = Number(budget.percentUsed);
  if (Number.isFinite(raw)) {
    return raw;
  }
  const amount = Number(budget.amount) || 0;
  return amount > 0 ? ((Number(budget.spent) || 0) / amount) * 100 : 0;
}

function barColor(percent, color) {
  if (percent > 100) {
    return SERIES_COLORS.expense;
  }
  if (percent >= 80) {
    return '#d97706';
  }
  return color;
}

export default function BudgetProgressCompact({ budgets = [], summary }) {
  const currency = useCurrency();
  const rows = budgets.slice(0, 4);

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink">Budget progress</h2>
          <p className="money mt-1 text-xs text-ink-muted">
            {formatMoney(summary?.spent ?? 0, currency)} of {formatMoney(summary?.budgeted ?? 0, currency)}{' '}
            budgeted
          </p>
        </div>
        <ArrowLink to="/budgets" className="text-xs">
          Manage
        </ArrowLink>
      </div>

      <ul className="mt-5 space-y-4">
        {rows.map((budget) => {
          const percent = percentUsed(budget);
          const color = categoryColor(budget.category?.color);

          return (
            <li key={budget.id}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-ink-soft">
                  <CategoryIcon icon={budget.category?.icon} size={14} className="shrink-0" />
                  <span className="truncate font-semibold">{budget.category?.name ?? 'Category'}</span>
                </span>
                <span className="money shrink-0 text-ink-muted">{percent.toFixed(0)}%</span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10"
                role="progressbar"
                aria-label={`${budget.category?.name ?? 'Category'} budget used`}
                aria-valuenow={Math.round(Math.min(percent, 100))}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.min(percent, 100)}%`,
                    backgroundColor: barColor(percent, color),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
