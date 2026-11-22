"use client";

import { useState } from "react";
import { useMe } from "@/components/app/status-context";
import { DiagnosisQuiz } from "@/components/profile/diagnosis-quiz";
import { TypeResult } from "@/components/profile/type-result";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { typeCode, type AxisScores } from "@/lib/diagnosis";
import { createClient } from "@/lib/supabase/client";
import { invalidateMyProfile, useMyProfile } from "@/lib/use-my-profile";
import { errorMessage } from "@/lib/utils";

export default function DiagnosisPage() {
  const { userId } = useMe();
  const me = useMyProfile(userId);
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "quiz" | "result">("view");
  const [scores, setScores] = useState<AxisScores | null>(null);
  const [busy, setBusy] = useState(false);

  if (!me) return <PageLoading />;
  const p = me.profile;
  const current: AxisScores | null = p.axis_passion != null
    ? { passion: p.axis_passion, lead: p.axis_lead!, together: p.axis_together!, tempo: p.axis_tempo! }
    : null;

  async function save() {
    if (!scores) return;
    setBusy(true);
    const { error } = await createClient().from("profiles").update({
      axis_passion: scores.passion, axis_lead: scores.lead, axis_together: scores.together, axis_tempo: scores.tempo,
    }).eq("user_id", userId);
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    invalidateMyProfile();
    toast("診断結果を保存しました。おすすめに反映されます", "success");
    setMode("view");
    location.reload();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-bold">恋愛タイプ診断</h1>
      {mode === "view" && (
        <>
          {current && p.love_type ? <TypeResult code={p.love_type} scores={current} /> : <p className="text-sm text-sub">まだ診断していません。</p>}
          <Button size="lg" block variant={current ? "secondary" : "primary"} onClick={() => setMode("quiz")}>
            {current ? "もう一度診断する" : "診断をはじめる"}
          </Button>
        </>
      )}
      {mode === "quiz" && <DiagnosisQuiz onDone={(s) => { setScores(s); setMode("result"); }} />}
      {mode === "result" && scores && (
        <>
          <TypeResult code={typeCode(scores)} scores={scores} />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setMode("view")}>保存しない</Button>
            <Button onClick={save} loading={busy}>この結果で保存</Button>
          </div>
        </>
      )}
    </div>
  );
}
