"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons/icon";
import { useT } from "./app-provider";

type Tone = "success" | "error" | "info" | "purchase";
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
  /** e.g. Undo. */
  action?: { label: string; onClick: () => void | Promise<unknown> };
}

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

const ICON: Record<Tone, IconName> = { success: "success", error: "warning", info: "info", purchase: "bag" };
const TONE = {
  success: "text-good",
  error: "text-bad",
  info: "text-info",
  purchase: "text-accent-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const t = useT();

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.action ? 8000 : toast.tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] lg:bottom-6 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:items-end"
      >
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className="glass pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-pop)]"
            >
              <span className={`mt-0.5 ${TONE[toast.tone]}`}>
                <Icon name={ICON[toast.tone]} size={20} duo />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-sm text-ink-2">{toast.description}</p>}
              </div>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    dismiss(toast.id);
                    void toast.action!.onClick();
                  }}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-accent-300 ring-1 ring-accent-500/30 transition hover:bg-accent-500/10 active:scale-95"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-ink-3 transition hover:bg-surface-3 hover:text-ink"
                aria-label={t("common.close")}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}

export const useToast = () => useContext(ToastContext);
