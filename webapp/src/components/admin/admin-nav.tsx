"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSignOut } from "@/app/admin/actions";
import { IconChart, IconFlag, IconImage, IconLogout, IconShield, IconUsers } from "@/components/icons";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "ダッシュボード", icon: IconChart },
  { href: "/admin/users", label: "ユーザー", icon: IconUsers },
  { href: "/admin/reports", label: "通報", icon: IconFlag },
  { href: "/admin/verifications", label: "年齢確認", icon: IconShield },
  { href: "/admin/images", label: "画像審査", icon: IconImage },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 z-20 bg-ink text-white lg:h-dvh lg:w-60 lg:shrink-0">
      <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-6">
        <div>
          <p className="font-display text-lg font-bold">こいまち</p>
          <p className="text-[10px] font-bold tracking-[0.3em] text-gold">ADMIN</p>
        </div>
        <form action={adminSignOut} className="lg:hidden"><button className="text-xl text-white/70" aria-label="ログアウト"><IconLogout /></button></form>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
        {NAV.map((n) => {
          const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-white/12 font-bold text-white" : "text-white/65 hover:bg-white/8 hover:text-white")}>
              <n.icon className="text-base" />{n.label}
            </Link>
          );
        })}
      </nav>
      <form action={adminSignOut} className="absolute bottom-6 left-3 hidden lg:block">
        <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/65 hover:text-white"><IconLogout />ログアウト</button>
      </form>
    </aside>
  );
}
