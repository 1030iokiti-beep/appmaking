"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarList, DailyBars } from "@/components/admin/charts";
import { ErrorState, PageLoading } from "@/components/ui/feedback";
import { Chip } from "@/components/ui/form";
import { genderLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn, errorMessage } from "@/lib/utils";

type Stats = Record<string, number> & { gender: Record<string, number>; age_groups: Record<string, number>; top_prefectures: { prefecture: string; count: number }[] };
type Daily = { day: string; signups: number; matches: number; likes: number; messages: number; active_users: number };

const AGE_ORDER = ["18-19", "20代", "30代", "40代", "50代以上"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<Daily[] | null>(null);
  const [days, setDays] = useState(30);
  const [table, setTable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [s, d] = await Promise.all([supabase.rpc("admin_stats"), supabase.rpc("admin_daily_stats", { p_days: days })]);
    if (s.error || d.error) return setError(errorMessage(s.error ?? d.error));
    setStats(s.data as unknown as Stats);
    setDaily(d.data);
  }, [days]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats || !daily) return <PageLoading />;

  const tiles: { label: string; value: number; href?: string; alert?: boolean }[] = [
    { label: "登録者数", value: stats.users_total, href: "/admin/users" },
    { label: "本日の新規登録", value: stats.users_today },
    { label: "本日のアクティブ", value: stats.active_today },
    { label: "7日間アクティブ", value: stats.active_7d },
    { label: "マッチング総数", value: stats.matches_total },
    { label: "本日のマッチング", value: stats.matches_today },
    { label: "本日のいいね", value: stats.likes_today },
    { label: "本日のメッセージ", value: stats.messages_today },
    { label: "未対応の通報", value: stats.reports_open, href: "/admin/reports", alert: stats.reports_open > 0 },
    { label: "年齢確認 審査待ち", value: stats.verifications_pending, href: "/admin/verifications", alert: stats.verifications_pending > 0 },
    { label: "プレミアム会員", value: stats.premium_active },
    { label: "利用停止中", value: stats.users_suspended },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold">ダッシュボード</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <div className={cn("rounded-3xl bg-surface p-4 shadow-[var(--shadow-card)] transition", t.href && "hover:-translate-y-0.5")}>
              <p className="text-xs text-sub">{t.label}</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums">{t.value.toLocaleString()}</p>
              {t.alert && <p className="mt-1 text-[11px] font-bold text-danger">⚠ 対応が必要です</p>}
            </div>
          );
          return t.href ? <Link key={t.label} href={t.href}>{body}</Link> : <div key={t.label}>{body}</div>;
        })}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-bold">日別の推移</h2>
          {[7, 30, 90].map((d) => <Chip key={d} selected={days === d} onClick={() => setDays(d)}>{d}日</Chip>)}
          <Chip selected={table} onClick={() => setTable(!table)}>表で見る</Chip>
        </div>
        {table ? (
          <div className="overflow-x-auto rounded-3xl bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-sub">
                <tr>{["日付", "新規登録", "アクティブ", "いいね", "マッチング", "メッセージ"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...daily].reverse().map((d) => (
                  <tr key={d.day}>
                    <td className="px-4 py-2">{d.day}</td><td className="px-4 py-2">{d.signups}</td><td className="px-4 py-2">{d.active_users}</td>
                    <td className="px-4 py-2">{d.likes}</td><td className="px-4 py-2">{d.matches}</td><td className="px-4 py-2">{d.messages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DailyBars title="新規登録" unit="人" data={daily.map((d) => ({ day: d.day, value: d.signups }))} />
            <DailyBars title="アクティブユーザー" unit="人" data={daily.map((d) => ({ day: d.day, value: d.active_users }))} />
            <DailyBars title="マッチング" data={daily.map((d) => ({ day: d.day, value: d.matches }))} />
            <DailyBars title="いいね" data={daily.map((d) => ({ day: d.day, value: d.likes }))} />
            <DailyBars title="メッセージ" data={daily.map((d) => ({ day: d.day, value: d.messages }))} />
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <BarList title="性別" rows={Object.entries(stats.gender).map(([k, v]) => ({ label: genderLabel(k), value: v }))} />
        <BarList title="年代" rows={AGE_ORDER.filter((a) => stats.age_groups[a]).map((a) => ({ label: a, value: stats.age_groups[a] }))} />
        <BarList title="居住地 上位5" rows={stats.top_prefectures.map((p) => ({ label: p.prefecture, value: p.count }))} />
      </section>
    </div>
  );
}
