"use client";

import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { IconChevronRight, IconHeartFill, IconPin, IconShield, IconUndo, IconX } from "@/components/icons";
import { ScoreRing, TypeBadge } from "@/components/love-type";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { LAST_ACTIVE_LABEL } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { ProfileCard } from "@/lib/types";
import { useMyProfile } from "@/lib/use-my-profile";
import { cn, errorMessage } from "@/lib/utils";
import { MatchModal, type MatchInfo } from "./match-modal";
import { PhotoCarousel } from "./photo-carousel";

type Action = { card: ProfileCard; kind: "like" | "pass" };

export function SwipeDeck() {
  const { userId, refresh } = useMe();
  const me = useMyProfile(userId);
  const toast = useToast();
  const [cards, setCards] = useState<ProfileCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Action[]>([]);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await createClient().rpc("get_recommendations", { p_limit: 20 });
    if (error) return setError(errorMessage(error));
    setCards(data as unknown as ProfileCard[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = useCallback(
    async (kind: "like" | "pass") => {
      const card = cards?.[0];
      if (!card?.user_id || busy.current) return;
      busy.current = true;
      setCards((c) => c?.slice(1) ?? null);
      const supabase = createClient();
      const { error } =
        kind === "like"
          ? await supabase.from("likes").insert({ from_user: userId, to_user: card.user_id })
          : await supabase.from("passes").insert({ from_user: userId, to_user: card.user_id });
      busy.current = false;

      if (error) {
        setCards((c) => [card, ...(c ?? [])]); // 失敗したらカードを戻す
        if (error.message.includes("上限")) toast("今日のいいねを使い切りました。プレミアムなら1日300回まで送れます", "error");
        else toast(errorMessage(error), "error");
        return;
      }
      setHistory((h) => [{ card, kind }, ...h].slice(0, 10));
      if (kind === "like") {
        const [a, b] = [userId, card.user_id].sort();
        const { data: m } = await supabase.from("matches").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
        if (m) {
          setMatch({ matchId: m.id, name: card.display_name ?? "", partnerPhoto: card.photos[0] ?? null, myPhoto: me?.photo ?? null, myName: me?.profile.display_name ?? "", score: card.score });
        }
        refresh();
      }
      if ((cards?.length ?? 0) <= 3) {
        const { data } = await supabase.rpc("get_recommendations", { p_limit: 20 });
        if (data) setCards((c) => {
          const seen = new Set((c ?? []).map((x) => x.user_id));
          return [...(c ?? []), ...(data as unknown as ProfileCard[]).filter((x) => !seen.has(x.user_id) && x.user_id !== card.user_id)];
        });
      }
    },
    [cards, userId, toast, refresh, me],
  );

  async function undo() {
    const last = history[0];
    if (!last?.card.user_id) return;
    const supabase = createClient();
    const { error } =
      last.kind === "like"
        ? await supabase.from("likes").delete().eq("from_user", userId).eq("to_user", last.card.user_id)
        : await supabase.from("passes").delete().eq("from_user", userId).eq("to_user", last.card.user_id);
    if (error) return toast(errorMessage(error), "error");
    setHistory((h) => h.slice(1));
    setCards((c) => [last.card, ...(c ?? [])]);
    refresh();
  }

  // PC: ← → キーで操作
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      if (e.key === "ArrowRight") act("like");
      if (e.key === "ArrowLeft") act("pass");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!cards) return <div className="skeleton mx-auto aspect-[3/4] w-full max-w-md rounded-[2rem]" />;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative aspect-[3/4] w-full">
        {cards.length === 0 ? (
          <EmptyState icon="🌙" title="今のおすすめは以上です" action={<ButtonLink href="/search" variant="secondary" block>条件を変えてさがす</ButtonLink>}>
            新しい人が登録されると、AIがまたおすすめします。年齢や距離の条件を広げると見つかりやすくなります。
          </EmptyState>
        ) : (
          cards.slice(0, 3).map((card, i) => (
            <SwipeCard key={card.user_id} card={card} depth={i} onSwipe={act} myHobbies={me?.profile.hobbies ?? []} />
          )).reverse()
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-5">
        <RoundButton label="ひとつ戻す" onClick={undo} disabled={!history.length} className="size-12 text-lg text-gold">
          <IconUndo />
        </RoundButton>
        <RoundButton label="スキップ" onClick={() => act("pass")} disabled={!cards.length} className="size-16 text-2xl text-sub">
          <IconX />
        </RoundButton>
        <RoundButton label="いいね" onClick={() => act("like")} disabled={!cards.length} className="brand-gradient size-20 text-3xl text-white shadow-[var(--shadow-float)]">
          <IconHeartFill />
        </RoundButton>
        {cards[0]?.user_id ? (
          <Link href={`/users/${cards[0].user_id}`} aria-label="プロフィールを見る" className="grid size-12 place-items-center rounded-full bg-surface text-lg text-sub shadow-[var(--shadow-card)] transition hover:text-ink active:scale-90">
            <IconChevronRight />
          </Link>
        ) : <span className="size-12" />}
      </div>
      <p className="mt-4 hidden text-center text-xs text-mute lg:block">キーボードの ← → でも操作できます</p>
      <MatchModal match={match} onClose={() => setMatch(null)} />
    </div>
  );
}

function RoundButton({ className, children, label, ...rest }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cn("grid place-items-center rounded-full bg-surface shadow-[var(--shadow-card)] transition hover:scale-105 active:scale-90 disabled:opacity-40", className)} {...rest}>
      {children}
    </button>
  );
}

