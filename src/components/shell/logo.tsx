export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-accent-400 via-accent-500 to-blush text-sm font-bold text-white shadow-[0_6px_20px_-6px_rgb(176_110_242/0.8)]"
      >
        J
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-ink">JoHood</span>
          <span className="block text-[11px] text-ink-3">Dashboard</span>
        </span>
      )}
    </span>
  );
}
