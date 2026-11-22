"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Tabs<T extends string>({ tabs, value, onChange, id }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="flex rounded-full bg-soft p-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn("relative flex-1 rounded-full py-2 text-sm font-bold transition", value === t.value ? "text-ink" : "text-sub")}
        >
          {value === t.value && <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-full bg-surface shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          <span className="relative">
            {t.label}
            {t.count ? <span className="ml-1 text-brand">{t.count}</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
