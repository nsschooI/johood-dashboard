"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGuild } from "@/components/providers/guild-provider";

/** Open a ticket from anywhere (rows, menus, ⌘K): it opens in the Tickets inbox. */
export function useOpenTicket() {
  const router = useRouter();
  const { href } = useGuild();
  return useCallback((id: string) => router.push(href("/tickets", { ticket: id })), [router, href]);
}
