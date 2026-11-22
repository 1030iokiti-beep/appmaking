"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { signIn } from "../actions";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold">おかえりなさい</h1>
      <p className="mt-2 text-sm text-sub">メールアドレスとパスワードでログイン</p>
      <form action={action} className="mt-8 space-y-5">
        <input type="hidden" name="next" value={next ?? ""} />
        {linkError && <Alert tone="error">リンクが無効か、有効期限が切れています。もう一度お試しください。</Alert>}
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        <Field label="メールアドレス" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} />
        </Field>
        <Field label="パスワード" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="text-right">
          <Link href="/forgot-password" className="text-[13px] font-medium text-brand hover:underline">パスワードを忘れた方</Link>
        </div>
        <Button type="submit" size="lg" block loading={pending}>ログイン</Button>
      </form>
      <p className="mt-8 text-center text-sm text-sub">
        はじめての方は <Link href="/signup" className="font-bold text-brand hover:underline">新規登録（無料）</Link>
      </p>
    </div>
  );
}
