import { cx } from '../../lib/cx.js';
import EmptyState from '../ui/EmptyState.jsx';
import Skeleton, { SkeletonRows } from '../ui/Skeleton.jsx';

function SkeletonBlock({ variant }) {
  if (variant === 'chart') {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (variant === 'donut') {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <Skeleton className="h-44 w-44 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: 4 }, (placeholder, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  return <SkeletonRows rows={4} />;
}

export default function SectionCard({
  title,
  description,
  action = null,
  tabs = null,
  activeTab = null,
  onTabChange,
  legend = null,
  loading = false,
  empty = false,
  skeletonVariant = 'list',
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction = null,
  footer = null,
  children,
  className,
}) {
  return (
    <section
      aria-busy={loading}
      aria-label={title}
      className={cx('card flex flex-col p-5 sm:p-6', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-muted sm:text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
        {legend && legend.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            {legend.map((entry) => (
              <li key={entry.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.label}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {tabs && tabs.length > 0 ? (
        <div className="-mx-1 mt-3 flex items-center gap-6 border-b border-line-soft px-1">
          {tabs.map((tab) => {
            const active = tab.value === activeTab;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => onTabChange(tab.value)}
                className={cx(
                  '-mb-px border-b-2 pb-2.5 text-sm font-semibold transition',
                  active
                    ? 'border-primary-500 text-ink'
                    : 'border-transparent text-ink-faint hover:text-ink-soft',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 flex-1">
        {loading ? (
          <SkeletonBlock variant={skeletonVariant} />
        ) : empty ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
            compact={skeletonVariant === 'list'}
          />
        ) : (
          children
        )}
      </div>

      {footer && !loading && !empty ? (
        <div className="mt-5 border-t border-line-soft pt-4">{footer}</div>
      ) : null}
    </section>
  );
}
