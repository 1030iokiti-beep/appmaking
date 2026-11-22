"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { errorMessage, safeNext } from "@/lib/utils";

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

const email = z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません").max(254);
const password = z
  .string()
  .min(8, "パスワードは8文字以上にしてください")
  .max(72, "パスワードは72文字以内にしてください")
  .regex(/[A-Za-z]/, "パスワードに英字を含めてください")
  .regex(/[0-9]/, "パスワードに数字を含めてください");

async function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, "パスワードを入力してください") }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(form.get("email") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: errorMessage(error), email: parsed.data.email };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      email,
      password,
      adult: z.literal("on", { message: "18歳以上であることを確認してください" }),
      terms: z.literal("on", { message: "利用規約とプライバシーポリシーへの同意が必要です" }),
    })
    .safeParse({ email: form.get("email"), password: form.get("password"), adult: form.get("adult"), terms: form.get("terms") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(form.get("email") ?? "") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: errorMessage(error), email: parsed.data.email };
  // メール確認が無効な環境ではそのままログイン状態になる
  if (data.session) redirect("/onboarding");
  // 既存メールアドレスでも同じ表示にする（登録済みかどうかを第三者に知られないため）
  return { ok: "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。", email: parsed.data.email };
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/reset-password`,
  });
  // レート制限以外のエラーは表示を変えない（アカウントの存在を推測されないため）
  if (error && error.message.includes("rate limit")) return { error: errorMessage(error) };
  return { ok: "パスワード再設定用のメールを送信しました（登録されている場合のみ届きます）。" };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "確認用パスワードが一致しません" })
    .safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "リンクの有効期限が切れています。もう一度パスワード再設定をお申し込みください" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: errorMessage(error) };
  return { ok: "パスワードを変更しました" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
