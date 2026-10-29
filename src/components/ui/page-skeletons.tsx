import { Skeleton } from "./skeleton";

/** Building blocks for route loading states, shaped like the real pages. */
export function HeaderSkeleton({ art }: { art?: boolean }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      {art && <Skeleton className="hidden size-24 rounded-full sm:block" />}
      <div className="flex-1">
        <Skeleton className="mb-3 h-6 w-28 rounded-full" />
        <Skeleton className="mb-2 h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
    </div>
  );
}

export function TileSkeletons({ n = 4, className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" }: { n?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="glass space-y-4 rounded-[var(--radius-card)] p-5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 6, thumb = 40, className = "" }: { rows?: number; thumb?: number; className?: string }) {
  return (
    <div className={`glass space-y-1 rounded-[var(--radius-card)] p-3 ${className}`}>
      <div className="flex items-center gap-3 p-2 pb-4">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <Skeleton className="shrink-0 rounded-xl" style={{ width: thumb, height: thumb }} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}
