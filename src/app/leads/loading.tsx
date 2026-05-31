import { CardSkeleton } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in p-4 lg:p-0">
      <div className="h-8 w-40 rounded-lg bg-surface-200 animate-pulse" />
      <div className="h-4 w-60 rounded-lg bg-surface-200 animate-pulse" />
      <div className="flex gap-2">
        <div className="h-10 w-28 rounded-lg bg-surface-200 animate-pulse" />
        <div className="h-10 w-36 rounded-lg bg-surface-200 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <CardSkeleton />
      </div>
    </div>
  );
}
