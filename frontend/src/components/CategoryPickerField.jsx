import { CATEGORY_ICON_MAP } from '../lib/icons.js';
import { CATEGORY_COLOR_OPTIONS, categoryColor } from '../lib/colors.js';
import { cx } from '../lib/cx.js';

export default function CategoryPickerField({
  name,
  setName,
  type,
  setType,
  color,
  setColor,
  icon,
  setIcon,
  allowTypeChoice = false,
  errors = {},
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">
            Category name<span className="text-primary-600"> *</span>
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Groceries"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'category-name-error' : undefined}
            className={cx(
              'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:outline-none focus:ring-4',
              errors.name
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100',
            )}
          />
          {errors.name ? (
            <span id="category-name-error" role="alert" className="text-xs font-medium text-rose-600">
              {errors.name}
            </span>
          ) : null}
        </label>

        {allowTypeChoice ? (
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOR_OPTIONS.map((option) => {
            const active = categoryColor(color) === categoryColor(option.hex);
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => setColor(option.hex)}
                aria-label={option.name}
                aria-pressed={active}
                title={option.name}
                className={cx(
                  'h-8 w-8 rounded-full transition hover:scale-105',
                  active ? '' : 'ring-1 ring-slate-200',
                )}
                style={{
                  backgroundColor: option.hex,
                  boxShadow: active ? `0 0 0 2px #ffffff, 0 0 0 4px ${option.hex}` : undefined,
                }}
              />
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Icon</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_ICON_MAP).map(([slug, IconComponent]) => {
            const active = icon === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setIcon(slug)}
                aria-label={`Use ${slug} icon`}
                aria-pressed={active}
                className={cx(
                  'grid h-9 w-9 place-items-center rounded-xl border transition',
                  active
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                )}
              >
                <IconComponent size={16} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
