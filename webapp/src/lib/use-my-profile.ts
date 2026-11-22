"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

let cached: { id: string; profile: Profile; photo: string | null } | null = null;

/** 自分のプロフィール（共通点のハイライトなどに使う） */
export function useMyProfile(userId: string) {
  const [data, setData] = useState(cached?.id === userId ? cached : null);
  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("profile_images").select("storage_path").eq("user_id", userId).order("position").limit(1),
    ]).then(([p, img]) => {
      if (!alive || !p.data) return;
      cached = { id: userId, profile: p.data, photo: img.data?.[0]?.storage_path ?? null };
      setData(cached);
    });
    return () => {
      alive = false;
    };
  }, [userId]);
  return data;
}

export function invalidateMyProfile() {
  cached = null;
}
