"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { GridCard, GridSkeleton } from "@/components/discover/grid-card";
import { IconChat } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { MatchRow } from "@/lib/types";
import { errorMessage, relativeTime } from "@/lib/utils";

export default function MatchesPage() {
  const { refresh } = useMe();
  const toast = useToast();
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<MatchRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await createClient().rpc("get_matches");
    if (error) return setError(errorMessage(error));
    setRows(data as unknown as MatchRow[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function unmatch() {
    if (!target) return;
    setBusy(true);
    const { error } = await createClient().rpc("unmatch", { p_match: target.match_id });
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    toast("マッチングを解除しました");
    setRows((r) => r?.filter((x) => x.match_id !== target.match_id) ?? null);
    setTarget(null);
    refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">マッチング</h1>
        {rows && rows.length > 0 && <p className="mt-1 text-sm text-sub">{rows.length}人とマッチングしています</p>}
      </div>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows ? (
        <GridSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon="✨" title="まだマッチングしていません" action={<ButtonLink href="/home" block>おすすめを見る</ButtonLink>}>
          お互いにいいねするとマッチングが成立し、メッセージができるようになります。
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((m) => (
            <div key={m.match_id} className="space-y-2">
              <GridCard card={m.card} href={`/users/${m.card.user_id}`} footer={<p className="mt-1 text-[10px] text-white/70">{relativeTime(m.matched_at)}にマッチ</p>} />
              <div className="flex gap-2">
                <Link href={`/chat/${m.match_id}`} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-ink py-2 text-xs font-bold text-white">
                  <IconChat /> メッセージ
                </Link>
                <button onClick={() => setTarget(m)} className="rounded-full px-3 text-xs font-bold text-sub ring-1 ring-line hover:bg-soft">解除</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Sheet open={!!target} onClose={() => setTarget(null)} title="マッチングを解除しますか？">
        <p className="text-sm leading-relaxed text-sub">
          {target?.card.display_name}さんとのメッセージはすべて削除され、元に戻せません。お互いのおすすめにも表示されなくなります。
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setTarget(null)}>キャンセル</Button>
          <Button variant="danger" onClick={unmatch} loading={busy}>解除する</Button>
        </div>
      </Sheet>
    </div>
  );
}
