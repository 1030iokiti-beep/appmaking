"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { Avatar } from "@/components/photo";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { createClient, subscribeAuthed } from "@/lib/supabase/client";
import type { MatchRow } from "@/lib/types";
import { cn, errorMessage, relativeTime } from "@/lib/utils";

export default function MessagesPage() {
  const { userId } = useMe();
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("get_matches");
    if (error) return setError(errorMessage(error));
    setRows(data as unknown as MatchRow[]);
  }, []);

  useEffect(() => {
    load();
    // 新着メッセージ・既読の変化で一覧を更新（RLS により自分のマッチ分だけ届く）
    const supabase = createClient();
    const ch = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, load);
    const unsubscribe = subscribeAuthed(ch);
    return () => {
      unsubscribe();
    };
  }, [load]);

  const fresh = rows?.filter((r) => !r.last_message) ?? [];
  const talks = rows?.filter((r) => r.last_message) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">メッセージ</h1>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows ? (
        <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon="💬" title="メッセージはまだありません" action={<ButtonLink href="/home" block>おすすめを見る</ButtonLink>}>
          マッチングするとメッセージを送れるようになります。
        </EmptyState>
      ) : (
        <>
          {fresh.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-sub">新しいマッチ</h2>
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
                {fresh.map((m) => (
                  <Link key={m.match_id} href={`/chat/${m.match_id}`} className="flex w-18 shrink-0 flex-col items-center gap-1.5">
                    <Avatar path={m.card.photos[0]} name={m.card.display_name} size={68} ring />
                    <span className="w-full truncate text-center text-xs font-bold">{m.card.display_name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {talks.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
              {talks.map((m) => (
                <li key={m.match_id}>
                  <Link href={`/chat/${m.match_id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-soft/60">
                    <Avatar path={m.card.photos[0]} name={m.card.display_name} size={54} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-bold">{m.card.display_name}</span>
                        <span className="shrink-0 text-[11px] text-mute">{relativeTime(m.last_message_at)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className={cn("flex-1 truncate text-sm", m.unread ? "font-bold text-ink" : "text-sub")}>
                          {m.last_sender === userId && "あなた："}{m.last_message}
                        </p>
                        {m.unread > 0 && <span className="min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] leading-5 font-bold text-white">{m.unread}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
