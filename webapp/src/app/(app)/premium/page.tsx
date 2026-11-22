"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { IconCheck, IconCrown } from "@/components/icons";
import { Alert } from "@/components/ui/feedback";
import { Card } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

const BENEFITS = [
  ["いいねしてくれた人がわかる", "誰からのいいねかがわかり、すぐにマッチングできます"],
  ["いいね 30回 → 300回／日", "気になる人に、もっとたくさんアプローチできます"],
  ["通知でも相手がわかる", "いいねの通知に相手の名前と写真が表示されます"],
];
const PLANS = [
  { months: 1, price: 3980, label: "1ヶ月" },
  { months: 3, price: 9800, label: "3ヶ月", note: "おすすめ" },
  { months: 6, price: 16800, label: "6ヶ月", note: "いちばんお得" },
];

export default function PremiumPage() {
  const { status } = useMe();
  const [until, setUntil] = useState<string | null>(null);
  useEffect(() => {
    createClient().from("subscriptions").select("current_period_end").maybeSingle().then(({ data }) => setUntil(data?.current_period_end ?? null));
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(150deg,#1f1a21,#4a2846_60%,#ad3754)] p-8 text-center text-white">
        <IconCrown className="mx-auto text-4xl text-gold" />
        <h1 className="mt-3 font-display text-3xl font-bold text-gold-soft">こいまち プレミアム</h1>
        <p className="mt-2 text-sm text-white/80">相性のいい人と、もっと早く出会える</p>
        {status.is_premium && until && (
          <p className="mt-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">ご利用中：{new Date(until).toLocaleDateString("ja-JP")}まで</p>
        )}
      </section>

      <Card className="space-y-4">
        {BENEFITS.map(([t, d]) => (
          <div key={t} className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold-soft text-gold"><IconCheck /></span>
            <div>
              <p className="font-bold">{t}</p>
              <p className="text-xs text-sub">{d}</p>
            </div>
          </div>
        ))}
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.months} className={`relative rounded-3xl bg-surface p-5 text-center shadow-[var(--shadow-card)] ${p.note === "おすすめ" ? "ring-2 ring-gold" : ""}`}>
            {p.note && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-white">{p.note}</span>}
            <p className="text-sm font-bold">{p.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">¥{p.price.toLocaleString()}</p>
            <p className="text-[11px] text-sub">月あたり ¥{Math.round(p.price / p.months).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <Alert tone="info">
        オンライン決済は現在準備中です（決済サービスとの連携後にご購入いただけるようになります）。キャンペーン等でプレミアムが付与された場合は、自動的に機能が有効になります。
      </Alert>
      <p className="text-xs leading-relaxed text-mute">表示価格は税込です。自動更新のサブスクリプションとして提供予定です。</p>
    </div>
  );
}
