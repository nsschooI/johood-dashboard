"use client";

import { Fragment } from "react";
import { useT } from "@/components/providers/app-provider";
import { Modal } from "@/components/ui/modal";
import type { MessageKey } from "@/lib/i18n";

const ROWS: { keys: string[][]; label: MessageKey }[] = [
  { keys: [["Ctrl", "K"], ["⌘", "K"]], label: "shortcuts.palette" },
  { keys: [["?"]], label: "shortcuts.help" },
  { keys: [["G", "O"]], label: "shortcuts.goOverview" },
  { keys: [["G", "P"]], label: "shortcuts.goPoints" },
  { keys: [["G", "M"]], label: "shortcuts.goMembers" },
  { keys: [["G", "A"]], label: "shortcuts.goAccess" },
  { keys: [["⇧", "G"]], label: "shortcuts.server" },
  { keys: [["N"]], label: "shortcuts.notifications" },
  { keys: [["⇧", "L"]], label: "shortcuts.language" },
  { keys: [["⇧", "S"]], label: "shortcuts.sound" },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t("shortcuts.title")}>
      <dl className="divide-y divide-line">
        {ROWS.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm text-ink-2">{t(r.label)}</dt>
            <dd className="flex items-center gap-2" dir="ltr">
              {r.keys.map((combo, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="text-xs text-ink-3">/</span>}
                  <span className="flex items-center gap-1">
                    {combo.map((k, j) => (
                      <Fragment key={k}>
                        {j > 0 && combo[0] === "G" && <span className="text-[10px] text-ink-3">{t("shortcuts.then")}</span>}
                        <kbd className="min-w-6 rounded-md bg-white/[0.07] px-1.5 py-0.5 text-center text-xs font-medium text-ink shadow-[inset_0_-1px_0_rgb(255_255_255/0.08)] ring-1 ring-line">{k}</kbd>
                      </Fragment>
                    ))}
                  </span>
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
