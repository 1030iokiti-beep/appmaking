import { NextResponse } from "next/server";
import { deleteUserCompletely } from "@/lib/server/delete-user";
import { createClient } from "@/lib/supabase/server";

/** 退会（アカウントと関連データの完全削除） */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 誤操作防止の確認文字列
  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== "退会する") return NextResponse.json({ error: "確認の文字列が正しくありません" }, { status: 400 });

  try {
    await deleteUserCompletely(userId);
  } catch {
    return NextResponse.json({ error: "退会処理に失敗しました。時間をおいて再度お試しください" }, { status: 500 });
  }
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
