import { loveType, typeGradient } from "@/lib/diagnosis";
import { cn } from "@/lib/utils";

export function TypeBadge({ code, className, light }: { code: string | null | undefined; className?: string; light?: boolean }) {
  const t = loveType(code);
  if (!t) return null;
  const [a, b] = typeGradient(code);
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", light ? "bg-white/20 text-white backdrop-blur" : "text-white", className)}
      style={light ? undefined : { backgroundImage: `linear-gradient(90deg, ${a}, ${b})` }}
    >
      <span aria-hidden>{t.emoji}</span>
      {t.name}
    </span>
  );
}

/** AI相性スコアのリング */
export function ScoreRing({ score, size = 64, className }: { score: number; size?: number; className?: string }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className={className}>
    <div className="relative grid place-items-center rounded-full bg-white/95 shadow-lg" style={{ width: size, height: size }} aria-label={`AI相性 ${score}%`}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#f1e6e8" strokeWidth="4" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#ring-${size})`} strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        />
        <defs>
          <linearGradient id={`ring-${size}`} x1="0" x2="1">
            <stop offset="0" stopColor="#d4536e" />
            <stop offset="1" stopColor="#b39256" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative text-center leading-none">
        <div className="text-[8px] font-bold tracking-wider text-mute">AI相性</div>
        <div className="font-display text-[length:calc(var(--s)*0.3)] font-bold text-brand-deep" style={{ ["--s" as string]: `${size}px` }}>
          {score}
          <span className="text-[0.55em]">%</span>
        </div>
      </div>
    </div>
    </div>
  );
}
