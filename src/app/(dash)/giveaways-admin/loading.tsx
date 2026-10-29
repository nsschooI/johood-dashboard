import { HeaderSkeleton, TileSkeletons } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <HeaderSkeleton art />
      <TileSkeletons n={4} className="grid grid-cols-2 gap-4 xl:grid-cols-4" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="glass flex items-center gap-4 rounded-[var(--radius-card)] p-3">
          <Skeleton className="aspect-[16/9] w-44 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-14 w-72 rounded-xl sm:block" />
        </div>
      ))}
    </div>
  );
}
