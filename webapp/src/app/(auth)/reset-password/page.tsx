"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { updatePassword } from "../actions";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  if (state?.ok) {
    return (
      <div className="animate-fade-up space-y-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-3xl">✓</div>
        <h1 className="font-display text-2xl font-bold">{state.ok}</h1>
        <ButtonLink href="/home" size="lg" block>アプリへ</ButtonLink>
      </div>
    );
  }
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold">新しいパスワード</h1>
      <form action={action} className="mt-8 space-y-5">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        <Field label="新しいパスワード" htmlFor="password" hint="8文字以上・英字と数字を含む">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="確認のためもう一度" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <Button type="submit" size="lg" block loading={pending}>変更する</Button>
      </form>
    </div>
  );
}
