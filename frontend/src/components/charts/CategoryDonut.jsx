import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useCurrency } from '../../hooks/useCurrency.js';
import { categoryColor, withAlpha } from '../../lib/colors.js';
import { formatMoney, formatPercent } from '../../lib/format.js';
import CategoryIcon from '../ui/CategoryIcon.jsx';
import ChartTooltip from './ChartTooltip.jsx';

const OTHER_KEY = 'aggregated-other';

function aggregateTail(data, maxItems) {
  if (!maxItems || data.length <= maxItems) {
    return data;
  }

  const head = data.slice(0, maxItems);
  const tail = data.slice(maxItems);
  const tailTotal = tail.reduce((sum, entry) => sum + (Number(entry.total) || 0), 0);
  const total = data.reduce((sum, entry) => sum + (Number(entry.total) || 0), 0);

  if (tailTotal <= 0 || total <= 0) {
    return head;
  }

  return [
    ...head,
    {
      categoryId: OTHER_KEY,
      name: `Other (${tail.length})`,
      color: '#64748b',
      icon: 'more-horizontal',
      total: tailTotal,
      percent: Math.round((tailTotal / total) * 1000) / 10,
    },
  ];
}

export default function CategoryDonut({ data = [], title = 'Total spent', size = 190, maxItems = 6 }) {
  const currency = useCurrency();
  const entries = aggregateTail(data, maxItems);
  const total = data.reduce((sum, entry) => sum + (Number(entry.total) || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative mx-auto shrink-0" style={{ height: size, width: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie
              data={entries}
              dataKey="total"
              nameKey="name"
              innerRadius="68%"
              outerRadius="98%"
              paddingAngle={2}
              cornerRadius={4}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {entries.map((entry, index) => (
                <Cell key={`${entry.categoryId ?? entry.name}-${index}`} fill={categoryColor(entry.color)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-medium text-slate-500">{title}</span>
          <span className="money mt-0.5 text-lg font-semibold text-slate-900">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>

      <ul className="min-w-0 space-y-1.5">
        {entries.map((entry, index) => {
          const color = categoryColor(entry.color);
          return (
            <li
              key={`${entry.categoryId ?? entry.name}-${index}`}
              className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2"
            >
              <span
                aria-hidden="true"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: withAlpha(color, 0.14), color }}
              >
                <CategoryIcon icon={entry.icon} size={14} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                {entry.name}
              </span>
              <span className="money shrink-0 text-xs text-slate-500">
                {formatPercent(entry.percent)}
              </span>
              <span className="money w-24 shrink-0 text-right text-sm font-semibold text-slate-900">
                {formatMoney(entry.total, currency)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
