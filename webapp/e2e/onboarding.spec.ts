import { expect, test } from "@playwright/test";
import { latestMailLink, testPng } from "./helpers";

test("新規登録 → メール確認 → プロフィール作成（写真・診断・価値観・位置情報）→ おすすめ表示", async ({ browser }) => {
  const context = await browser.newContext({ geolocation: { latitude: 35.6581, longitude: 139.7017 }, permissions: ["geolocation"] });
  const page = await context.newPage();
  const email = `e2e-${Date.now()}@example.com`;

  // 登録
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", "Passw0rd123");
  await page.getByRole("checkbox", { name: "18歳以上で、高校生ではありません" }).check();
  await page.getByRole("checkbox", { name: /利用規約/ }).check();
  await page.getByRole("button", { name: "無料で登録する" }).click();
  await expect(page.getByText("メールを確認してください")).toBeVisible();

  // メールのリンクを開く（ローカルの Mailpit に届く）
  await page.goto(await latestMailLink(email));
  await expect(page).toHaveURL(/\/onboarding/);

  // STEP1 基本情報
  await page.fill("#display_name", "テスト花子");
  await page.fill("#birthdate", "1996-04-01");
  await page.getByRole("button", { name: "女性" }).first().click();
  await page.locator("fieldset", { hasText: "出会いたい相手" }).getByRole("button", { name: "男性" }).click();
  await page.selectOption("#prefecture", "東京都");
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP2 写真（EXIF を消すため再エンコードされてアップロードされる）
  await expect(page.getByText("写真を登録しましょう")).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: testPng() });
  await expect(page.getByText("メイン")).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP3 恋愛タイプ診断（20問）
  for (let i = 0; i < 20; i++) {
    await page.getByRole("radio", { name: i % 2 ? "ややあてはまる" : "あまりあてはまらない" }).click();
    await page.waitForTimeout(260);
  }
  await expect(page.getByText("あなたの恋愛タイプは…")).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP4 価値観
  for (const label of ["2〜3年以内に", "ほしい", "その時の気分", "毎日したい", "バランス型", "たまに飲む", "吸わない"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP5 趣味
  await page.getByRole("button", { name: "カフェ", exact: true }).click();
  await page.getByRole("button", { name: "映画", exact: true }).click();
  await page.getByRole("button", { name: "次へ" }).click();

  // STEP6 位置情報
  await page.getByRole("button", { name: /現在地を使う/ }).click();
  await expect(page.getByText("位置情報を設定済みです")).toBeVisible();
  await page.getByRole("button", { name: "はじめる" }).click();

  // おすすめ（男性のデモユーザーが AI 相性つきで表示される）
  await expect(page).toHaveURL(/\/home/);
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.getByLabel(/AI相性 \d+%/).first()).toBeVisible();

  // スワイプ（ドラッグ）でスキップ → いいね
  const card = page.locator("article").last();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 250, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.getByRole("button", { name: "いいね", exact: true }).click();
  await page.goto("/likes");
  await page.getByRole("tab", { name: /送ったいいね/ }).click();
  await expect(page.getByRole("button", { name: "取り消す" })).toHaveCount(1);

  // 年齢確認前はメッセージ機能が使えないことを案内
  await page.goto("/verify");
  await expect(page.getByText("未提出")).toBeVisible();
  await context.close();
});
