import { ListChecks, TrendingUp, Wallet } from 'lucide-react';
import BrandMark from '../layout/BrandMark.jsx';

const FEATURES = [
  { icon: TrendingUp, text: 'A clear monthly view of income, expenses and savings rate' },
  { icon: Wallet, text: 'Per-category budgets with progress you can act on' },
  { icon: ListChecks, text: 'Log a transaction in seconds, search it later' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <main className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <BrandMark />

          <h1 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>

          <ul className="mt-5 space-y-2.5 border-y border-slate-100 py-5">
            {FEATURES.map((feature) => (
              <li key={feature.text} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">
                  <feature.icon size={14} aria-hidden="true" />
                </span>
                {feature.text}
              </li>
            ))}
          </ul>

          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">{footer}</p>
      </main>
    </div>
  );
}
