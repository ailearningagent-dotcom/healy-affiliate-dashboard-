import { CardSkeleton } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in p-4 lg:p-0">
      <div className="h-8 w-36 rounded-lg bg-surface-200 animate-pulse" />
      <div className="h-4 w-56 rounded-lg bg-surface-200 animate-pulse" />
      <div className="flex gap-2">
        <div className="h-10 w-40 rounded-lg bg-surface-200 animate-pulse" />
        <div className="h-10 w-40 rounded-lg bg-surface-200 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}
