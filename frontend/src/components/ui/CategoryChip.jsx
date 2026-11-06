import { categoryColor, readableInk } from '../../lib/colors.js';
import { cx } from '../../lib/cx.js';
import CategoryIcon from './CategoryIcon.jsx';

export default function CategoryChip({ category, className, size = 'md' }) {
  const color = categoryColor(category?.color);
  const ink = readableInk(color);
  const isSm = size === 'sm';

  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold shadow-sm',
        isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        className,
      )}
      style={{ backgroundColor: color, color: ink }}
    >
      <span className="flex shrink-0 items-center" aria-hidden="true">
        <CategoryIcon icon={category?.icon} size={isSm ? 11 : 13} />
      </span>
      <span className="truncate">{category?.name ?? 'Uncategorised'}</span>
    </span>
  );
}
