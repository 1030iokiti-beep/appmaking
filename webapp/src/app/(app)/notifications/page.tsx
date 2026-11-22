"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { Avatar } from "@/components/photo";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { createClient, subscribeAuthed } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/types";
import { cn, errorMessage, relativeTime } from "@/lib/utils";

const ICON: Record<string, string> = { like: "💗", match: "🎉", message: "💬", system: "📣" };

function hrefOf(n: NotificationRow) {
  if (n.type === "match" || n.type === "message") return n.match_id ? `/chat/${n.match_id}` : "/messages";
  if (n.type === "like") return n.actor_id ? `/users/${n.actor_id}` : "/likes";
  return null;
}

export default function NotificationsPage() {
  const { userId, refresh } = useMe();
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("get_notifications", { p_limit: 80 });
    if (error) return setError(errorMessage(error));
    setRows(data);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const ch = supabase
      .channel("notifications-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, load);
    const unsubscribe = subscribeAuthed(ch);
    return () => {
      unsubscribe();
    };
  }, [load, userId]);

  async function readAll() {
    await createClient().rpc("mark_notifications_read", {});
    await load();
    refresh();
  }

  async function open(n: NotificationRow) {
    if (!n.read_at) {
      await createClient().rpc("mark_notifications_read", { p_ids: [n.id] });
      refresh();
    }
  }

  const unread = rows?.filter((r) => !r.read_at).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">通知</h1>
        {unread > 0 && <Button variant="ghost" size="sm" onClick={readAll}>すべて既読にする</Button>}
      </div>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows ? (
        <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon="🔔" title="通知はまだありません">いいねやマッチング、メッセージが届くとここに表示されます。</EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          {rows.map((n) => {
            const href = hrefOf(n);
            const inner = (
              <div className={cn("flex items-center gap-3 px-4 py-3.5 transition hover:bg-soft/60", !n.read_at && "bg-brand-soft/40")}>
                {n.actor_photo || n.actor_name ? (
                  <div className="relative">
                    <Avatar path={n.actor_photo} name={n.actor_name} size={46} />
                    <span className="absolute -right-1 -bottom-1 text-base">{ICON[n.type]}</span>
                  </div>
                ) : (
                  <div className="grid size-[46px] place-items-center rounded-full bg-soft text-xl">{ICON[n.type]}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-snug", !n.read_at && "font-bold")}>{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-mute">{relativeTime(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="未読" />}
              </div>
            );
            return (
              <li key={n.id}>
                {href ? <Link href={href} onClick={() => open(n)}>{inner}</Link> : <button className="block w-full text-left" onClick={() => open(n)}>{inner}</button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
