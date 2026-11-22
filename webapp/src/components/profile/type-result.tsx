import { AXES, bestMatchCode, loveType, TYPE_GROUPS, typeGradient, type Axis, type AxisScores } from "@/lib/diagnosis";

export function TypeResult({ code, scores }: { code: string; scores?: AxisScores | null }) {
  const t = loveType(code);
  const bestCode = bestMatchCode(code);
  const best = loveType(bestCode);
  const [a, b] = typeGradient(code);
  if (!t) return null;
  return (
    <div className="space-y-4">
      <div className="animate-pop rounded-[2rem] p-7 text-center text-white shadow-[var(--shadow-float)]" style={{ backgroundImage: `linear-gradient(135deg, ${a}, ${b})` }}>
        <p className="text-sm font-bold opacity-90">あなたの恋愛タイプは…</p>
        <div className="mx-auto my-4 grid size-28 place-items-center rounded-full bg-white/20 text-6xl">{t.emoji}</div>
        <h2 className="font-display text-3xl font-bold">{t.name}</h2>
        <p className="mt-1 text-xs tracking-[0.3em] opacity-85">{code}・{TYPE_GROUPS[code.slice(0, 2)]?.label}</p>
        <p className="mt-4 font-bold">「{t.catch}」</p>
        <p className="mt-2 text-sm leading-relaxed opacity-95">{t.description}</p>
      </div>
      {scores && (
        <div className="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          {(Object.keys(AXES) as Axis[]).map((axis) => {
            const left = Math.round((scores[axis] + 100) / 2);
            return (
              <div key={axis}>
                <div className="flex justify-between text-xs">
                  <span className={left >= 50 ? "font-bold text-brand-deep" : "text-sub"}>{AXES[axis].left} {left}%</span>
                  <span className={left < 50 ? "font-bold text-brand-deep" : "text-sub"}>{100 - left}% {AXES[axis].right}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${left}%`, backgroundImage: `linear-gradient(90deg, ${a}, ${b})` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {best && (
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="grid size-14 shrink-0 place-items-center rounded-full text-3xl" style={{ backgroundImage: `linear-gradient(135deg, ${typeGradient(bestCode)[0]}, ${typeGradient(bestCode)[1]})` }}>
            {best.emoji}
          </div>
          <div>
            <p className="text-xs text-sub">相性のいいタイプ</p>
            <p className="font-display font-bold">{best.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
