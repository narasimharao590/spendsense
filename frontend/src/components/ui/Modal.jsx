import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/cx.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
};

export default function Modal({
  open,
  title,
  description,
  onClose,
  footer,
  children,
  size = 'md',
}) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    triggerRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableNodes = () =>
      panelRef.current
        ? Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
            (node) => node.getClientRects().length > 0 || node === document.activeElement,
          )
        : [];

    const autofocus = panelRef.current?.querySelector('[data-autofocus]');
    (autofocus ?? focusableNodes()[0] ?? panelRef.current)?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const nodes = focusableNodes();
      if (nodes.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;

      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') {
        trigger.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="animate-fade-in absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onCloseRef.current();
          }
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(
          'animate-panel-in relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-pop outline-none',
          'sm:rounded-card sm:border sm:border-line',
          SIZES[size] ?? SIZES.md,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            className="-m-1 rounded-lg p-1.5 text-ink-faint transition hover:bg-ink/5 hover:text-ink-soft"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
