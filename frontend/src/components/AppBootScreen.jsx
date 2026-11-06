import BrandMark from './layout/BrandMark.jsx';
import Skeleton from './ui/Skeleton.jsx';

export default function AppBootScreen() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <BrandMark />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (placeholder, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-72 rounded-2xl lg:col-span-3" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        </div>
      </div>
      <p className="sr-only" role="status">
        Loading SpendSense
      </p>
    </div>
  );
}
