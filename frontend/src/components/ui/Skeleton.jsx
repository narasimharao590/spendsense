import { cx } from '../../lib/cx.js';

export default function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cx('animate-pulse rounded-xl bg-ink/10', className)}
    />
  );
}

export function SkeletonRows({ rows = 5, className }) {
  return (
    <div className={cx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }, (row, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface-muted px-4 py-3"
        >
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
