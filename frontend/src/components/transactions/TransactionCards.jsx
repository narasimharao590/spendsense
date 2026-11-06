import { Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/format.js';
import CategoryChip from '../ui/CategoryChip.jsx';
import TransactionAmount from './TransactionAmount.jsx';

export default function TransactionCards({ transactions, onEdit, onDelete }) {
  return (
    <ul className="space-y-2.5">
      {transactions.map((transaction) => (
        <li
          key={transaction.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{transaction.title}</p>
              <p className="money mt-0.5 text-xs text-slate-500">
                {formatDate(transaction.date, 'D MMM YYYY')}
              </p>
            </div>
            <TransactionAmount transaction={transaction} className="shrink-0 text-sm" />
          </div>

          {transaction.note ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{transaction.note}</p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3">
            <CategoryChip category={transaction.category} size="sm" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(transaction)}
                aria-label={`Edit ${transaction.title}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-primary-50 hover:text-primary-700"
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(transaction)}
                aria-label={`Delete ${transaction.title}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
