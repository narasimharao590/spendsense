import Money from '../ui/Money.jsx';
import { formatDate } from '../../lib/format.js';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

function resolveTitle(label, title) {
  if (title) {
    return title;
  }
  if (DATE_KEY_PATTERN.test(label)) {
    return formatDate(label);
  }
  if (MONTH_KEY_PATTERN.test(label)) {
    return formatDate(`${label}-01`, 'MMMM YYYY');
  }
  return label;
}

export default function ChartTooltip({ active, payload, label, title, unit = null }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 shadow-pop">
      <p className="text-xs font-semibold text-ink-muted">{resolveTitle(label, title)}</p>
      <ul className="mt-2 space-y-1.5">
        {payload.map((entry, index) => (
          <li
            key={`${entry.dataKey ?? 'slice'}-${index}`}
            className="flex items-center justify-between gap-5 text-xs"
          >
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? entry.payload?.fill ?? '#e6e6e0' }}
              />
              {entry.name ?? 'Value'}
            </span>
            <span className="flex items-center gap-1">
              <Money value={entry.value} className="font-semibold text-ink" />
              {unit ? <span className="text-ink-faint">{unit}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
