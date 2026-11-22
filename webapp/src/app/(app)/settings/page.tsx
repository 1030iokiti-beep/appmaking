"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { useMe } from "@/components/app/status-context";
import { IconChevronRight, IconLogout } from "@/components/icons";
import { Avatar } from "@/components/photo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { invalidateMyProfile } from "@/lib/use-my-profile";
import { errorMessage } from "@/lib/utils";

type Blocked = { blocked_id: string; created_at: string; name: string | null };

export default function SettingsPage() {
  const { userId } = useMe();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [hidden, setHidden] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [sheet, setSheet] = useState<null | "password" | "email" | "delete">(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: claims }, { data: p }, { data: b }] = await Promise.all([
      supabase.auth.getClaims(),
      supabase.from("profiles").select("is_hidden, lat").eq("user_id", userId).single(),
      supabase.from("blocks").select("blocked_id, created_at").order("created_at", { ascending: false }),
    ]);
    setEmail((claims?.claims?.email as string) ?? "");
    setHidden(!!p?.is_hidden);
    setHasLocation(p?.lat != null);
    // ブロックした相手は名前が見えないので「ブロック中のユーザー」として表示
    setBlocked((b ?? []).map((x) => ({ ...x, name: null })));
  }, [userId]);
  useEffect(() => {
    load();
  }, [load]);

  async function toggleHidden(v: boolean) {
    setHidden(v);
    const { error } = await createClient().from("profiles").update({ is_hidden: v }).eq("user_id", userId);
    if (error) {
      setHidden(!v);
      return toast(errorMessage(error), "error");
    }
    toast(v ? "プロフィールを非表示にしました" : "プロフィールを公開しました", "success");
  }

  async function clearLocation() {
    await createClient().from("profiles").update({ lat: null, lng: null }).eq("user_id", userId);
    invalidateMyProfile();
    setHasLocation(false);
    toast("位置情報を削除しました", "success");
  }

  async function unblock(id: string) {
    const { error } = await createClient().from("blocks").delete().eq("blocker_id", userId).eq("blocked_id", id);
    if (error) return toast(errorMessage(error), "error");
    setBlocked((b) => b.filter((x) => x.blocked_id !== id));
    toast("ブロックを解除しました");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-bold">設定</h1>

      <Section title="アカウント">
        <Item label="メールアドレス" value={email} onClick={() => setSheet("email")} />
        <Item label="パスワードを変更" onClick={() => setSheet("password")} />
      </Section>

      <Section title="プライバシー">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex-1">
            <p className="font-medium">プロフィールを非表示にする</p>
            <p className="text-xs text-sub">おすすめ・検索に表示されなくなります（マッチ中の相手とはやりとりできます）</p>
          </div>
          <Switch checked={hidden} onChange={toggleHidden} label="プロフィールを非表示にする" />
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex-1">
            <p className="font-medium">位置情報</p>
            <p className="text-xs text-sub">{hasLocation ? "設定済み（他の人には距離の目安のみ表示）" : "未設定"}</p>
          </div>
          {hasLocation ? <Button size="sm" variant="secondary" onClick={clearLocation}>削除</Button> : <Link href="/me/edit" className="text-sm font-bold text-brand">設定する</Link>}
        </div>
      </Section>

      <Section title={`ブロック中のユーザー（${blocked.length}）`}>
        {blocked.length === 0 ? (
          <p className="px-5 py-4 text-sm text-sub">ブロックしているユーザーはいません</p>
        ) : (
          blocked.map((b) => (
            <div key={b.blocked_id} className="flex items-center gap-3 px-5 py-3">
              <Avatar path={null} name="?" size={36} />
              <p className="flex-1 text-sm">ブロック中のユーザー<span className="ml-2 text-xs text-mute">{new Date(b.created_at).toLocaleDateString("ja-JP")}</span></p>
              <Button size="sm" variant="secondary" onClick={() => unblock(b.blocked_id)}>解除</Button>
            </div>
          ))
        )}
      </Section>

      <Section title="サポート">
        <Item label="安全に使うためのガイド" href="/safety" />
        <Item label="利用規約" href="/terms" />
        <Item label="プライバシーポリシー" href="/privacy" />
      </Section>

      <form action={signOut}>
        <Button variant="secondary" block size="lg"><IconLogout /> ログアウト</Button>
      </form>
      <button onClick={() => setSheet("delete")} className="mx-auto block py-2 text-sm text-sub hover:text-danger">退会する</button>

      <PasswordSheet open={sheet === "password"} onClose={() => setSheet(null)} />
      <EmailSheet open={sheet === "email"} onClose={() => setSheet(null)} current={email} />
      <DeleteSheet open={sheet === "delete"} onClose={() => setSheet(null)} onDeleted={() => { router.replace("/"); router.refresh(); }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold text-sub">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">{children}</div>
    </section>
  );
}

function Item({ label, value, onClick, href }: { label: string; value?: string; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <span className="flex-1 text-left font-medium">{label}</span>
      {value && <span className="max-w-[55%] truncate text-sm text-sub">{value}</span>}
      <IconChevronRight className="text-mute" />
    </>
  );
  const cls = "flex w-full items-center gap-3 px-5 py-4 transition hover:bg-soft/60";
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

function PasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  async function submit() {
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError("8文字以上で、英字と数字を含めてください");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    toast("パスワードを変更しました", "success");
    setPw("");
    onClose();
  }
  return (
    <Sheet open={open} onClose={onClose} title="パスワードを変更">
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="新しいパスワード" htmlFor="new-pw" hint="8文字以上・英字と数字を含む">
          <Input id="new-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Button block size="lg" onClick={submit} loading={busy}>変更する</Button>
      </div>
    </Sheet>
  );
}

function EmailSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  async function submit() {
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${location.origin}/auth/callback?next=/settings` });
    setBusy(false);
    setMsg(error ? { tone: "error", text: errorMessage(error) } : { tone: "success", text: "確認メールを送信しました。新旧両方のメールアドレスに届くリンクを開くと変更が完了します。" });
  }
  return (
    <Sheet open={open} onClose={onClose} title="メールアドレスを変更">
      <div className="space-y-4">
        <p className="text-sm text-sub">現在：{current}</p>
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field label="新しいメールアドレス" htmlFor="new-email">
          <Input id="new-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button block size="lg" onClick={submit} loading={busy} disabled={!email.includes("@")}>確認メールを送る</Button>
      </div>
    </Sheet>
  );
}

function DeleteSheet({ open, onClose, onDeleted }: { open: boolean; onClose: () => void; onDeleted: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true);
    const res = await fetch("/api/account", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: text }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "退会に失敗しました");
    onDeleted();
  }
  return (
    <Sheet open={open} onClose={onClose} title="退会しますか？">
      <div className="space-y-4">
        <Alert tone="error">プロフィール・写真・マッチング・メッセージはすべて削除され、元に戻せません。</Alert>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="確認のため「退会する」と入力してください" htmlFor="confirm-delete">
          <Input id="confirm-delete" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Button variant="danger" block size="lg" disabled={text !== "退会する"} loading={busy} onClick={submit}>退会する</Button>
      </div>
    </Sheet>
  );
}
