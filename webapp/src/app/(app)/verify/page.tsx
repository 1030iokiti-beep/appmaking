"use client";

import { useEffect, useRef, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { IconCamera, IconShield } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Alert, PageLoading } from "@/components/ui/feedback";
import { Card, Field, Select } from "@/components/ui/form";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { processImage, randomName } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

export default function VerifyPage() {
  const { userId, status, refresh } = useMe();
  const [docType, setDocType] = useState("drivers_license");
  const [note, setNote] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const st = status.verification_status ?? "unverified";

  useEffect(() => {
    createClient().from("identity_verifications").select("review_note").eq("user_id", userId).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setNote(data?.[0]?.review_note ?? null));
  }, [userId, st]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await processImage(file, 2000, 0.9);
      const path = `${userId}/${randomName()}`;
      const supabase = createClient();
      const up = await supabase.storage.from("verification-docs").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await supabase.rpc("submit_identity_verification", { p_document_type: docType, p_document_path: path });
      if (error) throw error;
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  if (note === undefined) return <PageLoading />;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="font-display text-2xl font-bold">年齢確認</h1>
      <Card className="flex items-center gap-4">
        <div className={`grid size-12 place-items-center rounded-full text-2xl ${st === "approved" ? "bg-success/10 text-success" : "bg-soft text-sub"}`}><IconShield /></div>
        <div>
          <p className="text-xs text-sub">現在の状態</p>
          <p className="font-bold">
            {{ approved: "年齢確認済み ✓", pending: "審査中（通常24時間以内）", rejected: "否認されました", unverified: "未提出" }[st]}
          </p>
          {st === "rejected" && note && <p className="mt-1 text-xs text-danger">理由：{note}</p>}
        </div>
      </Card>

      {(st === "unverified" || st === "rejected") && (
        <>
          <p className="text-sm leading-relaxed text-sub">
            出会い系サイト規制法により、メッセージのやりとりの前に18歳以上であることの確認が義務付けられています。
          </p>
          <Card className="space-y-4">
            <Field label="提出する書類" htmlFor="doc">
              <Select id="doc" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Alert tone="warn">
              「生年月日」「書類の名称」「発行者」が読み取れるように撮影してください。住所・顔写真・番号などは隠して構いません。マイナンバー（個人番号）は絶対に写さないでください。
            </Alert>
            {error && <Alert tone="error">{error}</Alert>}
            <Button size="lg" block loading={busy} onClick={() => fileRef.current?.click()}><IconCamera /> 書類を撮影・選択する</Button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </Card>
          <p className="text-xs leading-relaxed text-mute">提出された書類は年齢確認の目的にのみ使用し、運営スタッフ以外が見ることはありません。他のユーザーに公開されることはありません。</p>
        </>
      )}
    </div>
  );
}
