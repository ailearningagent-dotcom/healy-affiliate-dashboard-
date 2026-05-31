import { CardSkeleton } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in p-4 lg:p-0">
      <div className="h-8 w-48 rounded-lg bg-surface-200 animate-pulse" />
      <div className="h-4 w-72 rounded-lg bg-surface-200 animate-pulse" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <CardSkeleton />
    </div>
  );
}
