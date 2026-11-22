import type { Metadata } from "next";
import { SwipeDeck } from "@/components/discover/swipe-deck";

export const metadata: Metadata = { title: "ホーム" };

export default function HomePage() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-gold">AI PICK UP</p>
          <h1 className="font-display text-2xl font-bold">あなたへのおすすめ</h1>
        </div>
      </div>
      <p className="-mt-2 text-xs leading-relaxed text-sub">
        恋愛タイプ・価値観・趣味・距離、そしてあなたの「いいね」の傾向から、AIが相性の高い順に紹介しています。
      </p>
      <SwipeDeck />
    </div>
  );
}
