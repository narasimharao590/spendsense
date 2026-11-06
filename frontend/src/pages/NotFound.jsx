import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <main className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-600">
          <Compass size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          The link may be out of date. Head back to your monthly overview and keep going.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
