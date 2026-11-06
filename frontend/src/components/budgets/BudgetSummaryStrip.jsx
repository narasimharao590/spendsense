import { CircleDollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import Money from '../ui/Money.jsx';
import Skeleton from '../ui/Skeleton.jsx';

const TILES = [
  { key: 'budgeted', label: 'Total budgeted', icon: CircleDollarSign, tone: 'text-slate-900' },
  { key: 'spent', label: 'Spent so far', icon: TrendingDown, tone: 'text-expense' },
  { key: 'remaining', label: 'Remaining', icon: TrendingUp, tone: 'text-income' },
];

export default function BudgetSummaryStrip({ summary, loading }) {
  if (loading && !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {TILES.map((tile) => (
          <Skeleton key={tile.key} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const usage =
    summary && Number(summary.budgeted) > 0
      ? Math.min((Number(summary.spent) / Number(summary.budgeted)) * 100, 100)
      : 0;

  return (
    <div className="card p-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        {TILES.map((tile) => {
          const value = summary?.[tile.key];
          const isNegativeRemaining = tile.key === 'remaining' && Number(value) < 0;

          return (
            <div key={tile.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {tile.label}
                </dt>
                <tile.icon size={15} aria-hidden="true" className="text-slate-400" />
              </div>
              <dd
                className={`mt-2 text-xl font-semibold tracking-tight money ${
                  isNegativeRemaining ? 'text-expense' : tile.tone
                }`}
              >
                <Money value={isNegativeRemaining ? Math.abs(Number(value)) : value} />
                {isNegativeRemaining ? (
                  <span className="ml-1 text-xs font-medium text-expense">over</span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Overall usage</span>
          <span className="money font-medium text-slate-700">{usage.toFixed(0)}%</span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Total budget used"
          aria-valuenow={Math.round(usage)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              usage >= 100 ? 'bg-expense' : usage >= 80 ? 'bg-caution' : 'bg-primary-600'
            }`}
            style={{ width: `${usage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
