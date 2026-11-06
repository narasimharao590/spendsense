import { categoryColor } from '../../lib/colors.js';
import { formatDate } from '../../lib/format.js';
import Money from '../ui/Money.jsx';

export default function TopExpenses({ items = [] }) {
  return (
    <ol className="space-y-1">
      {items.map((item, index) => (
        <li
          key={item.id ?? `${item.title}-${index}`}
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-muted"
        >
          <span className="micro-label w-5 shrink-0 text-center text-ink-faint">{index + 1}</span>
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: categoryColor(item.category?.color) }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
            <span className="money block text-xs text-ink-muted">
              {formatDate(item.date, 'D MMM YYYY')}
              {item.category?.name ? ` · ${item.category.name}` : ''}
            </span>
          </span>
          <Money value={item.amount} className="shrink-0 text-sm font-semibold text-expense" />
        </li>
      ))}
    </ol>
  );
}
