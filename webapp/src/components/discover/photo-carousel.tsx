"use client";

import { useState } from "react";
import { Photo } from "@/components/photo";
import { cn } from "@/lib/utils";

/** タップで左右に切り替わる写真（スワイプカード・詳細で共通） */
export function PhotoCarousel({ photos, name, className, rounded = true }: { photos: string[]; name: string | null; className?: string; rounded?: boolean }) {
  const [i, setI] = useState(0);
  const list = photos.length ? photos : [null];
  const idx = Math.min(i, list.length - 1);
  return (
    <div className={cn("relative overflow-hidden bg-soft", rounded && "rounded-[inherit]", className)}>
      <Photo path={list[idx]} name={name} alt={`${name ?? ""}さんの写真 ${idx + 1}`} className="size-full text-7xl" />
      {list.length > 1 && (
        <>
          <div className="absolute inset-x-3 top-3 flex gap-1">
            {list.map((_, n) => (
              <span key={n} className={cn("h-1 flex-1 rounded-full", n === idx ? "bg-white" : "bg-white/40")} />
            ))}
          </div>
          <button type="button" aria-label="前の写真" className="absolute inset-y-0 left-0 w-1/3" onClick={(e) => { e.stopPropagation(); setI(Math.max(0, idx - 1)); }} />
          <button type="button" aria-label="次の写真" className="absolute inset-y-0 right-0 w-1/3" onClick={(e) => { e.stopPropagation(); setI(Math.min(list.length - 1, idx + 1)); }} />
        </>
      )}
    </div>
  );
}
