import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '../../lib/cx.js';

export default function ArrowLink({ to, children, className }) {
  return (
    <Link
      to={to}
      className={cx(
        'group inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-semibold text-primary-700 transition hover:text-primary-800',
        className,
      )}
    >
      {children}
      <ArrowRight
        size={15}
        aria-hidden="true"
        className="transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
