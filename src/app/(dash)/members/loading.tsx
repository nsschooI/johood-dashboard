import { HeaderSkeleton, ListSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Directory + profile. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <Skeleton className="mb-5 h-10 w-64 rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <ListSkeleton rows={8} thumb={36} />
        <div className="space-y-4">
          <div className="glass overflow-hidden rounded-[var(--radius-card)]">
            <Skeleton className="h-28 rounded-none" />
            <div className="flex items-end gap-4 px-5 pb-5">
              <Skeleton className="-mt-10 size-24 rounded-full" />
              <Skeleton className="mb-2 h-6 w-48" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-[var(--radius-card)]" />
            <Skeleton className="h-28 rounded-[var(--radius-card)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
