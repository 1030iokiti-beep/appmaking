"use client";

import Link from "next/link";
import { useMe } from "@/components/app/status-context";
import { IconBell, IconChevronRight, IconCrown, IconSearch, IconSettings, IconShield, IconSpark, IconUser } from "@/components/icons";
import { TypeBadge } from "@/components/love-type";
import { Avatar } from "@/components/photo";
import { Badge } from "@/components/ui/form";
import { PageLoading } from "@/components/ui/feedback";
import { useMyProfile } from "@/lib/use-my-profile";
import { ageOf, cn } from "@/lib/utils";

const VERIFY: Record<string, { label: string; tone: "success" | "gold" | "mute" | "brand" }> = {
  approved: { label: "年齢確認済み", tone: "success" },
  pending: { label: "審査中", tone: "gold" },
  rejected: { label: "要再提出", tone: "brand" },
  unverified: { label: "未提出", tone: "mute" },
};

export default function MyPage() {
  const { userId, status } = useMe();
  const me = useMyProfile(userId);
  if (!me) return <PageLoading />;
  const p = me.profile;
  const age = ageOf(p.birthdate);
  const v = VERIFY[p.verification_status] ?? VERIFY.unverified;
  // プロフィールの充実度
  const checks = [!!me.photo, !!p.bio, p.hobbies.length >= 3, !!p.love_type, Object.keys(p.value_answers as object).length >= 5, p.lat != null, p.verification_status === "approved"];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="brand-gradient relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[var(--shadow-float)]">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <Avatar path={me.photo} name={p.display_name} size={84} className="ring-4 ring-white/40" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold">{p.display_name}</h1>
            <p className="text-sm text-white/85">{age}歳・{p.prefecture}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <TypeBadge code={p.love_type} light />
              {status.is_premium && <span className="rounded-full bg-ink/40 px-2.5 py-1 text-[11px] font-bold text-gold-soft">👑 プレミアム</span>}
            </div>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="flex justify-between text-xs font-bold"><span>プロフィール充実度</span><span>{completeness}%</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${completeness}%` }} /></div>
        </div>
        <Link href={`/users/${userId}`} className="relative mt-4 inline-block text-xs font-bold text-white/90 underline underline-offset-4">他の人からの見え方を確認 →</Link>
      </section>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="今日のいいね残り" value={Math.max(0, status.likes_limit - status.likes_used)} />
        <Stat label="もらったいいね" value={status.likes_received} href="/likes" />
        <Stat label="未読メッセージ" value={status.unread_messages} href="/messages" />
      </div>

      {!status.is_premium && (
        <Link href="/premium" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-ink p-5 text-white shadow-[var(--shadow-card)] transition hover:bg-black">
          <IconCrown className="text-2xl text-gold" />
          <div className="flex-1">
            <p className="font-bold text-gold-soft">プレミアムで出会いを加速</p>
            <p className="text-xs text-white/70">いいねした人がわかる・いいね300回/日</p>
          </div>
          <IconChevronRight />
        </Link>
      )}

      <nav className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        <Row href="/me/edit" icon={<IconUser />} label="プロフィール編集" />
        <Row href="/diagnosis" icon={<IconSpark />} label="恋愛タイプ診断" value={p.love_type ? undefined : "未診断"} />
        <Row href="/verify" icon={<IconShield />} label="年齢確認" value={<Badge tone={v.tone}>{v.label}</Badge>} />
        <Row href="/search" icon={<IconSearch />} label="さがす" />
        <Row href="/notifications" icon={<IconBell />} label="通知" value={status.unread_notifications ? <Badge>{status.unread_notifications}</Badge> : undefined} />
        <Row href="/settings" icon={<IconSettings />} label="設定" />
      </nav>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <div className="rounded-3xl bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] text-sub">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Row({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 px-5 py-4 transition hover:bg-soft/60")}>
      <span className="text-lg text-sub">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      {value && <span className="text-sm text-sub">{value}</span>}
      <IconChevronRight className="text-mute" />
    </Link>
  );
}
