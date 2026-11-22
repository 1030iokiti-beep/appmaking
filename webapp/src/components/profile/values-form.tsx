"use client";

import { Chip } from "@/components/ui/form";
import { VALUE_QUESTIONS } from "@/lib/diagnosis";

export function ValuesForm({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="space-y-5">
      {VALUE_QUESTIONS.map((q) => (
        <fieldset key={q.key}>
          <legend className="mb-2 text-[13px] font-bold">{q.label}</legend>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => (
              <Chip key={o.value} selected={value[q.key] === o.value} onClick={() => onChange({ ...value, [q.key]: o.value })}>
                {o.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
