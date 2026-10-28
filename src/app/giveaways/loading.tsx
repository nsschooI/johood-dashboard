/** Skeleton while a giveaways page loads. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading giveaways · جارٍ تحميل السحوبات">
      <div className="gw-card space-y-3 p-6 sm:p-8">
        <div className="skeleton h-6 w-28 rounded-full" />
        <div className="skeleton h-10 w-2/3 max-w-sm" />
        <div className="skeleton h-4 w-full max-w-md" />
      </div>
      <div className="skeleton h-9 w-48 rounded-xl" />
      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="gw-card overflow-hidden">
            <div className="skeleton aspect-[16/7] w-full rounded-none" />
            <div className="space-y-3 p-5">
              <div className="skeleton h-6 w-3/4" />
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="skeleton size-9 rounded-xl" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="skeleton h-14 rounded-xl" />
                <div className="skeleton h-14 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
