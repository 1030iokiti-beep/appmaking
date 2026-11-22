import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/server";

/** ログイン済み・利用可能・プロフィール作成済みのユーザーだけが入れる領域 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: status } = await supabase.rpc("get_my_status").single();
  if (!status) redirect("/login");
  if (status.status === "suspended") redirect("/suspended");
  if (!status.has_profile) redirect("/onboarding");

  return (
    <AppShell userId={userId} initialStatus={status}>
      {children}
    </AppShell>
  );
}
