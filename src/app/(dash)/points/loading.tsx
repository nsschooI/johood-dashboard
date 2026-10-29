import { HeaderSkeleton, ListSkeleton, TileSkeletons } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <HeaderSkeleton art />
      <TileSkeletons n={6} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
        <ListSkeleton rows={5} thumb={32} />
      </div>
    </div>
  );
}
