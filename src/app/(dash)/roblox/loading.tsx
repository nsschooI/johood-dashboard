import { HeaderSkeleton, ListSkeleton } from "@/components/ui/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Tabs, purpose line and a list of players. */
export default function Loading() {
  return (
    <div aria-busy="true">
      <HeaderSkeleton />
      <Skeleton className="mb-5 h-10 w-96 max-w-full rounded-xl" />
      <Skeleton className="mb-4 h-12 rounded-2xl" />
      <ListSkeleton rows={8} thumb={40} />
    </div>
  );
}
