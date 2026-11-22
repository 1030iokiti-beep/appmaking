"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Photo } from "@/components/photo";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { Chip } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, relativeTime } from "@/lib/utils";

type Img = { id: string; user_id: string; storage_path: string; status: string; created_at: string };

/** 新着写真の目視チェック（不適切な画像を非公開にする） */
export default function AdminImagesPage() {
  const toast = useToast();
  const [status, setStatus] = useState<"approved" | "rejected">("approved");
  const [rows, setRows] = useState<Img[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("profile_images").select("id, user_id, storage_path, status, created_at")
      .eq("status", status).order("created_at", { ascending: false }).limit(60);
    if (error) return setError(errorMessage(error));
    setRows(data);
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  async function set(img: Img, s: "approved" | "rejected") {
    const { error } = await createClient().rpc("admin_set_image_status", { p_image: img.id, p_status: s });
    if (error) return toast(errorMessage(error), "error");
    setRows((r) => r?.filter((x) => x.id !== img.id) ?? null);
    toast(s === "rejected" ? "非公開にしました（本人に通知済み）" : "公開に戻しました", "success");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="font-display text-2xl font-bold">画像審査</h1>
      <p className="text-sm text-sub">新しく登録された写真です。他人の写真・露出の多い写真・連絡先が写った写真などは非公開にしてください。</p>
      <div className="flex gap-2">
        <Chip selected={status === "approved"} onClick={() => setStatus("approved")}>公開中（新着順）</Chip>
        <Chip selected={status === "rejected"} onClick={() => setStatus("rejected")}>非公開にした写真</Chip>
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : !rows ? <PageLoading /> : rows.length === 0 ? (
        <EmptyState icon="🖼️" title="写真はありません" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {rows.map((img) => (
            <div key={img.id} className="space-y-2">
              <Photo path={img.storage_path} alt="審査対象の写真" className="aspect-[3/4] rounded-2xl" />
              <div className="flex items-center justify-between text-[11px] text-mute">
                <Link href={`/admin/users/${img.user_id}`} className="font-bold hover:text-brand">ユーザー</Link>
                <span>{relativeTime(img.created_at)}</span>
              </div>
              {status === "approved"
                ? <Button size="sm" variant="danger" block onClick={() => set(img, "rejected")}>非公開</Button>
                : <Button size="sm" variant="secondary" block onClick={() => set(img, "approved")}>公開に戻す</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
