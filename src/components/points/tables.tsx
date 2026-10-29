import type { ReactNode, ThHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export function Table({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, end, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { end?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 z-[1] border-b border-line bg-surface-2 px-3 py-2.5 text-xs font-semibold text-ink-3 first:ps-5 last:pe-5",
        end ? "text-end" : "text-start",
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, end, children }: { className?: string; end?: boolean; children: ReactNode }) {
  return <td className={cn("border-b border-line px-3 py-3 first:ps-5 last:pe-5", end ? "text-end" : "text-start", className)}>{children}</td>;
}
