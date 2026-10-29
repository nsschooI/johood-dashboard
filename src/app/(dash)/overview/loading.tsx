import { HeaderSkeleton, ListSkeleton, TileSkeletons } from "@/components/ui/page-skeletons";

/** Shaped like the overview: greeting, four answer cards, live stream + queue. */
export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <HeaderSkeleton art />
      <TileSkeletons n={4} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ListSkeleton rows={8} />
        <div className="space-y-6">
          <ListSkeleton rows={3} thumb={34} />
          <ListSkeleton rows={3} thumb={34} />
        </div>
      </div>
    </div>
  );
}
