import Link from "next/link";
import { Logo } from "@/components/logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="shrink-0"><Logo /></Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/login" className="rounded-full px-3 py-2 text-sm font-bold whitespace-nowrap text-sub hover:text-ink sm:px-4">ログイン</Link>
            <Link href="/signup" className="brand-gradient rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap text-white shadow-[var(--shadow-float)] sm:px-5">無料登録</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-xs text-sub sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-ink">利用規約</Link>
            <Link href="/privacy" className="hover:text-ink">プライバシーポリシー</Link>
            <Link href="/safety" className="hover:text-ink">安全に使うために</Link>
          </nav>
          <p>18歳未満・高校生の方はご利用いただけません。インターネット異性紹介事業 届出番号：【要記入】</p>
        </div>
      </footer>
    </div>
  );
}
