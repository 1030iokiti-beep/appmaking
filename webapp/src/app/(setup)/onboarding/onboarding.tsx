"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BasicsForm, emptyBasics, validateBasics, type Basics } from "@/components/profile/basics-form";
import { DiagnosisQuiz } from "@/components/profile/diagnosis-quiz";
import { HobbiesPicker } from "@/components/profile/hobbies-picker";
import { LocationButton } from "@/components/profile/location-button";
import { PhotoManager } from "@/components/profile/photo-manager";
import { TypeResult } from "@/components/profile/type-result";
import { ValuesForm } from "@/components/profile/values-form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/form";
import { typeCode, VALUE_QUESTIONS, type AxisScores } from "@/lib/diagnosis";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import { errorMessage } from "@/lib/utils";

const STEPS = ["基本情報", "写真", "恋愛タイプ診断", "価値観", "趣味・自己紹介", "位置情報"] as const;

export function Onboarding({ userId, hasProfile }: { userId: string; hasProfile: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(hasProfile ? 1 : 0);
  const [basics, setBasics] = useState<Basics>(emptyBasics);
  const [photoCount, setPhotoCount] = useState(0);
  const [scores, setScores] = useState<AxisScores | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onPhotos = useCallback((n: number) => setPhotoCount(n), []);

  const supabase = createClient();
  const update = async (patch: Database["public"]["Tables"]["profiles"]["Update"]) => {
    const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
    if (error) throw error;
  };

  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const next = () => {
    setError(null);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function saveBasics() {
    const v = validateBasics(basics, "required");
    if (v) return setError(v);
    await run(async () => {
      const { error } = await supabase.from("profiles").insert({
        user_id: userId,
        display_name: basics.display_name.trim(),
        birthdate: basics.birthdate,
        gender: basics.gender as string,
        seeking: basics.seeking,
        prefecture: basics.prefecture,
        city: basics.city.trim(),
      });
      if (error) throw error;
      next();
    });
  }

  return (
    <div className="pt-2">
      {/* 進捗 */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs font-bold text-sub">
          <span>STEP {step + 1} / {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= step ? "brand-gradient" : "bg-line"}`} />
          ))}
        </div>
      </div>

      {error && <div className="mb-5"><Alert tone="error">{error}</Alert></div>}

      <AnimatePresence mode="wait">
        <motion.section key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {step === 0 && (
            <div className="space-y-6">
              <Heading title="あなたについて教えてください" sub="生年月日・正確な位置情報は他の人に表示されません。" />
              <BasicsForm value={basics} onChange={setBasics} />
              <Button size="lg" block onClick={saveBasics} loading={busy}>次へ</Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <Heading title="写真を登録しましょう" sub="写真がある人は、ない人に比べてマッチしやすくなります。" />
              <PhotoManager userId={userId} onChange={onPhotos} />
              <Button size="lg" block onClick={next}>{photoCount > 0 ? "次へ" : "あとで登録する"}</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {!scores ? (
                <>
                  <Heading title="恋愛タイプ診断" sub="20の質問に直感で答えてください。AIマッチングの精度が上がります。" />
                  <DiagnosisQuiz onDone={setScores} />
                </>
              ) : (
                <>
                  <TypeResult code={typeCode(scores)} scores={scores} />
                  <Button
                    size="lg" block loading={busy}
                    onClick={() => run(async () => {
                      await update({ axis_passion: scores.passion, axis_lead: scores.lead, axis_together: scores.together, axis_tempo: scores.tempo });
                      next();
                    })}
                  >
                    次へ
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Heading title="大切にしている価値観" sub="同じ価値観の人ほど、AI相性が高くなります。" />
              <ValuesForm value={values} onChange={setValues} />
              <Button
                size="lg" block loading={busy}
                disabled={VALUE_QUESTIONS.some((q) => !values[q.key])}
                onClick={() => run(async () => { await update({ value_answers: values }); next(); })}
              >
                次へ
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <Heading title="趣味と自己紹介" sub="共通の趣味がある人をAIが優先して紹介します。" />
              <HobbiesPicker value={hobbies} onChange={setHobbies} />
              <Field label="自己紹介（任意）" htmlFor="bio" hint={`${bio.length}/1000`}>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} placeholder="休日の過ごし方や、どんな人と出会いたいかなど" />
              </Field>
              <Button size="lg" block loading={busy} onClick={() => run(async () => { await update({ hobbies, bio: bio.trim() }); next(); })}>
                次へ
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <Heading title="近くの人と出会う" sub="現在地を設定すると、近くにいる相性のいい人が見つかりやすくなります。" />
              <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
                <ul className="mb-5 space-y-2 text-sm text-sub">
                  <li>📍 位置は約1km単位に丸めて保存します</li>
                  <li>🔒 他の人には「約3km」のような目安だけが表示されます</li>
                  <li>⚙️ 設定からいつでも削除できます</li>
                </ul>
                <LocationButton userId={userId} />
              </div>
              <Button size="lg" block onClick={() => { router.replace("/home"); router.refresh(); }}>
                はじめる
              </Button>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function Heading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-sub">{sub}</p>
    </div>
  );
}
