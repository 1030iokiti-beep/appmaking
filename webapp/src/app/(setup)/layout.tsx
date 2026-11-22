import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getUserId } from "@/lib/supabase/server";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  if (!(await getUserId())) redirect("/login");
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-xl items-center px-5 py-4"><Logo /></header>
      <main className="mx-auto max-w-xl px-5 pb-16">{children}</main>
    </div>
  );
}
