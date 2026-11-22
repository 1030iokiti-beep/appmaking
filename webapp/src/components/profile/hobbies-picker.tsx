"use client";

import { useState } from "react";
import { Chip, Input } from "@/components/ui/form";
import { HOBBY_SUGGESTIONS } from "@/lib/constants";

export function HobbiesPicker({ value, onChange, max = 10 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [custom, setCustom] = useState("");
  const all = Array.from(new Set([...HOBBY_SUGGESTIONS, ...value]));
  const add = () => {
    const v = custom.trim().slice(0, 20);
    if (v && !value.includes(v) && value.length < max) onChange([...value, v]);
    setCustom("");
  };
  const toggle = (h: string) => onChange(value.includes(h) ? value.filter((x) => x !== h) : value.length >= max ? value : [...value, h]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {all.map((h) => (
          <Chip key={h} selected={value.includes(h)} onClick={() => toggle(h)}>
            {h}
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="その他の趣味を追加"
          maxLength={20}
          className="h-10 text-sm"
        />
        <button type="button" onClick={add} className="shrink-0 rounded-full bg-ink px-4 text-sm font-bold text-white">追加</button>
      </div>
      <p className="text-xs text-mute">{value.length}/{max}個 選択中</p>
    </div>
  );
}
