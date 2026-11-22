"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { signUp } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);

  if (state?.ok) {
    return (
      <div className="animate-fade-up text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-brand-soft text-3xl">✉️</div>
        <h1 className="font-display text-2xl font-bold">メールを確認してください</h1>
        <p className="mt-3 text-sm leading-relaxed text-sub">
          <span className="font-bold text-ink">{state.email}</span> に確認メールを送信しました。
          <br />
          メール内のリンクを開くと登録が完了します。
        </p>
        <p className="mt-6 text-xs text-mute">メールが届かない場合は迷惑メールフォルダもご確認ください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold">はじめましょう</h1>
      <p className="mt-2 text-sm text-sub">登録は無料。3分の診断で、AIが相性のいい人を探します。</p>
      <form action={action} className="mt-8 space-y-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        <Field label="メールアドレス" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} />
        </Field>
        <Field label="パスワード" htmlFor="password" hint="8文字以上・英字と数字を含む">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="adult" className="mt-0.5 size-5 accent-[var(--color-brand)]" required />
          <span>18歳以上で、高校生ではありません</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 size-5 accent-[var(--color-brand)]" required />
          <span>
            <Link href="/terms" target="_blank" className="font-bold text-brand hover:underline">利用規約</Link>と
            <Link href="/privacy" target="_blank" className="font-bold text-brand hover:underline">プライバシーポリシー</Link>に同意します
          </span>
        </label>
        <Button type="submit" size="lg" block loading={pending}>無料で登録する</Button>
      </form>
      <p className="mt-8 text-center text-sm text-sub">
        アカウントをお持ちの方は <Link href="/login" className="font-bold text-brand hover:underline">ログイン</Link>
      </p>
    </div>
  );
}
