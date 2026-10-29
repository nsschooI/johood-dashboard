import { HeaderSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Shaped like the inbox: queue on one side, conversation on the other. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <div className="glass grid overflow-hidden rounded-[var(--radius-card)] lg:h-[calc(100dvh-13rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-2 border-line p-3 lg:border-e">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-3 px-2 py-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden space-y-5 p-6 lg:block">
          <Skeleton className="h-6 w-1/2" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className={`h-14 rounded-2xl ${i % 2 === 1 ? "w-1/2" : "w-2/3"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
