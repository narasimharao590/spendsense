import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import BrandMark from './BrandMark.jsx';
import UserFooter from './UserFooter.jsx';
import { NavList } from './Sidebar.jsx';

export default function MobileDrawer({ open, onClose }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);

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
    panelRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
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
    <div className="fixed inset-0 z-50 lg:hidden">
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
        aria-label="Navigation menu"
        tabIndex={-1}
        className="animate-drawer-in absolute inset-y-0 left-0 flex w-[19rem] max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-line bg-canvas shadow-pop outline-none"
      >
        <div className="flex items-center justify-between px-4 pt-5">
          <BrandMark size="sm" />
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close navigation"
            className="-m-1 grid h-9 w-9 place-items-center rounded-xl text-ink-faint transition hover:bg-ink/5 hover:text-ink-soft"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <NavList onNavigate={() => onCloseRef.current()} className="flex-1 px-3" />

        <div className="px-3 pb-5">
          <UserFooter onNavigate={() => onCloseRef.current()} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
