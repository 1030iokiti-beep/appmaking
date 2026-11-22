"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** ブラウザ用の Supabase クライアント（ログイン中のユーザーの権限で動く。RLSで保護） */
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return client;
}

/**
 * Realtime のチャンネルを「ログイン中ユーザーのトークン」で購読する。
 * cookie からのセッション復元より先に購読すると anon 扱いになり RLS で拒否されるため、必ずこれを使う
 */
export function subscribeAuthed(channel: ReturnType<ReturnType<typeof createClient>["channel"]>) {
  const supabase = createClient();
  let cancelled = false;
  supabase.auth.getSession().then(async ({ data }) => {
    if (cancelled) return;
    if (data.session) await supabase.realtime.setAuth(data.session.access_token);
    if (!cancelled) channel.subscribe();
  });
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
