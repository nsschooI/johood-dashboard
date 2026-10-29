import { HeaderSkeleton, ListSkeleton } from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <HeaderSkeleton art />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <ListSkeleton rows={9} />
        <ListSkeleton rows={9} thumb={32} />
      </div>
    </div>
  );
}
