export function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/** Supabase / PostgREST のエラーを日本語メッセージに */
export function errorMessage(e: unknown): string {
  if (!e) return "エラーが発生しました";
  const msg = typeof e === "string" ? e : typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  const map: Record<string, string> = {
    "Invalid login credentials": "メールアドレスまたはパスワードが正しくありません",
    "Email not confirmed": "メールアドレスの確認が完了していません。届いたメールのリンクを開いてください",
    "User already registered": "このメールアドレスはすでに登録されています",
    forbidden: "この操作は許可されていません",
    "Failed to fetch": "通信できませんでした。電波の良い場所で再度お試しください",
  };
  for (const [k, v] of Object.entries(map)) if (msg.includes(k)) return v;
  if (msg.includes("row-level security")) return "この操作は許可されていません";
  if (msg.includes("Password should")) return "パスワードは8文字以上で、英字と数字を含めてください";
  if (msg.includes("rate limit")) return "短時間に操作が集中しました。しばらく待ってから再度お試しください";
  return msg || "エラーが発生しました";
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function chatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toDateString() === now.toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

/** リダイレクト先として安全な（同一サイト内の）パスか */
export function safeNext(next: string | null | undefined, fallback = "/home") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** 生年月日から満年齢 */
export function ageOf(birthdate: string, now: Date = new Date()) {
  const b = new Date(birthdate);
  let a = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}
