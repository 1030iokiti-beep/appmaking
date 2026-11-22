"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TypeBadge } from "@/components/love-type";
import { Photo } from "@/components/photo";
import { Button } from "@/components/ui/button";
import { Alert, ErrorState, PageLoading } from "@/components/ui/feedback";
import { Badge, Card, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { genderLabel, reportReasonLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileImage } from "@/lib/types";
import { errorMessage, relativeTime } from "@/lib/utils";

type User = { id: string; email: string; status: string; suspended_reason: string | null; created_at: string; last_seen_at: string };
type Report = { id: string; reason: string; detail: string; status: string; created_at: string; reporter_id: string | null; reported_id: string };

export function AdminUserDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<{
    user: User; profile: Profile | null; images: ProfileImage[]; reportsAgainst: Report[]; reportsBy: Report[];
    counts: { likesSent: number; likesReceived: number; matches: number; messages: number }; premiumUntil: string | null; isAdmin: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const db = createClient();
    const [u, p, img, ra, rb, ls, lr, m, msg, sub, adm] = await Promise.all([
      db.from("users").select("*").eq("id", id).maybeSingle(),
      db.from("profiles").select("*").eq("user_id", id).maybeSingle(),
      db.from("profile_images").select("*").eq("user_id", id).order("position"),
      db.from("reports").select("*").eq("reported_id", id).order("created_at", { ascending: false }),
      db.from("reports").select("*").eq("reporter_id", id).order("created_at", { ascending: false }),
      db.from("likes").select("*", { count: "exact", head: true }).eq("from_user", id),
      db.from("likes").select("*", { count: "exact", head: true }).eq("to_user", id),
      db.from("matches").select("*", { count: "exact", head: true }).or(`user_a.eq.${id},user_b.eq.${id}`),
      db.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", id),
      db.from("subscriptions").select("current_period_end").eq("user_id", id).maybeSingle(),
      db.from("admin_users").select("user_id").eq("user_id", id).maybeSingle(),
    ]);
    if (u.error) return setError(errorMessage(u.error));
    if (!u.data) return setError("ユーザーが見つかりません");
    setData({
      user: u.data, profile: p.data, images: img.data ?? [], reportsAgainst: ra.data ?? [], reportsBy: rb.data ?? [],
      counts: { likesSent: ls.count ?? 0, likesReceived: lr.count ?? 0, matches: m.count ?? 0, messages: msg.count ?? 0 },
      premiumUntil: sub.data?.current_period_end ?? null, isAdmin: !!adm.data,
    });
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    toast(ok, "success");
    load();
  }

  async function remove() {
    if (!confirm("このユーザーを完全に削除します。元に戻せません。よろしいですか？")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast((await res.json().catch(() => ({}))).error ?? "削除に失敗しました", "error");
    toast("ユーザーを削除しました", "success");
    router.replace("/admin/users");
  }

  if (error) return <ErrorState message={error} />;
  if (!data) return <PageLoading />;
  const { user, profile } = data;
  const db = createClient();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/admin/users" className="text-sm font-bold text-sub hover:text-ink">← ユーザー一覧</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{profile?.display_name ?? "（プロフィール未作成）"}</h1>
        {user.status === "active" ? <Badge tone="success">利用中</Badge> : <Badge tone="ink">停止中</Badge>}
        {data.isAdmin && <Badge tone="gold">管理者</Badge>}
        {profile && <TypeBadge code={profile.love_type} />}
      </div>
      {user.status === "suspended" && <Alert tone="warn">停止理由：{user.suspended_reason ?? "（未記入）"}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-bold">写真（{data.images.length}）</h2>
            {data.images.length === 0 ? <p className="text-sm text-sub">写真はありません</p> : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {data.images.map((img) => (
                  <div key={img.id} className="space-y-1.5">
                    <Photo path={img.storage_path} alt="プロフィール写真" className="aspect-[3/4] rounded-2xl" />
                    {img.status === "approved" ? (
                      <Button size="sm" variant="secondary" block disabled={busy} onClick={() => run(() => db.rpc("admin_set_image_status", { p_image: img.id, p_status: "rejected" }), "非公開にしました")}>非公開にする</Button>
                    ) : (
                      <Button size="sm" variant="ghost" block disabled={busy} onClick={() => run(() => db.rpc("admin_set_image_status", { p_image: img.id, p_status: "approved" }), "公開に戻しました")}>非公開中（戻す）</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {profile && (
            <Card>
              <h2 className="mb-3 font-bold">プロフィール</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Item k="性別" v={genderLabel(profile.gender)} />
                <Item k="生年月日" v={profile.birthdate} />
                <Item k="居住地" v={`${profile.prefecture} ${profile.city}`} />
                <Item k="職業" v={profile.occupation || "—"} />
                <Item k="年齢確認" v={profile.verification_status} />
                <Item k="非表示" v={profile.is_hidden ? "はい" : "いいえ"} />
              </dl>
              {profile.bio && <p className="mt-4 rounded-2xl bg-soft p-3 text-sm whitespace-pre-wrap">{profile.bio}</p>}
            </Card>
          )}

          <Card>
            <h2 className="mb-3 font-bold">このユーザーへの通報（{data.reportsAgainst.length}）</h2>
            {data.reportsAgainst.length === 0 ? <p className="text-sm text-sub">ありません</p> : (
              <ul className="divide-y divide-line text-sm">
                {data.reportsAgainst.map((r) => (
                  <li key={r.id} className="py-2">
                    <Badge tone={r.status === "open" ? "brand" : "mute"}>{r.status}</Badge>
                    <span className="ml-2 font-bold">{reportReasonLabel(r.reason)}</span>
                    <span className="ml-2 text-xs text-mute">{relativeTime(r.created_at)}</span>
                    {r.detail && <p className="mt-1 text-sub">{r.detail}</p>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-mute">このユーザーが行った通報：{data.reportsBy.length}件</p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="space-y-2 text-sm">
            <Item k="メールアドレス" v={user.email} />
            <Item k="登録日" v={new Date(user.created_at).toLocaleString("ja-JP")} />
            <Item k="最終アクセス" v={relativeTime(user.last_seen_at)} />
            <Item k="プレミアム" v={data.premiumUntil && new Date(data.premiumUntil) > new Date() ? `${new Date(data.premiumUntil).toLocaleDateString("ja-JP")}まで` : "なし"} />
            <div className="grid grid-cols-2 gap-2 pt-2 text-center">
              {[["送ったいいね", data.counts.likesSent], ["もらったいいね", data.counts.likesReceived], ["マッチング", data.counts.matches], ["送信メッセージ", data.counts.messages]].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-soft p-2"><p className="font-display text-xl font-bold">{v}</p><p className="text-[10px] text-sub">{k}</p></div>
              ))}
            </div>
          </Card>

          {!data.isAdmin && (
            <Card className="space-y-3">
              <h2 className="font-bold">操作</h2>
              {user.status === "active" ? (
                <>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="停止理由（ユーザーに表示されます）" className="h-11 text-sm" />
                  <Button variant="danger" block loading={busy} disabled={!reason.trim()}
                    onClick={() => run(() => db.rpc("admin_set_user_status", { p_user: id, p_status: "suspended", p_reason: reason.trim() }), "利用停止にしました")}>
                    利用停止にする
                  </Button>
                </>
              ) : (
                <Button variant="secondary" block loading={busy} onClick={() => run(() => db.rpc("admin_set_user_status", { p_user: id, p_status: "active" }), "利用を再開しました")}>
                  利用を再開する
                </Button>
              )}
              <Button variant="secondary" block loading={busy} onClick={() => run(() => db.rpc("admin_grant_premium", { p_user: id, p_days: 30 }), "プレミアムを30日付与しました")}>
                プレミアムを30日付与
              </Button>
              <Button variant="ghost" block loading={busy} onClick={remove} className="text-danger">アカウントを削除</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-mute">{k}</dt>
      <dd className="font-medium break-all">{v}</dd>
    </div>
  );
}
