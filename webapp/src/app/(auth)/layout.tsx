import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden brand-gradient lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/"><Logo light /></Link>
          <div>
            <p className="font-display text-4xl leading-snug font-bold">
              AIが選ぶ、
              <br />
              相性のいい近くの人。
            </p>
            <p className="mt-4 max-w-sm text-white/85">恋愛タイプ診断・価値観・趣味・距離からAIが相性を計算。全員が年齢確認済みの安心な場所です。</p>
          </div>
          <p className="text-xs text-white/70">18歳未満・高校生の方はご利用いただけません</p>
        </div>
      </div>
      <main className="flex flex-col px-5 py-8 sm:px-8">
        <Link href="/" className="lg:hidden"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
