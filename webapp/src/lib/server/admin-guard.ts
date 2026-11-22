import "server-only";
import { createClient } from "@/lib/supabase/server";

/** 管理者本人であることを確認（DB の is_admin() で判定。クライアントの申告は信用しない） */
export async function getAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub as string | undefined;
  if (!uid) return null;
  const { data: ok } = await supabase.rpc("is_admin");
  return ok ? uid : null;
}
