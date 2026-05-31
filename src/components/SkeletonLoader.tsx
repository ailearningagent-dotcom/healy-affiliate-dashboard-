import clsx from "clsx";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-lg bg-surface-200 dark:bg-surface-700 animate-pulse",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonBar className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-3 w-48" />
        </div>
      </div>
      <SkeletonBar className="h-3 w-full" />
      <SkeletonBar className="h-3 w-3/4" />
      <div className="flex gap-2 pt-2">
        <SkeletonBar className="h-8 w-20 rounded-lg" />
        <SkeletonBar className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBar className="h-3 w-20" />
              <SkeletonBar className="h-8 w-16" />
            </div>
            <SkeletonBar className="h-10 w-10 rounded-lg" />
          </div>
          <SkeletonBar className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-4"
        >
          <SkeletonBar className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="h-3 w-56" />
          </div>
          <SkeletonBar className="h-6 w-20 rounded-full" />
          <SkeletonBar className="h-6 w-12 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <SkeletonBar className="h-8 w-48" />
        <SkeletonBar className="h-4 w-72" />
      </div>
      <KPISkeleton />
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonBar className="h-5 w-32" />
          <SkeletonBar className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg border border-surface-200 dark:border-surface-700 p-3 space-y-2">
              <SkeletonBar className="h-7 w-7 rounded-md" />
              <SkeletonBar className="h-3 w-24" />
              <SkeletonBar className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SkeletonBar };
