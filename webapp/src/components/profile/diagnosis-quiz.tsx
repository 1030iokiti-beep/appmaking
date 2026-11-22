"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { LIKERT, QUESTIONS, scoreAnswers, type AxisScores } from "@/lib/diagnosis";
import { cn } from "@/lib/utils";

const SIZES = [52, 42, 32, 42, 52];

/** 恋愛タイプ診断（20問）。回答し終わると onDone にスコアを返す */
export function DiagnosisQuiz({ onDone }: { onDone: (s: AxisScores) => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const q = QUESTIONS[index];

  function answer(v: number) {
    const next = [...answers];
    next[index] = v;
    setAnswers(next);
    setTimeout(() => {
      if (index + 1 < QUESTIONS.length) setIndex(index + 1);
      else onDone(scoreAnswers(next));
    }, 200);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="brand-gradient h-full rounded-full transition-all duration-300" style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="text-xs font-bold text-sub tabular-nums">{index + 1}/{QUESTIONS.length}</span>
      </div>

      <div className="relative mt-6 min-h-44">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-44 flex-col items-center justify-center rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-[var(--shadow-card)]"
          >
            <span className="font-display text-sm font-bold tracking-widest text-brand">Q{index + 1}</span>
            <p className="mt-2 text-lg leading-relaxed font-bold">{q.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex items-center justify-between px-1" role="radiogroup" aria-label="回答">
        {LIKERT.map((o, i) => {
          const on = answers[index] === o.value;
          const tone = o.value > 3 ? "border-brand bg-brand" : o.value < 3 ? "border-[#8a7cf0] bg-[#8a7cf0]" : "border-mute bg-mute";
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.label.replace("\n", "")}
              onClick={() => answer(o.value)}
              className={cn("rounded-full border-[3px] transition active:scale-90", tone, !on && "bg-transparent")}
              style={{ width: SIZES[i], height: SIZES[i] }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-xs font-bold">
        <span className="text-brand">あてはまる</span>
        <span className="text-[#8a7cf0]">あてはまらない</span>
      </div>
      {index > 0 && (
        <button type="button" onClick={() => setIndex(index - 1)} className="mx-auto mt-8 block text-sm font-bold text-sub hover:text-ink">
          ← ひとつ前に戻る
        </button>
      )}
    </div>
  );
}
