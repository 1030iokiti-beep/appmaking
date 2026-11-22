"use client";

import { Chip, Field, Input, Select, Textarea } from "@/components/ui/form";
import { GENDERS, PREFECTURES, type Gender } from "@/lib/constants";

export type Basics = {
  display_name: string;
  birthdate: string;
  gender: Gender | "";
  seeking: Gender[];
  prefecture: string;
  city: string;
  occupation: string;
  height: string;
  bio: string;
};

export const emptyBasics: Basics = {
  display_name: "", birthdate: "", gender: "", seeking: [], prefecture: "", city: "", occupation: "", height: "", bio: "",
};

export function ageFrom(birthdate: string) {
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return NaN;
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

export function validateBasics(v: Basics, step: "required" | "all" = "all"): string | null {
  if (!v.display_name.trim()) return "ニックネームを入力してください";
  if (!v.birthdate) return "生年月日を入力してください";
  const age = ageFrom(v.birthdate);
  if (isNaN(age)) return "生年月日を正しく入力してください";
  if (age < 18) return "18歳未満の方はご利用いただけません";
  if (age > 100) return "生年月日を正しく入力してください";
  if (!v.gender) return "性別を選んでください";
  if (v.seeking.length === 0) return "出会いたい相手の性別を選んでください";
  if (!v.prefecture) return "居住地を選んでください";
  if (step === "all" && v.height && (Number(v.height) < 120 || Number(v.height) > 230)) return "身長は120〜230cmで入力してください";
  return null;
}

export function BasicsForm({ value, onChange, lockGender, lockBirthdate, showDetails }: {
  value: Basics; onChange: (v: Basics) => void; lockGender?: boolean; lockBirthdate?: boolean; showDetails?: boolean;
}) {
  const set = <K extends keyof Basics>(k: K, v: Basics[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <Field label="ニックネーム" htmlFor="display_name" hint="20文字以内。本名は避けるのがおすすめです">
        <Input id="display_name" value={value.display_name} onChange={(e) => set("display_name", e.target.value)} maxLength={20} autoComplete="nickname" />
      </Field>
      <Field label="生年月日" htmlFor="birthdate" hint={lockBirthdate ? "年齢確認の申請後は変更できません" : "他の人には年齢だけが表示されます"}>
        <Input id="birthdate" type="date" value={value.birthdate} onChange={(e) => set("birthdate", e.target.value)} disabled={lockBirthdate} max={new Date().toISOString().slice(0, 10)} />
      </Field>
      <fieldset disabled={lockGender}>
        <legend className="mb-2 text-[13px] font-bold">性別{lockGender && <span className="ml-2 font-normal text-mute">（変更できません）</span>}</legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Chip key={g.value} selected={value.gender === g.value} onClick={() => set("gender", g.value)} disabled={lockGender}>
              {g.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-bold">出会いたい相手（複数選択可）</legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Chip
              key={g.value}
              selected={value.seeking.includes(g.value)}
              onClick={() => set("seeking", value.seeking.includes(g.value) ? value.seeking.filter((x) => x !== g.value) : [...value.seeking, g.value])}
            >
              {g.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="居住地" htmlFor="prefecture">
          <Select id="prefecture" value={value.prefecture} onChange={(e) => set("prefecture", e.target.value)}>
            <option value="">選択</option>
            {PREFECTURES.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="市区町村（任意）" htmlFor="city">
          <Input id="city" value={value.city} onChange={(e) => set("city", e.target.value)} maxLength={30} placeholder="渋谷区" />
        </Field>
      </div>
      {showDetails && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="職業（任意）" htmlFor="occupation">
              <Input id="occupation" value={value.occupation} onChange={(e) => set("occupation", e.target.value)} maxLength={40} />
            </Field>
            <Field label="身長（任意）" htmlFor="height">
              <Input id="height" type="number" inputMode="numeric" min={120} max={230} value={value.height} onChange={(e) => set("height", e.target.value)} placeholder="cm" />
            </Field>
          </div>
          <Field label="自己紹介" htmlFor="bio" hint={`${value.bio.length}/1000　連絡先（LINE ID・電話番号など）は書けません`}>
            <Textarea id="bio" value={value.bio} onChange={(e) => set("bio", e.target.value)} maxLength={1000} rows={5} placeholder="休日の過ごし方や好きなこと、どんな人と出会いたいかなど" />
          </Field>
        </>
      )}
    </div>
  );
}
