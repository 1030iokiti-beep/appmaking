import Link from "next/link";
import { LOVE_TYPES, typeGradient } from "@/lib/diagnosis";

const FEATURES = [
  { icon: "✦", title: "AIが相性を計算", body: "恋愛タイプ診断・価値観・趣味・距離に加えて、あなたの「いいね」の傾向も学習。相性の高い順に紹介します。" },
  { icon: "📍", title: "近くの人と出会える", body: "位置情報で近くにいる人を優先。正確な場所は誰にも公開されず、「約3km」のような目安だけが表示されます。" },
  { icon: "♥", title: "スワイプでかんたん", body: "気になったら右へ、そうでなければ左へ。お互いにいいねするとマッチングが成立してメッセージできます。" },
  { icon: "🛡", title: "全員年齢確認済み", body: "メッセージは公的書類で年齢確認をした人だけ。通報・ブロック・24時間の監視体制で安心して使えます。" },
];

export default function LandingPage() {
  const types = Object.entries(LOVE_TYPES);
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_10%,rgba(212,83,110,0.18),transparent),radial-gradient(50%_50%_at_10%_80%,rgba(179,146,86,0.15),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-2 lg:pt-20">
          <div className="animate-fade-up">
            <p className="text-xs font-bold tracking-[0.3em] text-gold">AI MATCHING × NEARBY × SWIPE</p>
            <h1 className="mt-5 font-display text-[2.6rem] leading-[1.25] font-bold sm:text-6xl">
              AIが選ぶ、
              <br />
              <span className="bg-[linear-gradient(90deg,#d4536e,#b39256)] bg-clip-text text-transparent">相性のいい</span>
              <br />
              近くの人。
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-sub">
              3分の恋愛タイプ診断と価値観から、AIがあなたと相性のいい人を見つけます。気になる人はスワイプでいいね。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="brand-gradient flex h-14 items-center justify-center rounded-full px-8 font-bold text-white shadow-[var(--shadow-float)] transition active:scale-95">
                無料で診断をはじめる
              </Link>
              <Link href="/login" className="flex h-14 items-center justify-center rounded-full bg-surface px-8 font-bold ring-1 ring-line transition hover:bg-soft">
                ログイン
              </Link>
            </div>
            <p className="mt-4 text-xs text-mute">登録無料・18歳以上（高校生不可）</p>
          </div>

          {/* カードのイメージ */}
          <div className="relative mx-auto h-[460px] w-full max-w-sm" aria-hidden>
            {[
              { code: "CFTS", rot: "-8deg", x: "-14%", y: "6%" },
              { code: "PLID", rot: "7deg", x: "14%", y: "3%" },
              { code: "PFTD", rot: "0deg", x: "0", y: "0" },
            ].map((c, i) => {
              const [a, b] = typeGradient(c.code);
              const t = LOVE_TYPES[c.code];
              return (
                <div
                  key={c.code}
                  className="absolute inset-x-6 top-0 bottom-10 overflow-hidden rounded-[2rem] shadow-[0_30px_60px_-25px_rgba(31,26,33,0.5)]"
                  style={{ transform: `translate(${c.x}, ${c.y}) rotate(${c.rot})`, zIndex: i, backgroundImage: `linear-gradient(150deg, ${a}, ${b})` }}
                >
                  <div className="grid h-3/5 place-items-center text-8xl">{t.emoji}</div>
                  <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{t.emoji} {t.name}</span>
                    <p className="font-display text-2xl font-bold">{["ゆい 27", "そうた 31", "はるか 29"][i]}</p>
                    <p className="text-xs opacity-90">📍 約{[3, 8, 2][i]}km ・ ✦ 価値観が{[5, 4, 6][i]}つ一致</p>
                  </div>
                  {i === 2 && (
                    <div className="absolute top-5 right-5 grid size-16 place-items-center rounded-full bg-white text-center shadow-lg">
                      <div className="leading-none"><div className="text-[8px] font-bold text-mute">AI相性</div><div className="font-display text-xl font-bold text-brand-deep">94%</div></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-display text-3xl font-bold">こいまちが選ばれる理由</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-card)]">
              <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-xl text-brand-deep">{f.icon}</div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-sub">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-display text-3xl font-bold">あなたはどのタイプ？</h2>
        <p className="mt-3 text-center text-sm text-sub">20の質問で、16の恋愛タイプからあなたのタイプを診断します</p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {types.map(([code, t]) => {
            const [a, b] = typeGradient(code);
            return (
              <div key={code} className="rounded-3xl p-4 text-white" style={{ backgroundImage: `linear-gradient(140deg, ${a}, ${b})` }}>
                <div className="text-3xl">{t.emoji}</div>
                <p className="mt-3 text-sm font-bold">{t.name}</p>
                <p className="text-[10px] tracking-widest opacity-80">{code}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="mx-auto max-w-3xl rounded-[2.5rem] bg-ink p-10 text-center text-white">
          <h2 className="font-display text-3xl font-bold text-gold-soft">相性のいい人は、すぐ近くに。</h2>
          <p className="mt-4 text-sm text-white/75">登録は無料。3分の診断ではじめられます。</p>
          <Link href="/signup" className="mt-8 inline-flex h-14 items-center rounded-full bg-white px-10 font-bold text-brand-deep transition active:scale-95">無料ではじめる</Link>
        </div>
      </section>
    </>
  );
}
