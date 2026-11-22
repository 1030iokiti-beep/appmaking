import Link from "next/link";
import type { ReactNode } from "react";
import { IconPin, IconShield } from "@/components/icons";
import { Photo } from "@/components/photo";
import { loveType } from "@/lib/diagnosis";
import type { ProfileCard } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 一覧用のプロフィールカード */
export function GridCard({ card, href, footer, locked, className }: { card: ProfileCard; href?: string | null; footer?: ReactNode; locked?: boolean; className?: string }) {
  const t = loveType(card.love_type);
  const body = (
    <div className={cn("group relative aspect-[3/4] overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-lg", className)}>
      {locked ? (
        <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-brand-soft via-soft to-gold-soft">
          <span className="text-5xl blur-[1px]">{t?.emoji ?? "💗"}</span>
          <span className="mt-2 text-xl">🔒</span>
        </div>
      ) : (
        <Photo path={card.photos[0]} name={card.display_name} alt={`${card.display_name}さん`} className="size-full text-5xl transition duration-500 group-hover:scale-[1.03]" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
      <span className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-brand-deep shadow">
        AI {card.score}%
      </span>
      {card.last_active === "online" && <span className="absolute top-3.5 left-3 size-2.5 rounded-full bg-[#4ade80] ring-2 ring-white" aria-label="オンライン" />}
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <p className="flex items-center gap-1 font-bold">
          <span className="truncate">{card.display_name ?? "？？？"}</span>
          <span className="font-normal">{card.age}</span>
          {card.verified && <IconShield className="shrink-0 text-xs" />}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/85">
          <IconPin className="shrink-0" />{card.distance ?? card.prefecture}
          {t && <span className="ml-1 truncate">・{t.emoji}{t.name}</span>}
        </p>
        {footer}
      </div>
    </div>
  );
  return href ? <Link href={href} prefetch={false}>{body}</Link> : body;
}

export function GridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-3xl" />)}
    </div>
  );
}
