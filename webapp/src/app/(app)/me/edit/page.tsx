"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "@/components/app/status-context";
import { BasicsForm, validateBasics, type Basics } from "@/components/profile/basics-form";
import { HobbiesPicker } from "@/components/profile/hobbies-picker";
import { LocationButton } from "@/components/profile/location-button";
import { PhotoManager } from "@/components/profile/photo-manager";
import { ValuesForm } from "@/components/profile/values-form";
import { Button } from "@/components/ui/button";
import { Alert, PageLoading } from "@/components/ui/feedback";
import { Card, Chip, Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { Gender } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { invalidateMyProfile } from "@/lib/use-my-profile";
import { errorMessage } from "@/lib/utils";

const DISTANCES = [null, 10, 30, 50, 100, 300];

export default function EditProfilePage() {
  const { userId } = useMe();
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [basics, setBasics] = useState<Basics | null>(null);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [ageMin, setAgeMin] = useState(20);
  const [ageMax, setAgeMax] = useState(50);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient().from("profiles").select("*").eq("user_id", userId).single().then(({ data }) => {
      if (!data) return;
      setProfile(data);
      setBasics({
        display_name: data.display_name, birthdate: data.birthdate, gender: data.gender as Gender, seeking: data.seeking as Gender[],
        prefecture: data.prefecture, city: data.city, occupation: data.occupation, height: data.height ? String(data.height) : "", bio: data.bio,
      });
      setHobbies(data.hobbies);
      setValues(data.value_answers as Record<string, string>);
      setAgeMin(data.pref_age_min);
      setAgeMax(data.pref_age_max);
      setMaxDistance(data.pref_max_distance_km);
    });
  }, [userId]);

  async function save() {
    if (!basics || !profile) return;
    const v = validateBasics(basics);
    if (v) return setError(v);
    if (ageMin > ageMax) return setError("年齢の範囲を正しく設定してください");
    setError(null);
    setBusy(true);
    const { error } = await createClient().from("profiles").update({
      display_name: basics.display_name.trim(),
      birthdate: basics.birthdate,
      seeking: basics.seeking,
      prefecture: basics.prefecture,
      city: basics.city.trim(),
      occupation: basics.occupation.trim(),
      height: basics.height ? Number(basics.height) : null,
      bio: basics.bio.trim(),
      hobbies,
      value_answers: values,
      pref_age_min: ageMin,
      pref_age_max: ageMax,
      pref_max_distance_km: maxDistance,
    }).eq("user_id", userId);
    setBusy(false);
    if (error) return setError(errorMessage(error));
    invalidateMyProfile();
    toast("プロフィールを保存しました", "success");
    router.push("/me");
  }

  if (!profile || !basics) return <PageLoading />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">プロフィール編集</h1>

      <Card className="space-y-4">
        <h2 className="font-bold">写真</h2>
        <PhotoManager userId={userId} onChange={invalidateMyProfile} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">基本情報・自己紹介</h2>
        <BasicsForm value={basics} onChange={setBasics} lockGender lockBirthdate={profile.verification_status !== "unverified"} showDetails />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">趣味</h2>
        <HobbiesPicker value={hobbies} onChange={setHobbies} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">価値観</h2>
        <ValuesForm value={values} onChange={setValues} />
      </Card>

      <Card className="space-y-5">
        <h2 className="font-bold">おすすめの条件</h2>
        <Field label={`お相手の年齢：${ageMin}〜${ageMax}歳`}>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={18} max={100} value={ageMin} onChange={(e) => setAgeMin(Math.min(100, Math.max(18, Number(e.target.value) || 18)))} aria-label="年齢の下限" />
            <Input type="number" min={18} max={100} value={ageMax} onChange={(e) => setAgeMax(Math.min(100, Math.max(18, Number(e.target.value) || 100)))} aria-label="年齢の上限" />
          </div>
        </Field>
        <Field label="距離">
          <div className="flex flex-wrap gap-2">
            {DISTANCES.map((d) => (
              <Chip key={String(d)} selected={maxDistance === d} onClick={() => setMaxDistance(d)}>{d ? `${d}km以内` : "指定しない"}</Chip>
            ))}
          </div>
        </Field>
        <Field label="位置情報">
          <LocationButton userId={userId} hasLocation={profile.lat != null} onSaved={invalidateMyProfile} />
        </Field>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      <div className="sticky bottom-24 z-20 lg:bottom-6">
        <Button size="lg" block onClick={save} loading={busy}>保存する</Button>
      </div>
    </div>
  );
}
