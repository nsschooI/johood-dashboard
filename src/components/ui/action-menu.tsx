"use client";

import { useCallback, type MouseEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { Button } from "./button";
import { MenuPopover, useMenu, type MenuSection } from "./menu";

/** "…" button that opens the actions available (and unavailable, with why). */
export function ActionMenuButton({ label, sections, size = "icon-sm" }: { label: string; sections: MenuSection[]; size?: "icon-sm" | "icon" }) {
  const t = useT();
  const menu = useMenu();
  return (
    <>
      <Button
        variant="ghost"
        size={size}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={t("menu.label", { name: label })}
        tip={t("menu.more")}
        onClick={(e) => {
          e.stopPropagation();
          menu.openFromButton(e.currentTarget);
        }}
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </Button>
      <MenuPopover anchor={menu.anchor} onClose={menu.close} sections={sections} label={t("menu.label", { name: label })} />
    </>
  );
}

/** Right-click (or Shift+F10 / context-menu key) on a row opens the same menu. */
export function useContextMenu(label: string, sections: MenuSection[]) {
  const t = useT();
  const menu = useMenu();
  const onContextMenu = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) menu.openFromButton(e.currentTarget);
      else menu.openAt(e.clientX, e.clientY);
    },
    [menu],
  );
  const popover = <MenuPopover anchor={menu.anchor} onClose={menu.close} sections={sections} label={t("menu.label", { name: label })} />;
  return { onContextMenu, popover };
}
