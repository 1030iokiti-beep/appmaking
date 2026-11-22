"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div>
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-4 font-display text-xl font-bold">エラーが発生しました</h1>
        <p className="mt-2 text-sm text-sub">時間をおいてもう一度お試しください。</p>
        <button onClick={reset} className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white">再読み込み</button>
      </div>
    </div>
  );
}
