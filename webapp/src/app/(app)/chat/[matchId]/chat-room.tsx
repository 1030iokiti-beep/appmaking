"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { BlockSheet, ReportSheet } from "@/components/discover/safety-actions";
import { IconChevronLeft, IconImage, IconMore, IconSend, IconShield } from "@/components/icons";
import { Avatar, useSignedUrls } from "@/components/photo";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { ErrorState, PageLoading, Spinner } from "@/components/ui/feedback";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { processImage, randomName } from "@/lib/image";
import { createClient, subscribeAuthed } from "@/lib/supabase/client";
import type { Message, ProfileCard } from "@/lib/types";
import { chatTime, cn, errorMessage } from "@/lib/utils";

const PAGE = 50;

export function ChatRoom({ matchId }: { matchId: string }) {
  const { userId, status, refresh } = useMe();
  const router = useRouter();
  const toast = useToast();
  const [partner, setPartner] = useState<ProfileCard | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState<null | "menu" | "report" | "block" | "unmatch">(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stick = useRef(true);

  const supabase = createClient();

  const markRead = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const { data } = await createClient().rpc("mark_messages_read", { p_match: matchId });
    if (data) refresh();
  }, [matchId, refresh]);

  // 初回読み込み
  useEffect(() => {
    let alive = true;
    (async () => {
      const db = createClient();
      const { data: m, error: me } = await db.from("matches").select("user_a, user_b").eq("id", matchId).maybeSingle();
      if (!alive) return;
      if (me || !m) return setError("このトークは表示できません（マッチングが解除された可能性があります）");
      const partnerId = m.user_a === userId ? m.user_b : m.user_a;
      const [p, msgs] = await Promise.all([
        db.rpc("get_profile_detail", { p_user: partnerId }),
        db.from("messages").select("*").eq("match_id", matchId).order("id", { ascending: false }).limit(PAGE),
      ]);
      if (!alive) return;
      if (msgs.error) return setError(errorMessage(msgs.error));
      setPartner(((p.data as unknown as ProfileCard[]) ?? [])[0] ?? null);
      setMessages((msgs.data ?? []).reverse());
      setHasOlder((msgs.data?.length ?? 0) === PAGE);
      markRead();
    })();
    return () => {
      alive = false;
    };
  }, [matchId, userId, markRead]);

  // リアルタイム受信（新着・既読）
  useEffect(() => {
    const db = createClient();
    const ch = db
      .channel(`chat:${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => (prev?.some((x) => x.id === msg.id) ? prev : [...(prev ?? []), msg]));
        if (msg.sender_id !== userId) markRead();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => prev?.map((x) => (x.id === msg.id ? { ...x, read_at: msg.read_at } : x)) ?? prev);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "matches" }, () => {
        toast("マッチングが解除されました");
        router.replace("/messages");
      });
    const unsubscribe = subscribeAuthed(ch);
    const onVisible = () => markRead();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [matchId, userId, markRead, router, toast]);

  // 最下部に追従
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    if (!messages?.length) return;
    const el = listRef.current;
    const before = el?.scrollHeight ?? 0;
    // id は送信順に増えるので、同じ時刻のメッセージでも順序が崩れない
    const { data } = await supabase.from("messages").select("*").eq("match_id", matchId).lt("id", messages[0].id)
      .order("id", { ascending: false }).limit(PAGE);
    stick.current = false;
    setMessages((prev) => [...(data ?? []).reverse(), ...(prev ?? [])]);
    setHasOlder((data?.length ?? 0) === PAGE);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - before;
    });
  }

  async function send(payload: { body?: string; image_path?: string }) {
    stick.current = true;
    const { data, error } = await supabase.from("messages").insert({ match_id: matchId, sender_id: userId, ...payload }).select().single();
    if (error) throw error;
    setMessages((prev) => (prev?.some((x) => x.id === data.id) ? prev : [...(prev ?? []), data]));
  }

  async function sendText() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await send({ body });
      setText("");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
    setSending(false);
  }

  async function sendImage(file: File | undefined) {
    if (!file) return;
    setSending(true);
    try {
      const blob = await processImage(file, 1280, 0.8);
      const path = `${matchId}/${randomName()}`;
      const up = await supabase.storage.from("chat-images").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      await send({ image_path: path });
    } catch (e) {
      toast(errorMessage(e), "error");
    }
    setSending(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function unmatch() {
    const { error } = await supabase.rpc("unmatch", { p_match: matchId });
    if (error) return toast(errorMessage(error), "error");
    toast("マッチングを解除しました");
    router.replace("/messages");
  }

  if (error) return <div className="pt-6"><ErrorState message={error} /><div className="mt-4 text-center"><Link href="/messages" className="text-sm font-bold text-brand">メッセージ一覧へ</Link></div></div>;
  if (!messages) return <PageLoading />;

  const lastReadMine = [...messages].reverse().find((m) => m.sender_id === userId && m.read_at)?.id;
  const canSend = status.can_send_message;

  return (
    <div className="-mx-4 flex h-dvh flex-col bg-canvas sm:-mx-6 lg:mx-0 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:rounded-[var(--radius-card)] lg:bg-surface lg:shadow-[var(--shadow-card)]">
      <header className="flex items-center gap-2 border-b border-line bg-surface/90 px-2 py-2 backdrop-blur">
        <IconButton label="戻る" onClick={() => router.push("/messages")} className="text-xl"><IconChevronLeft /></IconButton>
        {partner ? (
          <Link href={`/users/${partner.user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar path={partner.photos[0]} name={partner.display_name} size={38} />
            <div className="min-w-0">
              <p className="truncate font-bold">{partner.display_name}<span className="ml-1 text-sm font-normal text-sub">{partner.age}</span></p>
              <p className="text-[11px] text-mute">{partner.last_active === "online" ? "🟢 オンライン" : "AI相性 " + partner.score + "%"}</p>
            </div>
          </Link>
        ) : <div className="flex-1" />}
        <IconButton label="メニュー" onClick={() => setMenu("menu")} className="text-xl"><IconMore /></IconButton>
      </header>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4" onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}>
        {hasOlder && <button onClick={loadOlder} className="mx-auto mb-2 block rounded-full bg-soft px-4 py-1.5 text-xs font-bold text-sub">以前のメッセージ</button>}
        <div className="mx-auto mb-4 max-w-xs rounded-2xl bg-gold-soft px-4 py-3 text-center text-[11px] leading-relaxed text-sub">
          <IconShield className="mr-1 inline" />連絡先の交換・金銭の要求・外部サイトへの誘導は禁止です。困ったときは右上のメニューから通報できます。
        </div>
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-sub">🎉 マッチングしました！<br />最初のメッセージを送ってみましょう</p>
        )}
        <Messages messages={messages} userId={userId} lastReadMine={lastReadMine} />
      </div>

      {canSend ? (
        <form
          className="flex items-end gap-2 border-t border-line bg-surface px-3 py-3 pb-safe"
          onSubmit={(e) => {
            e.preventDefault();
            sendText();
          }}
        >
          <IconButton type="button" label="画像を送る" onClick={() => fileRef.current?.click()} disabled={sending} className="text-xl"><IconImage /></IconButton>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => sendImage(e.target.files?.[0])} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(min-width: 1024px)").matches) {
                e.preventDefault();
                sendText();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="メッセージを入力"
            aria-label="メッセージ"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl bg-soft px-4 py-2.5 text-[15px] focus:ring-2 focus:ring-brand/40 focus:outline-none"
          />
          <button type="submit" aria-label="送信" disabled={!text.trim() || sending} className="brand-gradient grid size-11 shrink-0 place-items-center rounded-full text-lg text-white transition active:scale-90 disabled:opacity-40">
            {sending ? <Spinner className="size-4" /> : <IconSend />}
          </button>
        </form>
      ) : (
        <div className="space-y-3 border-t border-line bg-surface p-4 pb-safe text-center">
          <p className="text-sm text-sub">
            {status.verification_status === "pending" ? "年齢確認を審査中です。完了するとメッセージを送れます。" : "メッセージを送るには年齢確認が必要です（法律で義務付けられています）。"}
          </p>
          {status.verification_status !== "pending" && <ButtonLink href="/verify" block>年齢確認をする</ButtonLink>}
        </div>
      )}

      <Sheet open={menu === "menu"} onClose={() => setMenu(null)}>
        <div className="space-y-1">
          {partner && <Link href={`/users/${partner.user_id}`} className="block rounded-2xl px-4 py-3 font-bold hover:bg-soft">プロフィールを見る</Link>}
          <button className="w-full rounded-2xl px-4 py-3 text-left font-bold hover:bg-soft" onClick={() => setMenu("report")}>通報する</button>
          <button className="w-full rounded-2xl px-4 py-3 text-left font-bold hover:bg-soft" onClick={() => setMenu("unmatch")}>マッチングを解除</button>
          <button className="w-full rounded-2xl px-4 py-3 text-left font-bold text-danger hover:bg-soft" onClick={() => setMenu("block")}>ブロックする</button>
        </div>
      </Sheet>
      <Sheet open={menu === "unmatch"} onClose={() => setMenu(null)} title="マッチングを解除しますか？">
        <p className="text-sm text-sub">メッセージはすべて削除され、元に戻せません。</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setMenu(null)}>キャンセル</Button>
          <Button variant="danger" onClick={unmatch}>解除する</Button>
        </div>
      </Sheet>
      {partner?.user_id && (
        <>
          <ReportSheet open={menu === "report"} onClose={() => setMenu(null)} userId={userId} targetId={partner.user_id} targetName={partner.display_name} onBlocked={() => router.replace("/messages")} />
          <BlockSheet open={menu === "block"} onClose={() => setMenu(null)} userId={userId} targetId={partner.user_id} targetName={partner.display_name} onBlocked={() => router.replace("/messages")} />
        </>
      )}
    </div>
  );
}

