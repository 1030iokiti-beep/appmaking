import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "プロフィール作成" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data!.claims.sub as string;
  const { data: profile } = await supabase.from("profiles").select("user_id, love_type").eq("user_id", userId).maybeSingle();
  if (profile?.love_type) redirect("/home");
  return <Onboarding userId={userId} hasProfile={!!profile} />;
}
