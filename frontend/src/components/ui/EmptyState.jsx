import { Inbox } from 'lucide-react';
import { cx } from '../../lib/cx.js';

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action = null,
  className,
  compact = false,
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface-muted text-center',
        compact ? 'px-4 py-6' : 'px-6 py-12',
        className,
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-primary-600 ring-1 ring-line">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
