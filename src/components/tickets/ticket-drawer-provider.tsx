"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { TicketDrawer } from "./ticket-drawer";

const Ctx = createContext<(id: string) => void>(() => {});

/** One ticket drawer for the whole app: open it from rows, menus or ⌘K. */
export function TicketDrawerProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const open = useCallback((ticketId: string) => setId(ticketId), []);
  const value = useMemo(() => open, [open]);
  return (
    <Ctx value={value}>
      {children}
      <TicketDrawer ticketId={id} onClose={() => setId(null)} />
    </Ctx>
  );
}

export const useOpenTicket = () => useContext(Ctx);
