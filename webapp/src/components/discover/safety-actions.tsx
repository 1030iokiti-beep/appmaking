"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { REPORT_REASONS, type ReportReason } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

export function ReportSheet({ open, onClose, userId, targetId, targetName, messageId, onBlocked }: {
  open: boolean; onClose: () => void; userId: string; targetId: string; targetName: string | null; messageId?: number; onBlocked?: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit() {
    if (!reason) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId, reported_id: targetId, reason, detail: detail.trim(), message_id: messageId ?? null,
    });
    if (!error && block) await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: targetId });
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    toast("通報を受け付けました。ご協力ありがとうございます", "success");
    onClose();
    if (block) onBlocked?.();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${targetName ?? "このユーザー"}さんを通報`}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {REPORT_REASONS.map((r) => (
            <Chip key={r.value} selected={reason === r.value} onClick={() => setReason(r.value)}>{r.label}</Chip>
          ))}
        </div>
        <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="詳しい状況（任意）" maxLength={2000} />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="size-5 accent-[var(--color-brand)]" />
          この人をブロックする（お互いに表示されなくなります）
        </label>
        <p className="text-xs text-mute">通報したことは相手に通知されません。運営が内容を確認し、規約違反があれば利用停止などの対応を行います。</p>
        <Button variant="danger" block size="lg" disabled={!reason} loading={busy} onClick={submit}>通報する</Button>
      </div>
    </Sheet>
  );
}

export function BlockSheet({ open, onClose, userId, targetId, targetName, onBlocked }: {
  open: boolean; onClose: () => void; userId: string; targetId: string; targetName: string | null; onBlocked?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function block() {
    setBusy(true);
    const { error } = await createClient().from("blocks").insert({ blocker_id: userId, blocked_id: targetId });
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    toast(`${targetName ?? "このユーザー"}さんをブロックしました`, "success");
    onClose();
    onBlocked?.();
  }
  return (
    <Sheet open={open} onClose={onClose} title="ブロックしますか？">
      <p className="text-sm leading-relaxed text-sub">
        {targetName}さんとお互いに表示されなくなり、マッチング・メッセージも削除されます。ブロックしたことは相手に通知されません。設定からいつでも解除できます。
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>キャンセル</Button>
        <Button variant="danger" onClick={block} loading={busy}>ブロック</Button>
      </div>
    </Sheet>
  );
}
