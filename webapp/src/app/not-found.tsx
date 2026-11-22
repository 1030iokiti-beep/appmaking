import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="font-display text-6xl font-bold text-brand">404</p>
        <h1 className="mt-4 font-display text-xl font-bold">ページが見つかりません</h1>
        <p className="mt-2 text-sm text-sub">URLが間違っているか、ページが削除された可能性があります。</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm font-bold text-white">トップへ戻る</Link>
      </div>
    </div>
  );
}
