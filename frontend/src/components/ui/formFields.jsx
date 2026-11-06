import { useId } from 'react';
import { cx } from '../../lib/cx.js';

const CONTROL_BASE =
  'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink transition placeholder:text-ink-faint focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-surface-muted';
const CONTROL_IDLE = 'border-line focus:border-primary-500 focus:ring-primary-100';
const CONTROL_INVALID = 'border-rose-400 focus:border-rose-500 focus:ring-rose-100';

function controlClass(error, className) {
  return cx(CONTROL_BASE, error ? CONTROL_INVALID : CONTROL_IDLE, className);
}

function Field({ label, htmlFor, hint, error, required, action, className, children }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink-soft">
          {label}
          {required ? <span className="text-primary-600"> *</span> : null}
        </label>
        {action ? <div className="text-xs">{action}</div> : null}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id, error, hint) {
  if (error) {
    return `${id}-error`;
  }
  return hint ? `${id}-hint` : undefined;
}

export function TextInput({
  label,
  hint,
  error,
  required = false,
  action = null,
  className,
  inputClassName,
  id: providedId,
  ...rest
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      action={action}
      className={className}
    >
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(error, inputClassName)}
        {...rest}
      />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  error,
  rows = 3,
  required = false,
  action = null,
  className,
  inputClassName,
  id: providedId,
  ...rest
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      action={action}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(error, cx('resize-none leading-relaxed', inputClassName))}
        {...rest}
      />
    </Field>
  );
}

export function SelectInput({
  label,
  hint,
  error,
  options = [],
  children,
  placeholder = null,
  required = false,
  action = null,
  className,
  inputClassName,
  id: providedId,
  ...rest
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      action={action}
      className={className}
    >
      <select
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(error, inputClassName)}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </Field>
  );
}

export function AmountInput({
  label = 'Amount',
  currency,
  hint,
  error,
  required = true,
  className,
  id: providedId,
  ...rest
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field label={`${label} (${currency})`} htmlFor={id} hint={hint} error={error} required={required}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={controlClass(error, 'money pr-16')}
          {...rest}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold tracking-wide text-ink-faint uppercase"
        >
          {currency}
        </span>
      </div>
    </Field>
  );
}
