import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCurrency } from '../../hooks/useCurrency.js';
import { SERIES_COLORS } from '../../lib/colors.js';
import { dayNumber, formatCompactMoney } from '../../lib/format.js';
import ChartTooltip from './ChartTooltip.jsx';

export default function DailyTrendChart({ data = [], height = 280 }) {
  const currency = useCurrency();

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dailyExpenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS.expense} stopOpacity={0.26} />
              <stop offset="100%" stopColor={SERIES_COLORS.expense} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="dailyIncomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS.income} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIES_COLORS.income} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={SERIES_COLORS.grid} strokeDasharray="4 4" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={(value) => dayNumber(value)}
            tickLine={false}
            axisLine={{ stroke: SERIES_COLORS.grid }}
            tick={{ fontSize: 11, fill: SERIES_COLORS.axis }}
            tickMargin={10}
            minTickGap={18}
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
            cursor={{ stroke: '#c9ccc6', strokeDasharray: '4 4' }}
          />

          <Area
            type="monotone"
            dataKey="expense"
            name="Expenses"
            stroke={SERIES_COLORS.expense}
            strokeWidth={2}
            fill="url(#dailyExpenseFill)"
            activeDot={{ r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke={SERIES_COLORS.income}
            strokeWidth={2}
            fill="url(#dailyIncomeFill)"
            activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
