import { NavLink } from 'react-router-dom';
import { cx } from '../../lib/cx.js';
import BrandMark from './BrandMark.jsx';
import UserFooter from './UserFooter.jsx';
import { NAV_GROUPS } from './navItems.js';

export function NavList({ onNavigate, className }) {
  return (
    <div className={cx('space-y-6', className)}>
      {NAV_GROUPS.map((group) => (
        <nav key={group.heading} aria-label={group.heading}>
          <p className="micro-label px-3 text-ink-faint">{group.heading}</p>
          <ul className="mt-2 space-y-1">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-ink-muted hover:bg-ink/5 hover:text-ink',
                    )
                  }
                >
                  <item.icon size={17} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>
  );
}

export default function Sidebar({ className }) {
  return (
    <aside
      className={cx(
        'sticky top-0 hidden h-screen w-full flex-col gap-7 border-r border-line bg-canvas px-4 py-5 lg:flex',
        className,
      )}
    >
      <div className="px-1">
        <BrandMark />
      </div>
      <NavList className="flex-1" />
      <UserFooter />
    </aside>
  );
}
