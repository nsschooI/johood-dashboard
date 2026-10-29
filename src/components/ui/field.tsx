import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const base =
  "w-full rounded-xl bg-surface-2/70 px-3 text-sm text-ink ring-1 ring-inset ring-line-strong placeholder:text-ink-4 transition-[box-shadow,background-color] duration-[var(--dur-fast)] hover:ring-ink-4 focus:bg-surface focus:ring-2 focus:ring-accent-500/70 focus:outline-none disabled:opacity-50 aria-[invalid=true]:ring-bad/70";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode; trailing?: ReactNode }>(function Input(
  { className, leading, trailing, ...rest },
  ref,
) {
  if (!leading && !trailing) return <input ref={ref} className={cn(base, "h-10", className)} {...rest} />;
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-3">{leading}</span>}
      <input ref={ref} className={cn(base, "h-10", Boolean(leading) && "ps-9", Boolean(trailing) && "pe-10", className)} {...rest} />
      {trailing && <span className="absolute inset-y-0 end-2 flex items-center">{trailing}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(base, "min-h-20 resize-y py-2.5", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(base, "h-10 appearance-none bg-surface pe-9", className)} {...rest}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
      </svg>
    </div>
  );
});

export function Field({ label, hint, error, children, htmlFor, optional }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor: string; optional?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-xs font-semibold text-ink-2">
        {label}
        {optional && <span className="font-normal text-ink-3">{optional}</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-bad" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
