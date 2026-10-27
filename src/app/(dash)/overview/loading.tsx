import { Skeleton } from "@/components/ui/skeleton";

/** Shaped like the real page: header, attention strip, server card, cards grid, side column. */
export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div>
        <Skeleton className="mb-3 h-6 w-28 rounded-full" />
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
      <div className="glass overflow-hidden rounded-[var(--radius-card)]">
        <Skeleton className="h-28 rounded-none" />
        <div className="-mt-8 flex items-end gap-4 px-5">
          <Skeleton className="size-[72px] rounded-[26%]" />
          <Skeleton className="mb-2 h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[74px] rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="glass space-y-4 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-[42px] rounded-[30%]" />
                <Skeleton className="h-4 flex-1" />
              </div>
              <Skeleton className="h-10" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </div>
        <div className="glass space-y-3 rounded-[var(--radius-card)] p-5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
