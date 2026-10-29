import { HeaderSkeleton, TileSkeletons } from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-8">
      <HeaderSkeleton art />
      <TileSkeletons n={3} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />
      <TileSkeletons n={6} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" />
    </div>
  );
}
