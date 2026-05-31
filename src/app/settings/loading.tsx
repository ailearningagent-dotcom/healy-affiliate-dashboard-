import { CardSkeleton } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in p-4 lg:p-0">
      <div className="h-8 w-32 rounded-lg bg-surface-200 animate-pulse" />
      <div className="h-4 w-64 rounded-lg bg-surface-200 animate-pulse" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="lg:col-span-3">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
