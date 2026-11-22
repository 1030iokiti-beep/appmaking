import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-2xl bg-surface px-4 py-3 text-[15px] text-ink ring-1 ring-line placeholder:text-mute transition focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:bg-soft disabled:text-sub";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-bold text-ink">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-mute">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 resize-y leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%236f6774%22 stroke-width=%221.6%22 fill=%22none%22/></svg>')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10", className)} {...rest}>
      {children}
    </select>
  );
}

/** 選択式のチップ（単一・複数どちらにも使える） */
export function Chip({ selected, children, className, ...rest }: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-full px-4 py-2 text-[13px] font-medium ring-1 transition active:scale-95",
        selected ? "bg-ink text-white ring-ink" : "bg-surface text-ink ring-line hover:ring-mute",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function Badge({ tone = "brand", children, className }: { tone?: "brand" | "gold" | "ink" | "success" | "mute"; children: ReactNode; className?: string }) {
  const tones = {
    brand: "bg-brand-soft text-brand-deep",
    gold: "bg-gold-soft text-gold",
    ink: "bg-ink text-white",
    success: "bg-success/10 text-success",
    mute: "bg-soft text-sub",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", tones[tone], className)}>{children}</span>;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50", checked ? "bg-brand" : "bg-line")}
    >
      <span className={cn("absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition", checked && "translate-x-5")} />
    </button>
  );
}
