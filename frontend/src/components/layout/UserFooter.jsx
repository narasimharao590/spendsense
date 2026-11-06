import { ChevronRight, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { cx } from '../../lib/cx.js';

function initialsOf(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'S';
}

export default function UserFooter({ className, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    onNavigate?.();
    navigate('/login', { replace: true });
  }

  return (
    <div className={cx('rounded-2xl border border-line bg-surface p-3 shadow-sm', className)}>
      <Link
        to="/settings"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-primary-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 ring-2 ring-primary-200">
          {initialsOf(user?.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {user?.name ?? 'Account'}
          </span>
          <span className="block truncate text-xs text-ink-muted">{user?.email ?? ''}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink-muted transition hover:border-expense/30 hover:bg-expense-soft hover:text-expense"
      >
        <LogOut size={15} aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}
