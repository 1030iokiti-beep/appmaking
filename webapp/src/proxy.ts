import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ログインが必要なパス
const PROTECTED = [
  "/home", "/search", "/users", "/likes", "/matches", "/messages", "/chat", "/notifications",
  "/me", "/settings", "/onboarding", "/diagnosis", "/verify", "/premium", "/suspended",
];
// ログイン済みなら入らなくてよいパス
const AUTH_ONLY = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // トークンを検証・更新する（必ずレスポンスを作る前に呼ぶ）
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;
  const path = request.nextUrl.pathname;

  const redirect = (to: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = keepNext ? `?next=${encodeURIComponent(path + request.nextUrl.search)}` : "";
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    return redirect("/login", true);
  }
  if (!signedIn && path.startsWith("/admin") && path !== "/admin/login") {
    return redirect("/admin/login");
  }
  if (signedIn && AUTH_ONLY.includes(path)) {
    return redirect("/home");
  }

  // 認証クッキーを含むレスポンスをキャッシュさせない
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};
