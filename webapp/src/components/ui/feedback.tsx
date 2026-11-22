import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-5 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoading({ label = "読み込み中" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-brand" role="status">
      <Spinner className="size-7" />
      <span className="text-xs text-mute">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex animate-fade-up flex-col items-center rounded-[var(--radius-card)] bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand-soft text-3xl">{icon}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {children && <p className="mt-2 max-w-xs text-sm leading-relaxed text-sub">{children}</p>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-surface px-6 py-10 text-center shadow-[var(--shadow-card)]" role="alert">
      <div className="mb-3 text-3xl">⚠️</div>
      <p className="text-sm text-sub">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 rounded-full px-4 py-2 text-sm font-bold text-brand hover:bg-brand-soft">
          再読み込み
        </button>
      )}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "bg-brand-soft/60 text-ink ring-brand/15",
    warn: "bg-gold-soft text-ink ring-gold/25",
    error: "bg-danger/8 text-danger ring-danger/20",
    success: "bg-success/10 text-success ring-success/20",
  };
  return (
    <div className={cn("rounded-2xl px-4 py-3 text-[13px] leading-relaxed ring-1", tones[tone])} role={tone === "error" ? "alert" : undefined}>
      {children}
    </div>
  );
}
