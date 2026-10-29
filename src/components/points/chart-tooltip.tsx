"use client";

/** Glass tooltip shared by the Points charts (recharts `content`). */
export function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: { color: string; name: string; value: string }[];
}) {
  if (!active || !rows.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
      {label && <p className="mb-1 font-semibold text-ink">{label}</p>}
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2 text-ink-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: r.color }} />
          <span>{r.name}</span>
          <span className="tabular ms-auto ps-3 font-medium text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  );
}
