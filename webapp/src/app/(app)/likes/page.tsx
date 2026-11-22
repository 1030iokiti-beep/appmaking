"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { GridCard, GridSkeleton } from "@/components/discover/grid-card";
import { IconCrown } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { LikeRow } from "@/lib/types";
import { errorMessage, relativeTime } from "@/lib/utils";

export default function LikesPage() {
  const { userId, refresh } = useMe();
  const toast = useToast();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<LikeRow[] | null>(null);
  const [sent, setSent] = useState<LikeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const [r, s] = await Promise.all([supabase.rpc("get_likes_received"), supabase.rpc("get_likes_sent")]);
    if (r.error || s.error) return setError(errorMessage(r.error ?? s.error));
    setReceived(r.data as unknown as LikeRow[]);
    setSent(s.data as unknown as LikeRow[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id: string) {
    const { error } = await createClient().from("likes").delete().eq("from_user", userId).eq("to_user", id);
    if (error) return toast(errorMessage(error), "error");
    toast("いいねを取り消しました");
    setSent((s) => s?.filter((x) => x.card.user_id !== id) ?? null);
    refresh();
  }

  const list = tab === "received" ? received : sent;
  const masked = tab === "received" && received?.some((r) => r.masked);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">いいね</h1>
      <Tabs
        id="likes"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "received", label: "もらったいいね", count: received?.length },
          { value: "sent", label: "送ったいいね" },
        ]}
      />

      {masked && (
        <Link href="/premium" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-ink p-5 text-white shadow-[var(--shadow-card)] transition hover:bg-black">
          <IconCrown className="shrink-0 text-2xl text-gold" />
          <div className="flex-1">
            <p className="font-bold text-gold-soft">{received!.length}人からいいねが届いています</p>
            <p className="text-xs text-white/70">プレミアムなら誰からのいいねかわかり、すぐにマッチできます</p>
          </div>
        </Link>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !list ? (
        <GridSkeleton />
      ) : list.length === 0 ? (
        tab === "received" ? (
          <EmptyState icon="💌" title="まだいいねは届いていません" action={<ButtonLink href="/me/edit" variant="secondary" block>プロフィールを充実させる</ButtonLink>}>
            写真を増やしたり、自己紹介を書くといいねが届きやすくなります。
          </EmptyState>
        ) : (
          <EmptyState icon="💗" title="まだいいねを送っていません" action={<ButtonLink href="/home" block>おすすめを見る</ButtonLink>}>
            気になる人にいいねを送ってみましょう。
          </EmptyState>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((row, i) => (
            <div key={row.card.user_id ?? `masked-${i}`} className="space-y-2">
              <GridCard
                card={row.card}
                locked={row.masked}
                href={row.masked ? "/premium" : `/users/${row.card.user_id}`}
                footer={<p className="mt-1 text-[10px] text-white/70">{relativeTime(row.liked_at)}</p>}
              />
              {tab === "sent" && !row.card.match_id && (
                <button onClick={() => cancel(row.card.user_id!)} className="w-full rounded-full py-1.5 text-xs font-bold text-sub ring-1 ring-line hover:bg-soft">
                  取り消す
                </button>
              )}
              {tab === "sent" && row.card.match_id && <p className="text-center text-xs font-bold text-brand">マッチング中</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
