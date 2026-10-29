"use client";

import { Fragment } from "react";
import { useApp, useCan } from "@/components/providers/app-provider";
import { Modal } from "@/components/ui/modal";
import type { MessageKey } from "@/lib/i18n";
import { PAGE_ACCESS } from "@/lib/permissions";
import { NAV } from "./nav";

const ROWS: { keys: string[][]; label: MessageKey }[] = [
  { keys: [["Ctrl", "K"], ["⌘", "K"]], label: "shortcuts.palette" },
  { keys: [["?"]], label: "shortcuts.help" },
  { keys: [["⇧", "G"]], label: "shortcuts.server" },
  { keys: [["N"]], label: "shortcuts.notifications" },
  { keys: [["⇧", "L"]], label: "shortcuts.language" },
  { keys: [["⇧", "T"]], label: "shell.theme" },
  { keys: [["⇧", "S"]], label: "shortcuts.sound" },
];

function Keys({ combo }: { combo: string[] }) {
  const { t } = useApp();
  return (
    <span className="flex items-center gap-1">
      {combo.map((k, j) => (
        <Fragment key={k}>
          {j > 0 && combo[0] === "G" && <span className="text-[10px] text-ink-3">{t("shortcuts.then")}</span>}
          <kbd className="min-w-6 rounded-md bg-surface px-1.5 py-0.5 text-center text-xs font-semibold text-ink shadow-[0_1px_0_var(--color-line-strong)] ring-1 ring-line-strong">{k}</kbd>
        </Fragment>
      ))}
    </span>
  );
}

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useApp();
  const can = useCan();
  const pages = NAV.filter((n) => PAGE_ACCESS[n.key].length === 0 || PAGE_ACCESS[n.key].some((a) => can(a)));
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
                  <Keys combo={combo} />
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
        {pages.map((n) => (
          <div key={n.key} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm text-ink-2">{t(n.label)}</dt>
            <dd dir="ltr">
              <Keys combo={["G", n.shortcut.toUpperCase()]} />
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
