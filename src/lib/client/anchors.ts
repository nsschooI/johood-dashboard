"use client";

import { useEffect } from "react";

/** DOM id for an attention target, e.g. "bot:ops" → "t-bot-ops". */
export const anchorId = (target: string) => `t-${target.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;

/** Scroll to an element and flash a ring around it. */
export function focusAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  el.classList.remove("anchor-flash");
  void el.offsetWidth;
  el.classList.add("anchor-flash");
  setTimeout(() => el.classList.remove("anchor-flash"), 1800);
  return true;
}

/** On load, jump to #t-… if the URL carries one (links from the attention strip / bell). */
export function useHashFocus() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith("t-")) return;
    const t = setTimeout(() => focusAnchor(id), 350);
    return () => clearTimeout(t);
  }, []);
}
