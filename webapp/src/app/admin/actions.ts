"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AdminLoginState = { error?: string } | undefined;

export async function adminSignIn(_: AdminLoginState, form: FormData): Promise<AdminLoginState> {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "メールアドレスとパスワードを入力してください" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // 失敗理由は区別して返さない（管理者アカウントの存在を推測されないため）
  if (error) return { error: "ログインできませんでした" };
  const { data: ok } = await supabase.rpc("is_admin");
  if (!ok) {
    await supabase.auth.signOut();
    return { error: "ログインできませんでした" };
  }
  redirect("/admin");
}

export async function adminSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
