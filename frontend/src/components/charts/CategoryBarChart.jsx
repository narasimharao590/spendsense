import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { useCurrency } from '../../hooks/useCurrency.js';
import { SERIES_COLORS } from '../../lib/colors.js';
import { formatCompactMoney } from '../../lib/format.js';
import ChartTooltip from './ChartTooltip.jsx';

function shortLabel(name) {
  const text = String(name ?? '');
  return text.length > 10 ? `${text.slice(0, 9)}…` : text;
}

export default function CategoryBarChart({
  data = [],
  seriesName = 'This month',
  benchmark = null,
  height = 280,
}) {
  const currency = useCurrency();
  const benchmarkValue = Number(benchmark);
  const showBenchmark = Number.isFinite(benchmarkValue) && benchmarkValue > 0;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={SERIES_COLORS.grid} strokeDasharray="4 4" vertical={false} />

          <XAxis
            dataKey="name"
            tickFormatter={shortLabel}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: SERIES_COLORS.grid }}
            tick={{ fontSize: 11, fill: SERIES_COLORS.axis }}
            tickMargin={10}
          />
          <YAxis
            width={64}
            tickFormatter={(value) => formatCompactMoney(value, currency)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: SERIES_COLORS.axis }}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(30, 33, 31, 0.05)' }}
          />

          {showBenchmark ? (
            <ReferenceLine
              y={benchmarkValue}
              stroke={SERIES_COLORS.accentSoft}
              strokeDasharray="6 6"
              strokeWidth={2}
            />
          ) : null}

          <Bar
            dataKey="total"
            name={seriesName}
            fill={SERIES_COLORS.accent}
            radius={[8, 8, 0, 0]}
            maxBarSize={38}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
