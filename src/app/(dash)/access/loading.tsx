import { HeaderSkeleton, ListSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <HeaderSkeleton art />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <ListSkeleton rows={5} />
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
      </div>
      <Skeleton className="h-96 rounded-[var(--radius-card)]" />
    </div>
  );
}