function Messages({ messages, userId, lastReadMine }: { messages: Message[]; userId: string; lastReadMine?: number }) {
  const imagePaths = messages.filter((m) => m.image_path).map((m) => m.image_path!);
  const urls = useSignedUrls("chat-images", imagePaths);
  const urlOf = (p: string) => urls[imagePaths.indexOf(p)];
  return (
    <>
      {messages.map((m, i) => {
        const mine = m.sender_id === userId;
        const showTime = i === messages.length - 1 || messages[i + 1].sender_id !== m.sender_id
          || new Date(messages[i + 1].created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60_000;
        return (
          <div key={m.id} className={cn("flex animate-fade-up flex-col", mine ? "items-end" : "items-start")}>
            {m.image_path ? (
              <a href={urlOf(m.image_path) ?? undefined} target="_blank" rel="noopener noreferrer" className="block max-w-[70%] overflow-hidden rounded-3xl bg-soft">
                {urlOf(m.image_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlOf(m.image_path)!} alt="送信された画像" className="max-h-72 w-full object-cover" />
                ) : <div className="skeleton h-48 w-48" />}
              </a>
            ) : (
              <p className={cn("max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap", mine ? "brand-gradient rounded-br-lg text-white" : "rounded-bl-lg bg-surface shadow-sm ring-1 ring-line/60")}>
                {m.body}
              </p>
            )}
            {(showTime || (mine && m.id === lastReadMine)) && (
              <span className="mt-1 px-1 text-[10px] text-mute">
                {mine && m.id === lastReadMine && <span className="mr-1 font-bold text-brand">既読</span>}
                {chatTime(m.created_at)}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
