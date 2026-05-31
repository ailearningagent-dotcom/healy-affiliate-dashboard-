import { DashboardSkeleton } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div className="p-4 lg:p-0">
      <DashboardSkeleton />
    </div>
  );
}
