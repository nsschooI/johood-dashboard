import { HeaderSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-96 rounded-[var(--radius-card)]" />
        <div className="glass space-y-3 rounded-[var(--radius-card)] p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
