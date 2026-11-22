import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function SuspendedPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("status, suspended_reason").maybeSingle();
  if (data?.status !== "suspended") redirect("/home");
  return (
    <div className="mt-16 space-y-5 rounded-[var(--radius-card)] bg-surface p-8 text-center shadow-[var(--shadow-card)]">
      <div className="text-4xl">🔒</div>
      <h1 className="font-display text-2xl font-bold">ご利用を停止しています</h1>
      <p className="text-sm leading-relaxed text-sub">
        利用規約に違反する行為が確認されたため、アカウントのご利用を停止しました。
        {data.suspended_reason && <><br />理由：{data.suspended_reason}</>}
      </p>
      <p className="text-xs text-mute">お心当たりがない場合はお問い合わせ窓口までご連絡ください。</p>
      <form action={signOut}><Button variant="secondary" block>ログアウト</Button></form>
    </div>
  );
}
