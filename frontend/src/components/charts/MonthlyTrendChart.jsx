import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCurrency } from '../../hooks/useCurrency.js';
import { SERIES_COLORS } from '../../lib/colors.js';
import { formatCompactMoney, monthShortLabel } from '../../lib/format.js';
import ChartTooltip from './ChartTooltip.jsx';

export default function MonthlyTrendChart({ data = [], height = 260 }) {
  const currency = useCurrency();

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={SERIES_COLORS.grid} strokeDasharray="4 4" vertical={false} />

          <XAxis
            dataKey="month"
            tickFormatter={(value) => monthShortLabel(value)}
            tickLine={false}
            axisLine={{ stroke: SERIES_COLORS.grid }}
            tick={{ fontSize: 11, fill: SERIES_COLORS.axis }}
            tickMargin={10}
          />
          <YAxis
            width={68}
            tickFormatter={(value) => formatCompactMoney(value, currency)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: SERIES_COLORS.axis }}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(30, 33, 31, 0.05)' }}
          />

          <Bar
            dataKey="income"
            name="Income"
            fill={SERIES_COLORS.income}
            radius={[6, 6, 0, 0]}
            maxBarSize={16}
          />
          <Bar
            dataKey="expense"
            name="Expenses"
            fill={SERIES_COLORS.expense}
            radius={[6, 6, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
