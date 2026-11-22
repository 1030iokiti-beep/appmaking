import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "white";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold tracking-wide transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 select-none";
const variants: Record<Variant, string> = {
  primary: "brand-gradient text-white shadow-[var(--shadow-float)] hover:brightness-105",
  secondary: "bg-surface text-ink ring-1 ring-line hover:bg-soft",
  ghost: "text-sub hover:bg-soft hover:text-ink",
  danger: "bg-danger text-white hover:brightness-110",
  gold: "bg-ink text-gold-soft hover:bg-black",
  white: "bg-white text-brand-deep hover:bg-white/90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px]",
};

type Common = { variant?: Variant; size?: Size; loading?: boolean; block?: boolean; children: ReactNode };

export function Button({ variant = "primary", size = "md", loading, block, className, children, disabled, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", block, className, children, ...rest }: Omit<Common, "loading"> & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], block && "w-full", className)} {...rest}>
      {children}
    </Link>
  );
}

export function IconButton({ className, label, children, ...rest }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn("inline-flex size-10 items-center justify-center rounded-full text-sub transition hover:bg-soft hover:text-ink active:scale-95", className)}
      {...rest}
    >
      {children}
    </button>
  );
}
