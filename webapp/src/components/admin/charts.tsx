"use client";

import { useState } from "react";

// 単一系列のみ（色はブランドのローズ1色。検証済み: 白背景でコントラスト3:1以上）
const SERIES = "#d4536e";

/** 日別の件数（縦棒）。ホバーで日付と件数を表示 */
export function DailyBars({ title, data, unit = "件" }: { title: string; data: { day: string; value: number }[]; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const W = 100 / data.length;
  const label = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return (
    <figure className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)]">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-ink">{title}</span>
        <span className="text-xs text-sub">期間合計 <span className="font-bold text-ink tabular-nums">{total.toLocaleString()}</span>{unit}</span>
      </figcaption>
      <div className="relative mt-4 h-36" onMouseLeave={() => setHover(null)}>
        {/* 補助線（最大値） */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-mute tabular-nums">{max}</span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" role="img" aria-label={`${title}の日別推移`}>
          {data.map((d, i) => {
            const h = (d.value / max) * 100;
            return (
              <g key={d.day}>
                <rect
                  x={i * W + W * 0.12} width={W * 0.76} y={100 - h} height={Math.max(h, d.value ? 1 : 0)}
                  rx={Math.min(1.2, W * 0.3)} fill={SERIES} opacity={hover === null || hover === i ? 1 : 0.35}
                />
                {/* 当たり判定は棒より広く */}
                <rect x={i * W} width={W} y={0} height={100} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 border-t border-line" />
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1 text-[11px] whitespace-nowrap text-white shadow-lg"
            style={{ left: `${Math.min(90, Math.max(10, (hover + 0.5) * W))}%` }}
          >
            {label(data[hover].day)}　<span className="font-bold tabular-nums">{data[hover].value}{unit}</span>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-mute">
        <span>{data[0] && label(data[0].day)}</span>
        <span>{data.at(-1) && label(data.at(-1)!.day)}</span>
      </div>
    </figure>
  );
}

/** 構成比（横棒・値ラベルつき） */
export function BarList({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <figure className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-card)]">
      <figcaption className="text-sm font-bold text-ink">{title}</figcaption>
      <ul className="mt-4 space-y-3">
        {rows.length === 0 && <li className="text-xs text-mute">データがありません</li>}
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 text-xs" title={`${r.label}: ${r.value}人`}>
            <span className="truncate text-sub">{r.label}</span>
            <span className="h-2.5 rounded-r-[4px]" style={{ width: `${(r.value / max) * 100}%`, background: SERIES, minWidth: r.value ? 4 : 0 }} />
            <span className="text-right text-ink tabular-nums">{r.value}<span className="ml-1 text-mute">{Math.round((r.value / total) * 100)}%</span></span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
