"use client";

import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { adminSignIn } from "../actions";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminSignIn, undefined);
  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-5">
      <div className="w-full max-w-sm rounded-[2rem] bg-surface p-8 shadow-2xl">
        <Logo />
        <p className="mt-2 text-xs font-bold tracking-widest text-gold">ADMIN CONSOLE</p>
        <h1 className="mt-6 font-display text-2xl font-bold">管理者ログイン</h1>
        <form action={action} className="mt-6 space-y-4">
          {state?.error && <Alert tone="error">{state.error}</Alert>}
          <Field label="メールアドレス" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
          <Field label="パスワード" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
          <Button type="submit" variant="gold" size="lg" block loading={pending}>ログイン</Button>
        </form>
        <p className="mt-6 text-center text-[11px] text-mute">このページは運営スタッフ専用です。操作はすべて記録されます。</p>
      </div>
    </div>
  );
}
