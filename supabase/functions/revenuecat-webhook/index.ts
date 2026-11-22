// RevenueCat → Supabase: 課金状態を profiles.premium_until に反映する Edge Function
//
// デプロイ:
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<ランダムな長い文字列>
// RevenueCat ダッシュボード → Integrations → Webhooks で
//   URL:    https://<project>.supabase.co/functions/v1/revenuecat-webhook
//   Header: Authorization: Bearer <同じ文字列>
// アプリ側で Purchases.logIn(<Supabase の user id>) しているので app_user_id = profiles.id

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET")!;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!SECRET || !timingSafeEqual(req.headers.get("Authorization") ?? "", `Bearer ${SECRET}`)) {
    return new Response("unauthorized", { status: 401 });
  }

  const { event } = await req.json();
  const userId: string | undefined = event?.app_user_id;
  if (!userId || !UUID.test(userId)) {
    // 匿名IDなど。200 を返さないと RevenueCat が再送し続ける
    return new Response("ignored", { status: 200 });
  }

  let premiumUntil: string | null | undefined;
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT":
      premiumUntil = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
      break;
    case "EXPIRATION":
      premiumUntil = null;
      break;
    default:
      // CANCELLATION（自動更新オフ）は期限まで有効なので何もしない
      return new Response("noop", { status: 200 });
  }

  const { error } = await supabase.from("profiles").update({ premium_until: premiumUntil }).eq("id", userId);
  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok", { status: 200 });
});
