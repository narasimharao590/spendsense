import { Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/format.js';
import CategoryChip from '../ui/CategoryChip.jsx';
import TransactionAmount from './TransactionAmount.jsx';

function RowActions({ transaction, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
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
  );
}

export default function TransactionTable({ transactions, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Transactions matching the current filters, newest activity first by default.
        </caption>
        <thead>
          <tr className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <th scope="col" className="py-2.5 pr-3 font-medium">
              Date
            </th>
            <th scope="col" className="py-2.5 pr-3 font-medium">
              Title
            </th>
            <th scope="col" className="py-2.5 pr-3 font-medium">
              Category
            </th>
            <th scope="col" className="py-2.5 pr-3 text-right font-medium">
              Amount
            </th>
            <th scope="col" className="w-24 py-2.5 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="transition hover:bg-slate-50/80">
              <td className="whitespace-nowrap py-3 pr-3 text-slate-500 money">
                {formatDate(transaction.date, 'D MMM YYYY')}
              </td>
              <td className="max-w-[22rem] py-3 pr-3">
                <p className="truncate font-medium text-slate-800">{transaction.title}</p>
                {transaction.note ? (
                  <p className="mt-0.5 truncate text-xs text-slate-500">{transaction.note}</p>
                ) : null}
              </td>
              <td className="py-3 pr-3">
                <CategoryChip category={transaction.category} size="sm" />
              </td>
              <td className="py-3 pr-3 text-right">
                <TransactionAmount transaction={transaction} />
              </td>
              <td className="py-3 text-right">
                <RowActions
                  transaction={transaction}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
