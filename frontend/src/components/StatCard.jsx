import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cx } from '../lib/cx.js';

const TINTS = {
  rose: 'bg-tint-rose',
  amber: 'bg-tint-amber',
  mint: 'bg-tint-mint',
  sky: 'bg-tint-sky',
  violet: 'bg-tint-violet',
};

const DELTA_TONES = {
  positive: 'bg-income/10 text-income',
  negative: 'bg-expense/10 text-expense',
  neutral: 'bg-ink/10 text-ink-muted',
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  delta = null,
  deltaUnit = '%',
  deltaGoodWhenHigher = true,
  footnote = 'vs last month',
  tone = 'mint',
  className,
}) {
  const hasDelta = Number.isFinite(delta);
  const isFlat = hasDelta && Math.abs(delta) < 0.05;
  const isUp = hasDelta && delta > 0;
  const deltaTone = !hasDelta || isFlat ? 'neutral' : isUp === deltaGoodWhenHigher ? 'positive' : 'negative';
  const DeltaIcon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cx(
        'flex flex-col justify-between gap-4 rounded-card p-5 transition hover:shadow-card',
        TINTS[tone] ?? TINTS.mint,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="micro-label text-ink-soft">{label}</p>
        {Icon ? (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface/60 text-ink-soft">
            <Icon size={15} aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="money text-[1.75rem] font-bold leading-none tracking-tight text-ink">
          {value}
        </p>

        {hasDelta ? (
          <span
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold money',
              DELTA_TONES[deltaTone],
            )}
          >
            <DeltaIcon size={13} aria-hidden="true" />
            {`${Math.abs(delta).toFixed(1)}${deltaUnit}`}
          </span>
        ) : null}
      </div>

      <p className="text-xs text-ink-soft/70">{hasDelta ? footnote : 'No data last month'}</p>
    </div>
  );
}
