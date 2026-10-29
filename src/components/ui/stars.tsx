import { Icon } from "@/components/icons/icon";

export function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" size={14} className={i < value ? "fill-current text-warn" : "text-ink-4"} />
      ))}
    </span>
  );
}
