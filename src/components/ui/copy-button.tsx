"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { useSound } from "@/components/providers/sound-provider";
import { cn } from "./cn";
import { Tooltip } from "./tooltip";

/** Copy an ID to the clipboard with a "Copied" confirmation. */
export function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const t = useT();
  const { play } = useSound();
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip content={copied ? t("common.copied") : (label ?? t("common.copy"))}>
      <button
        type="button"
        aria-label={label ?? t("common.copy")}
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            play("tick");
            setTimeout(() => setCopied(false), 1400);
          } catch {
            // clipboard blocked: nothing to do
          }
        }}
        className={cn("inline-grid size-6 place-items-center rounded-md text-ink-3 transition hover:bg-white/[0.08] hover:text-ink active:scale-90", className)}
      >
        {copied ? <Check aria-hidden className="size-3.5 text-good" /> : <Copy aria-hidden className="size-3.5" />}
      </button>
    </Tooltip>
  );
}
