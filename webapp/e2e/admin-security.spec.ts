import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const SUPABASE = "http://127.0.0.1:54321";

test("一般ユーザーは管理画面に入れない", async ({ page }) => {
  await login(page, "demo@example.com", "Demo12345");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  // 管理者ログイン画面から一般ユーザーでログインしても弾かれる
  await page.fill("#email", "demo@example.com");
  await page.fill("#password", "Demo12345");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByText("ログインできませんでした")).toBeVisible();
});

test("管理者: 統計・ユーザー検索・利用停止・通報対応", async ({ browser }) => {
  const admin = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await admin.goto("/admin/login");
  await admin.fill("#email", "admin@example.com");
  await admin.fill("#password", "Admin12345");
  await admin.getByRole("button", { name: "ログイン" }).click();
  await expect(admin.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await expect(admin.getByText("登録者数")).toBeVisible();
  await expect(admin.getByText("日別の推移")).toBeVisible();
  await admin.getByRole("button", { name: "表で見る" }).click();
  await expect(admin.getByRole("columnheader", { name: "新規登録" })).toBeVisible();

  // ユーザー検索 → 利用停止
  await admin.goto("/admin/users");
  await admin.getByPlaceholder("メールアドレス・ニックネームで検索").fill("m5@example.com");
  await admin.getByRole("button", { name: "検索" }).click();
  await admin.locator("tbody a").first().click();
  await admin.getByPlaceholder("停止理由（ユーザーに表示されます）").fill("E2Eテストによる停止");
  await admin.getByRole("button", { name: "利用停止にする" }).click();
  await expect(admin.getByText("停止理由：E2Eテストによる停止")).toBeVisible();

  // 停止されたユーザーはアプリを使えない
  const user = await (await browser.newContext()).newPage();
  await user.goto("/login");
  await user.fill("#email", "m5@example.com");
  await user.fill("#password", "Demo12345");
  await user.getByRole("button", { name: "ログイン" }).click();
  await expect(user).toHaveURL(/\/suspended/);
  await expect(user.getByText("E2Eテストによる停止")).toBeVisible();

  // 再開
  await admin.getByRole("button", { name: "利用を再開する" }).click();
  await expect(admin.getByText("利用中").first()).toBeVisible();

  // 通報一覧
  await admin.goto("/admin/reports");
  await expect(admin.getByText("業者・勧誘・外部への誘導").first()).toBeVisible();

  // 年齢確認の審査（書類画像は管理者だけが見られる）
  await admin.goto("/admin/verifications");
  await expect(admin.getByAltText("本人確認書類").first()).toBeVisible();
});

test("API を直接叩いても他人のデータは取れない", async () => {
  const key = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
  // 未ログイン
  const anon = await fetch(`${SUPABASE}/rest/v1/profiles?select=*`, { headers: { apikey: key } });
  expect([401, 403]).toContain(anon.status);

  // 一般ユーザーのトークン
  const auth = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email: "demo@example.com", password: "Demo12345" }),
  }).then((r) => r.json());
  const h = { apikey: key, authorization: `Bearer ${auth.access_token}`, "content-type": "application/json" };

  const profiles = await fetch(`${SUPABASE}/rest/v1/profiles?select=user_id,birthdate,lat,lng`, { headers: h }).then((r) => r.json());
  expect(profiles).toHaveLength(1); // 自分の行だけ

  const stats = await fetch(`${SUPABASE}/rest/v1/rpc/admin_stats`, { method: "POST", headers: h, body: "{}" });
  expect(stats.ok).toBeFalsy();

  const users = await fetch(`${SUPABASE}/rest/v1/users?select=email`, { headers: h }).then((r) => r.json());
  expect(users).toHaveLength(1);

  const internal = await fetch(`${SUPABASE}/rest/v1/rpc/my_taste`, { method: "POST", headers: h, body: JSON.stringify({ uid: auth.user.id }) });
  expect(internal.ok).toBeFalsy();

  // 他人の本人確認書類は取れない
  const docs = await fetch(`${SUPABASE}/storage/v1/object/list/verification-docs`, { method: "POST", headers: h, body: JSON.stringify({ prefix: "" }) }).then((r) => r.json());
  expect(Array.isArray(docs) ? docs.length : 0).toBe(0);
});
