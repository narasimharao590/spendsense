import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      aria-live={isError ? 'assertive' : 'polite'}
      className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-pop ${
        isError ? 'border-rose-200' : 'border-emerald-200'
      }`}
    >
      <span className={isError ? 'text-rose-600' : 'text-emerald-600'} aria-hidden="true">
        {isError ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
      </span>
      <p className="flex-1 text-sm leading-relaxed text-slate-700">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}
