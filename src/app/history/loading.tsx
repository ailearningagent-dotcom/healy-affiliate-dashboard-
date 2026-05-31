import { TableSkeleton } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in p-4 lg:p-0">
      <div className="h-8 w-36 rounded-lg bg-surface-200 animate-pulse" />
      <div className="h-4 w-64 rounded-lg bg-surface-200 animate-pulse" />
      <TableSkeleton rows={8} />
    </div>
  );
}
