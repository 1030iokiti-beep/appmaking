"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { MatchModal, type MatchInfo } from "@/components/discover/match-modal";
import { PhotoCarousel } from "@/components/discover/photo-carousel";
import { BlockSheet, ReportSheet } from "@/components/discover/safety-actions";
import { IconChat, IconChevronLeft, IconHeartFill, IconMore, IconPin, IconShield } from "@/components/icons";
import { ScoreRing, TypeBadge } from "@/components/love-type";
import { Button, IconButton } from "@/components/ui/button";
import { ErrorState, PageLoading } from "@/components/ui/feedback";
import { Card } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { genderLabel, LAST_ACTIVE_LABEL } from "@/lib/constants";
import { bestMatchCode, loveType, VALUE_QUESTIONS, valueLabel } from "@/lib/diagnosis";
import { createClient } from "@/lib/supabase/client";
import type { ProfileCard } from "@/lib/types";
import { useMyProfile } from "@/lib/use-my-profile";
import { cn, errorMessage } from "@/lib/utils";

export function ProfileDetail({ id }: { id: string }) {
  const { userId, refresh } = useMe();
  const me = useMyProfile(userId);
  const router = useRouter();
  const toast = useToast();
  const [card, setCard] = useState<ProfileCard | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [block, setBlock] = useState(false);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const isMe = id === userId;

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("get_profile_detail", { p_user: id });
    if (error) return setError(errorMessage(error));
    setCard(((data as unknown as ProfileCard[]) ?? [])[0] ?? null);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function toggleLike() {
    if (!card) return;
    setBusy(true);
    const supabase = createClient();
    if (card.liked) {
      const { error } = await supabase.from("likes").delete().eq("from_user", userId).eq("to_user", id);
      if (error) toast(errorMessage(error), "error");
      else toast("いいねを取り消しました");
    } else {
      const { error } = await supabase.from("likes").insert({ from_user: userId, to_user: id });
      if (error) toast(errorMessage(error), "error");
      else {
        const [a, b] = [userId, id].sort();
        const { data: m } = await supabase.from("matches").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
        if (m) setMatch({ matchId: m.id, name: card.display_name ?? "", partnerPhoto: card.photos[0] ?? null, myPhoto: me?.photo ?? null, myName: me?.profile.display_name ?? "", score: card.score });
        else toast("いいねしました 💗", "success");
      }
    }
    setBusy(false);
    await load();
    refresh();
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (card === undefined) return <PageLoading />;
  if (card === null)
    return <ErrorState message="このユーザーは表示できません（退会・非表示・ブロックなどの可能性があります）" />;

  const t = loveType(card.love_type);
  const myHobbies = me?.profile.hobbies ?? [];
  const myValues = (me?.profile.value_answers ?? {}) as Record<string, string>;
  const isBest = me?.profile.love_type && card.love_type === bestMatchCode(me.profile.love_type);

  return (
    <div className="mx-auto max-w-2xl pb-28 lg:pb-0">
      <div className="mb-3 flex items-center justify-between">
        <IconButton label="戻る" onClick={() => router.back()} className="text-xl"><IconChevronLeft /></IconButton>
        {!isMe && <IconButton label="メニュー" onClick={() => setMenu(true)} className="text-xl"><IconMore /></IconButton>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative">
          <PhotoCarousel photos={card.photos} name={card.display_name} className="aspect-[3/4] rounded-[2rem] text-7xl shadow-[var(--shadow-card)]" />
          {!isMe && <ScoreRing score={card.score} size={72} className="absolute -bottom-5 right-5" />}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge code={card.love_type} />
              {card.verified && <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success"><IconShield />本人確認済み</span>}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold">
              {card.display_name}<span className="ml-2 font-sans text-2xl font-medium text-sub">{card.age}歳</span>
            </h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sub">
              <span className="inline-flex items-center gap-1"><IconPin />{card.prefecture}{card.city && ` ${card.city}`}{card.distance && `（${card.distance}）`}</span>
              <span>{LAST_ACTIVE_LABEL[card.last_active]}</span>
            </p>
          </div>

          {!isMe && card.reasons.length > 0 && (
            <Card className="space-y-2 bg-gradient-to-br from-brand-soft to-gold-soft">
              <p className="text-xs font-bold tracking-widest text-brand-deep">✦ AIがおすすめする理由</p>
              <ul className="space-y-1.5 text-sm">
                {card.reasons.map((r) => <li key={r}>・{r}</li>)}
                {isBest && <li>・あなたと相性のいい恋愛タイプです</li>}
              </ul>
            </Card>
          )}

          {card.bio && (
            <section>
              <h2 className="mb-2 text-sm font-bold">自己紹介</h2>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{card.bio}</p>
            </section>
          )}

          {card.hobbies.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">趣味</h2>
              <div className="flex flex-wrap gap-2">
                {card.hobbies.map((h) => (
                  <span key={h} className={cn("rounded-full px-3 py-1.5 text-[13px]", myHobbies.includes(h) ? "bg-brand text-white" : "bg-surface ring-1 ring-line")}>
                    {myHobbies.includes(h) && "✓ "}{h}
                  </span>
                ))}
              </div>
            </section>
          )}

          {t && (
            <Card>
              <p className="text-xs text-sub">恋愛タイプ</p>
              <p className="mt-1 font-display text-lg font-bold">{t.emoji} {t.name}</p>
              <p className="mt-1 text-sm text-sub">「{t.catch}」{t.description}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 text-sm font-bold">価値観</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {VALUE_QUESTIONS.filter((q) => card.value_answers[q.key]).map((q) => {
                const same = myValues[q.key] && myValues[q.key] === card.value_answers[q.key];
                return (
                  <div key={q.key}>
                    <dt className="text-xs text-mute">{q.label}</dt>
                    <dd className={cn("font-medium", same && "text-brand-deep")}>{valueLabel(q.key, card.value_answers[q.key])}{same && " ✓"}</dd>
                  </div>
                );
              })}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold">基本情報</h2>
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <Info label="性別" value={genderLabel(card.gender)} />
              <Info label="年齢" value={`${card.age}歳`} />
              <Info label="居住地" value={card.prefecture} />
              {card.height && <Info label="身長" value={`${card.height}cm`} />}
              {card.occupation && <Info label="職業" value={card.occupation} />}
            </dl>
          </Card>
        </div>
      </div>

      {!isMe && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 lg:static lg:mt-8 lg:px-0">
          <div className="mx-auto max-w-md">
            {card.match_id ? (
              <Link href={`/chat/${card.match_id}`} className="brand-gradient flex h-14 items-center justify-center gap-2 rounded-full font-bold text-white shadow-[var(--shadow-float)]">
                <IconChat /> メッセージを送る
              </Link>
            ) : card.liked ? (
              <Button variant="secondary" size="lg" block onClick={toggleLike} loading={busy} className="h-14 shadow-[var(--shadow-card)]">いいね済み（取り消す）</Button>
            ) : (
              <Button size="lg" block onClick={toggleLike} loading={busy} className="h-14"><IconHeartFill /> いいね</Button>
            )}
          </div>
        </div>
      )}

      <Sheet open={menu} onClose={() => setMenu(false)}>
        <div className="space-y-2">
          <button className="w-full rounded-2xl px-4 py-3 text-left font-bold hover:bg-soft" onClick={() => { setMenu(false); setReport(true); }}>通報する</button>
          <button className="w-full rounded-2xl px-4 py-3 text-left font-bold text-danger hover:bg-soft" onClick={() => { setMenu(false); setBlock(true); }}>ブロックする</button>
        </div>
      </Sheet>
      <ReportSheet open={report} onClose={() => setReport(false)} userId={userId} targetId={id} targetName={card.display_name} onBlocked={() => router.replace("/home")} />
      <BlockSheet open={block} onClose={() => setBlock(false)} userId={userId} targetId={id} targetName={card.display_name} onBlocked={() => router.replace("/home")} />
      <MatchModal match={match} onClose={() => setMatch(null)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
