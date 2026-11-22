"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSignedUrl } from "@/components/photo";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { Card, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { ageOf, errorMessage, relativeTime } from "@/lib/utils";

type Row = {
  id: string; user_id: string; document_type: string; document_path: string; created_at: string;
  user: { email: string; profiles: { display_name: string; birthdate: string } | null } | null;
};

export default function AdminVerificationsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await createClient().from("identity_verifications")
      .select("id, user_id, document_type, document_path, created_at, user:users!identity_verifications_user_id_fkey(email, profiles(display_name, birthdate))")
      .eq("status", "pending").order("created_at");
    if (error) return setError(errorMessage(error));
    setRows(data as unknown as Row[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="font-display text-2xl font-bold">年齢確認の審査</h1>
      <p className="text-sm text-sub">書類の種類・生年月日（18歳以上か）・プロフィールの生年月日との一致・発行者を確認してください。学生証は不可です。</p>
      {error ? <ErrorState message={error} onRetry={load} /> : !rows ? <PageLoading /> : rows.length === 0 ? (
        <EmptyState icon="✅" title="審査待ちの申請はありません" />
      ) : (
        <div className="space-y-4">{rows.map((r) => <Review key={r.id} row={r} onDone={load} />)}</div>
      )}
    </div>
  );
}

function Review({ row, onDone }: { row: Row; onDone: () => void }) {
  const url = useSignedUrl("verification-docs", row.document_path);
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const p = row.user?.profiles;
  const age = p ? ageOf(p.birthdate) : null;

  async function review(approve: boolean) {
    if (!approve && !note.trim()) return toast("否認の理由を入力してください", "error");
    setBusy(true);
    const { error } = await createClient().rpc("admin_review_verification", { p_id: row.id, p_approve: approve, p_note: note.trim() || undefined });
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    toast(approve ? "承認しました" : "否認しました", "success");
    onDone();
  }

  return (
    <Card className="grid gap-5 md:grid-cols-[1fr_280px]">
      <a href={url ?? undefined} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl bg-soft">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="本人確認書類" className="max-h-96 w-full object-contain" />
        ) : <div className="skeleton h-64" />}
      </a>
      <div className="space-y-3 text-sm">
        <p><Link href={`/admin/users/${row.user_id}`} className="font-display text-lg font-bold hover:text-brand">{p?.display_name ?? "—"}</Link></p>
        <p className="text-xs text-sub">{row.user?.email}</p>
        <dl className="space-y-1.5 rounded-2xl bg-soft p-3">
          <div className="flex justify-between"><dt className="text-sub">申告の生年月日</dt><dd className="font-bold">{p?.birthdate}（{age}歳）</dd></div>
          <div className="flex justify-between"><dt className="text-sub">書類</dt><dd>{DOCUMENT_TYPES.find((d) => d.value === row.document_type)?.label}</dd></div>
          <div className="flex justify-between"><dt className="text-sub">申請</dt><dd>{relativeTime(row.created_at)}</dd></div>
        </dl>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="否認理由（ユーザーに表示）" className="h-10 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" loading={busy} onClick={() => review(false)}>否認</Button>
          <Button variant="gold" size="sm" loading={busy} onClick={() => review(true)}>承認</Button>
        </div>
      </div>
    </Card>
  );
}
