"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/feedback";
import { Badge, Card, Chip, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { reportReasonLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, relativeTime } from "@/lib/utils";

type Person = { id: string; email: string; status: string; profiles: { display_name: string } | null } | null;
type Report = {
  id: string; reason: string; detail: string; status: string; admin_note: string | null; created_at: string; handled_at: string | null;
  message: { body: string | null; image_path: string | null } | null; reporter: Person; reported: Person;
};
const STATUSES = { open: "未対応", reviewing: "確認中", resolved: "対応済み", dismissed: "対応不要" } as const;
type Status = keyof typeof STATUSES;

export default function AdminReportsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<"active" | "done">("active");
  const [rows, setRows] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("reports")
      .select(`id, reason, detail, status, admin_note, created_at, handled_at,
        message:messages(body, image_path),
        reporter:users!reports_reporter_id_fkey(id, email, status, profiles(display_name)),
        reported:users!reports_reported_id_fkey(id, email, status, profiles(display_name))`)
      .in("status", filter === "active" ? ["open", "reviewing"] : ["resolved", "dismissed"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return setError(errorMessage(error));
    setRows(data as unknown as Report[]);
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);

  async function update(r: Report, status: Status) {
    const { error } = await createClient().rpc("admin_update_report", { p_report: r.id, p_status: status, p_note: notes[r.id]?.trim() || undefined });
    if (error) return toast(errorMessage(error), "error");
    toast(`「${STATUSES[status]}」にしました`, "success");
    load();
  }

  async function suspend(r: Report) {
    if (!r.reported) return;
    const reason = prompt("停止理由（ユーザーに表示されます）", `通報内容（${reportReasonLabel(r.reason)}）を確認したため`);
    if (!reason) return;
    const db = createClient();
    const { error } = await db.rpc("admin_set_user_status", { p_user: r.reported.id, p_status: "suspended", p_reason: reason });
    if (error) return toast(errorMessage(error), "error");
    await db.rpc("admin_update_report", { p_report: r.id, p_status: "resolved", p_note: `利用停止：${reason}` });
    toast("利用停止にして対応済みにしました", "success");
    load();
  }

  const name = (p: Person) => p?.profiles?.display_name ?? p?.email ?? "（退会済み）";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="font-display text-2xl font-bold">通報</h1>
      <div className="flex gap-2">
        <Chip selected={filter === "active"} onClick={() => setFilter("active")}>未対応・確認中</Chip>
        <Chip selected={filter === "done"} onClick={() => setFilter("done")}>対応済み</Chip>
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : !rows ? <PageLoading /> : rows.length === 0 ? (
        <EmptyState icon="✅" title={filter === "active" ? "未対応の通報はありません" : "対応済みの通報はありません"} />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <Card key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.status === "open" ? "brand" : r.status === "reviewing" ? "gold" : "mute"}>{STATUSES[r.status as Status]}</Badge>
                <span className="font-bold">{reportReasonLabel(r.reason)}</span>
                <span className="ml-auto text-xs text-mute">{relativeTime(r.created_at)}</span>
              </div>
              <p className="text-sm">
                <span className="text-sub">通報者：</span>{r.reporter ? <Link className="font-bold hover:text-brand" href={`/admin/users/${r.reporter.id}`}>{name(r.reporter)}</Link> : "（退会済み）"}
                <span className="mx-2 text-mute">→</span>
                <span className="text-sub">対象：</span>{r.reported ? <Link className="font-bold hover:text-brand" href={`/admin/users/${r.reported.id}`}>{name(r.reported)}</Link> : "—"}
                {r.reported?.status === "suspended" && <Badge tone="ink" className="ml-2">停止中</Badge>}
              </p>
              {r.detail && <p className="rounded-2xl bg-soft p-3 text-sm whitespace-pre-wrap">{r.detail}</p>}
              {r.message && (
                <p className="rounded-2xl border border-danger/20 bg-danger/5 p-3 text-sm">
                  <span className="text-xs font-bold text-danger">通報されたメッセージ：</span><br />{r.message.body ?? "（画像）"}
                </p>
              )}
              {r.admin_note && <p className="text-xs text-sub">対応メモ：{r.admin_note}</p>}
              {filter === "active" && (
                <>
                  <Textarea value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="対応メモ（社内用）" className="min-h-16 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    {r.status === "open" && <Button size="sm" variant="secondary" onClick={() => update(r, "reviewing")}>確認中にする</Button>}
                    <Button size="sm" variant="secondary" onClick={() => update(r, "dismissed")}>対応不要</Button>
                    <Button size="sm" variant="gold" onClick={() => update(r, "resolved")}>対応済み</Button>
                    {r.reported?.status === "active" && <Button size="sm" variant="danger" onClick={() => suspend(r)}>対象を利用停止</Button>}
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