function SwipeCard({ card, depth, onSwipe, myHobbies }: { card: ProfileCard; depth: number; onSwipe: (k: "like" | "pass") => void; myHobbies: string[] }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-14, 14]);
  const likeOpacity = useTransform(x, [30, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-130, -30], [1, 0]);
  const top = depth === 0;

  async function onDragEnd(_: unknown, info: PanInfo) {
    const go = Math.abs(info.offset.x) > 120 || Math.abs(info.velocity.x) > 600;
    if (!go) return animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    const dir = info.offset.x > 0 ? 1 : -1;
    await animate(x, dir * 600, { duration: 0.25 });
    onSwipe(dir > 0 ? "like" : "pass");
  }

  const common = card.hobbies.filter((h) => myHobbies.includes(h));

  return (
    <motion.article
      className="absolute inset-0 overflow-hidden rounded-[2rem] bg-surface shadow-[0_20px_50px_-20px_rgba(31,26,33,0.45)] select-none"
      style={{ x: top ? x : 0, rotate: top ? rotate : 0, zIndex: 10 - depth, touchAction: "pan-y" }}
      initial={{ scale: 1 - depth * 0.04, y: depth * 14, opacity: depth > 1 ? 0 : 1 }}
      animate={{ scale: 1 - depth * 0.04, y: depth * 14, opacity: depth > 1 ? 0 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      drag={top ? "x" : false}
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={top ? onDragEnd : undefined}
      aria-hidden={!top}
      aria-label={`${card.display_name}さん ${card.age}歳`}
    >
      <PhotoCarousel photos={card.photos} name={card.display_name} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {top && (
        <>
          <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute top-10 left-6 -rotate-12 rounded-xl border-4 border-[#4ade80] px-3 py-1 font-display text-3xl font-bold text-[#4ade80]">LIKE</motion.div>
          <motion.div style={{ opacity: nopeOpacity }} className="pointer-events-none absolute top-10 right-6 rotate-12 rounded-xl border-4 border-white px-3 py-1 font-display text-3xl font-bold text-white">NOPE</motion.div>
        </>
      )}

      <ScoreRing score={card.score} className="absolute top-6 right-5" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 space-y-2.5 p-6 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge code={card.love_type} light />
          {card.verified && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold backdrop-blur"><IconShield /> 本人確認済み</span>}
        </div>
        <h2 className="font-display text-3xl font-bold">
          {card.display_name}<span className="ml-2 font-sans text-2xl font-medium">{card.age}</span>
        </h2>
        <p className="flex items-center gap-3 text-[13px] text-white/90">
          <span className="inline-flex items-center gap-1"><IconPin />{card.distance ?? card.prefecture}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", card.last_active === "online" ? "bg-[#4ade80]" : card.last_active === "today" ? "bg-gold" : "bg-white/40")} />
            {LAST_ACTIVE_LABEL[card.last_active]}
          </span>
        </p>
        {card.reasons.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {card.reasons.map((r) => (
              <li key={r} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">✦ {r}</li>
            ))}
          </ul>
        )}
        {common.length === 0 && card.bio && <p className="line-clamp-2 text-[13px] leading-relaxed text-white/85">{card.bio}</p>}
      </div>
    </motion.article>
  );
}
