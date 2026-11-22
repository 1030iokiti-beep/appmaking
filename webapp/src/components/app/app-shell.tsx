"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { IconBell, IconChat, IconCrown, IconHeart, IconHome, IconSearch, IconSettings, IconSpark, IconUser } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { createClient, subscribeAuthed } from "@/lib/supabase/client";
import type { MyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusContext } from "./status-context";

type NavItem = { href: string; label: string; icon: (p: { className?: string }) => ReactNode; badge?: keyof MyStatus };

// スマホ下部ナビ（5項目）
const MOBILE_NAV: NavItem[] = [
  { href: "/home", label: "ホーム", icon: IconHome },
  { href: "/likes", label: "いいね", icon: IconHeart, badge: "likes_received" },
  { href: "/matches", label: "マッチング", icon: IconSpark },
  { href: "/messages", label: "メッセージ", icon: IconChat, badge: "unread_messages" },
  { href: "/me", label: "マイページ", icon: IconUser },
];
// PCのサイドナビ
const DESKTOP_NAV: NavItem[] = [
  ...MOBILE_NAV.slice(0, 4),
  { href: "/search", label: "さがす", icon: IconSearch },
  { href: "/notifications", label: "通知", icon: IconBell, badge: "unread_notifications" },
  { href: "/me", label: "マイページ", icon: IconUser },
  { href: "/settings", label: "設定", icon: IconSettings },
];

function isActive(path: string, href: string) {
  if (href === "/messages") return path.startsWith("/messages") || path.startsWith("/chat");
  return path === href || path.startsWith(href + "/");
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] leading-[18px] font-bold text-white ring-2 ring-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AppShell({ userId, initialStatus, children }: { userId: string; initialStatus: MyStatus; children: ReactNode }) {
  const [status, setStatus] = useState(initialStatus);
  const path = usePathname();
  const router = useRouter();
  const toast = useToast();
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const refresh = useCallback(async () => {
    const { data } = await createClient().rpc("get_my_status").single();
    if (data) {
      setStatus(data);
      if (data.status === "suspended") router.replace("/suspended");
    }
  }, [router]);

  // 通知・メッセージをリアルタイムで受け取り、バッジを更新
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`shell:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as { type: string; body: string; match_id: string | null };
        refresh();
        const inThatChat = n.match_id && pathRef.current === `/chat/${n.match_id}`;
        if (!inThatChat) toast(n.type === "match" ? `🎉 ${n.body}` : n.type === "like" ? "💗 新しいいいねが届きました" : n.body);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => refresh());
    const unsubscribe = subscribeAuthed(channel);

    supabase.rpc("touch_last_seen");
    const t = setInterval(() => supabase.rpc("touch_last_seen"), 120_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe();
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, refresh, toast]);

  const hideMobileNav = path.startsWith("/chat/");

  return (
    <StatusContext value={{ userId, status, refresh }}>
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        {/* PC: サイドナビ */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
          <Link href="/home" className="mb-8 px-3"><Logo /></Link>
          <nav className="flex flex-1 flex-col gap-1" aria-label="メインメニュー">
            {DESKTOP_NAV.map((item) => {
              const active = isActive(path, item.href);
              const n = item.badge ? Number(status[item.badge] ?? 0) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] transition",
                    active ? "bg-surface font-bold text-ink shadow-[var(--shadow-card)]" : "text-sub hover:bg-surface/70 hover:text-ink",
                  )}
                >
                  <span className={cn("relative text-xl", active && "text-brand")}>
                    <item.icon />
                    <Count n={n} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {!status.is_premium && (
            <Link href="/premium" className="mt-4 rounded-2xl bg-ink p-4 text-white transition hover:bg-black">
              <div className="flex items-center gap-2 text-sm font-bold text-gold-soft"><IconCrown /> プレミアム</div>
              <p className="mt-1 text-xs text-white/70">いいねした人が見える・いいね300回/日</p>
            </Link>
          )}
          {status.is_admin && (
            <Link href="/admin" className="mt-3 px-3 text-xs font-bold text-sub hover:text-ink">管理画面へ →</Link>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* スマホ: 上部バー */}
          {!hideMobileNav && (
            <header className="sticky top-0 z-30 flex items-center justify-between bg-canvas/85 px-4 py-3 backdrop-blur-md lg:hidden">
              <Link href="/home"><Logo /></Link>
              <div className="flex items-center gap-1">
                <Link href="/search" aria-label="さがす" className="grid size-10 place-items-center rounded-full text-xl text-sub hover:bg-soft"><IconSearch /></Link>
                <Link href="/notifications" aria-label="通知" className="relative grid size-10 place-items-center rounded-full text-xl text-sub hover:bg-soft">
                  <span className="relative"><IconBell /><Count n={status.unread_notifications} /></span>
                </Link>
              </div>
            </header>
          )}

          <main className={cn("flex-1 px-4 pt-2 sm:px-6 lg:px-10 lg:py-8", hideMobileNav ? "pb-0" : "pb-28 lg:pb-8")}>{children}</main>

          {/* スマホ: 下部ナビ */}
          {!hideMobileNav && (
            <nav
              className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 pb-safe backdrop-blur-lg lg:hidden"
              aria-label="メインメニュー"
            >
              <ul className="mx-auto grid max-w-lg grid-cols-5">
                {MOBILE_NAV.map((item) => {
                  const active = isActive(path, item.href);
                  const n = item.badge ? Number(status[item.badge] ?? 0) : 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition", active ? "text-brand" : "text-mute")}
                      >
                        <span className={cn("relative text-[22px] transition", active && "scale-110")}>
                          <item.icon />
                          <Count n={n} />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </StatusContext>
  );
}
