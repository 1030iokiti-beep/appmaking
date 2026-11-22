"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold">パスワード再設定</h1>
      <p className="mt-2 text-sm text-sub">登録したメールアドレスに、再設定用のリンクをお送りします。</p>
      <form action={action} className="mt-8 space-y-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.ok}</Alert>}
        <Field label="メールアドレス" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Button type="submit" size="lg" block loading={pending}>送信する</Button>
      </form>
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="font-bold text-brand hover:underline">ログインに戻る</Link>
      </p>
    </div>
  );
}
