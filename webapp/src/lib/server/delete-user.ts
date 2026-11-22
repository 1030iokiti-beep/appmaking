import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** ユーザーの画像とアカウントを完全に削除（DBの関連行は外部キーでカスケード削除） */
export async function deleteUserCompletely(userId: string) {
  const admin = createAdminClient();
  const removeFolder = async (bucket: string, folder: string) => {
    const { data: files } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${folder}/${f.name}`));
  };
  await removeFolder("profile-images", userId);
  await removeFolder("verification-docs", userId);
  const { data: matches } = await admin.from("matches").select("id").or(`user_a.eq.${userId},user_b.eq.${userId}`);
  for (const m of matches ?? []) await removeFolder("chat-images", m.id);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}
