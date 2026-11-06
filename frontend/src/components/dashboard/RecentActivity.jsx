import { Pencil } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency.js';
import { cx } from '../../lib/cx.js';
import { formatDate, formatMoney } from '../../lib/format.js';
import CategoryChip from '../ui/CategoryChip.jsx';

export default function RecentActivity({ transactions = [], onEdit }) {
  const currency = useCurrency();

  return (
    <ul className="space-y-1">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === 'income';

        return (
          <li
            key={transaction.id}
            className="group flex items-start gap-3 rounded-xl px-2 py-3 transition hover:bg-surface-muted"
          >
            <div className="min-w-0 flex-1">
              <p className="money text-[11px] text-ink-faint">
                {formatDate(transaction.date, 'D MMM YYYY')}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">{transaction.title}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={cx(
                  'money text-sm font-semibold',
                  isIncome ? 'text-income' : 'text-expense',
                )}
              >
                {formatMoney(isIncome ? transaction.amount : -Math.abs(transaction.amount), currency)}
              </span>
              <CategoryChip category={transaction.category} size="sm" />
            </div>

            <button
              type="button"
              onClick={() => onEdit(transaction)}
              aria-label={`Edit ${transaction.title}`}
              className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100 hover:bg-surface hover:text-primary-700"
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
