import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ToastStack from '../components/ToastStack.jsx';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4200;
const MAX_VISIBLE = 4;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const sequence = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, type, duration = DEFAULT_DURATION) => {
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) {
      return null;
    }

    sequence.current += 1;
    const id = sequence.current;
    setToasts((current) => [...current, { id, type, message: text, duration }].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const value = useMemo(
    () => ({
      success: (message, duration) => push(message, 'success', duration),
      error: (message, duration) => push(message, 'error', duration),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
