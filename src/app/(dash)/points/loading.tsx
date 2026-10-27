import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
        <SkeletonCard lines={8} />
      </div>
      <SkeletonCard lines={10} />
    </div>
  );
}
