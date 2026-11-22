import { cn } from "@/lib/utils";

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("grid size-8 place-items-center rounded-xl text-base", light ? "bg-white/20" : "brand-gradient text-white")}>✦</span>
      <span className={cn("font-display text-xl font-bold tracking-wider whitespace-nowrap", light ? "text-white" : "text-ink")}>こいまち</span>
    </span>
  );
}
