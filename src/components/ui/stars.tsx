import { Star } from "lucide-react";

export function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden className={i < value ? "size-3.5 fill-warn text-warn" : "size-3.5 text-white/15"} />
      ))}
    </span>
  );
}
