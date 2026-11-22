import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminId } from "@/lib/server/admin-guard";

export const metadata = { title: "管理画面", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdminId())) redirect("/admin/login");
  return (
    <div className="min-h-dvh bg-[#f5f3f2] lg:flex">
      <AdminNav />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
