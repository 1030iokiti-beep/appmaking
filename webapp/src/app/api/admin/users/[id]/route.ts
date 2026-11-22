import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/server/admin-guard";
import { deleteUserCompletely } from "@/lib/server/delete-user";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 管理者によるユーザー削除 */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getAdminId();
  if (!adminId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  if (id === adminId) return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });

  const admin = createAdminClient();
  const { data: target } = await admin.from("admin_users").select("user_id").eq("user_id", id).maybeSingle();
  if (target) return NextResponse.json({ error: "管理者アカウントは削除できません" }, { status: 400 });

  try {
    await deleteUserCompletely(id);
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
  await admin.from("admin_audit_logs").insert({ admin_id: adminId, action: "user.deleted", target_id: id });
  return NextResponse.json({ ok: true });
}
