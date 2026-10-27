"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useT } from "@/components/providers/app-provider";
import { Button } from "./button";
import { cn } from "./cn";

/**
 * Accessible dialog built on <dialog>: native focus trap, Esc to close,
 * focus returns to the opener. `variant="drawer"` slides in from the
 * inline-end edge (right in LTR, left in RTL).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "center",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: "center" | "drawer";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = useT();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "glass m-0 max-h-[100dvh] bg-surface/95 p-0 text-ink backdrop:bg-transparent open:flex open:flex-col",
        variant === "center"
          ? "fixed inset-0 m-auto h-fit w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-card)] open:animate-fade-in"
          : "fixed inset-y-0 start-auto end-0 h-[100dvh] w-full max-w-xl rounded-none border-y-0 border-e-0 sm:rounded-s-[var(--radius-card)] open:animate-fade-in",
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description && <div className="mt-1 text-sm text-ink-3">{description}</div>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common.close")}>
          <X className="size-4" aria-hidden />
        </Button>
      </header>
      {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
      {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={body}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
