import { HeaderSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Board tabs, period chips, podium and list. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <Skeleton className="mb-3 h-10 w-96 max-w-full rounded-xl" />
      <Skeleton className="mb-5 h-8 w-80 max-w-full rounded-full" />
      <Skeleton className="mb-5 h-64 rounded-[var(--radius-card)]" />
      <Skeleton className="h-80 rounded-[var(--radius-card)]" />
    </div>
  );
}
