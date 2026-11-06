import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { cx } from '../../lib/cx.js';

function initialsOf(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'S';
}

export default function TopBar({ onMenuOpen, title }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Open navigation"
        className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink-muted transition hover:bg-surface-muted hover:text-ink"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      <h1 className="truncate text-base font-semibold tracking-tight text-ink">{title}</h1>

      <Link
        to="/settings"
        aria-label="Open your profile settings"
        className={cx(
          'ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700',
          'ring-2 ring-primary-200 transition hover:bg-primary-200',
        )}
      >
        {initialsOf(user?.name)}
      </Link>
    </header>
  );
}
