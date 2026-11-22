import { expect, test } from "@playwright/test";
import { login, testPng } from "./helpers";

test("いいね返しでマッチ → リアルタイムチャット・既読・画像送信 → 通報とブロック", async ({ browser }) => {
  // デモユーザー（たくみ）には f3 からいいねが届いている（seed）
  const demo = await (await browser.newContext()).newPage();
  await login(demo, "demo@example.com", "Demo12345");

  await demo.goto("/likes");
  await expect(demo.getByText(/人からいいねが届いています/)).toBeVisible(); // 無料会員は相手が伏せられている
  await expect(demo.getByText("🔒").first()).toBeVisible();

  // f3 さんのプロフィールを検索して開き、いいね → マッチ
  const f3 = await (await browser.newContext()).newPage();
  await login(f3, "f3@example.com", "Demo12345");
  await f3.goto("/me");
  const f3Name = (await f3.locator("h1").first().textContent())!.trim();
  await f3.goto("/settings");

  await demo.goto("/search");
  const card = demo.getByRole("link", { name: new RegExp(f3Name) }).first();
  await card.click();
  await expect(demo.getByRole("heading", { name: new RegExp(f3Name) })).toBeVisible();
  await expect(demo.getByText("AIがおすすめする理由").or(demo.getByText("自己紹介")).first()).toBeVisible();
  await demo.getByRole("button", { name: /いいね/ }).click();
  await expect(demo.getByRole("dialog", { name: "マッチング成立" })).toBeVisible();

  // f3 側にマッチ通知がリアルタイムで届く
  await expect(f3.getByText(/マッチングしました/)).toBeVisible();

  // チャット
  await demo.getByRole("dialog", { name: "マッチング成立" }).getByRole("link", { name: "メッセージを送る" }).click();
  await expect(demo).toHaveURL(/\/chat\//);
  const chatUrl = demo.url();
  await demo.getByLabel("メッセージ").fill("はじめまして！E2Eテストです");
  await demo.getByRole("button", { name: "送信" }).click();
  await expect(demo.getByText("はじめまして！E2Eテストです")).toBeVisible();

  // 禁止ワードは送れない
  await demo.getByLabel("メッセージ").fill("LINE IDおしえて");
  await demo.getByRole("button", { name: "送信" }).click();
  await expect(demo.getByText(/送信できない表現/)).toBeVisible();
  await demo.getByLabel("メッセージ").fill("");

  // 相手が開くと「既読」がリアルタイムでつく
  await f3.goto(chatUrl);
  await expect(f3.getByText("はじめまして！E2Eテストです")).toBeVisible();
  await expect(demo.getByText("既読")).toBeVisible();

  // 画像送信（相手にもリアルタイムで届く）
  await demo.locator('input[type=file]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: testPng(500, 400) });
  await expect(demo.getByAltText("送信された画像")).toBeVisible();
  await expect(f3.getByAltText("送信された画像")).toBeVisible();

  // 第三者は URL を知っていてもチャットを見られない
  const other = await (await browser.newContext()).newPage();
  await login(other, "f4@example.com", "Demo12345");
  await other.goto(chatUrl);
  await expect(other.getByText("このトークは表示できません")).toBeVisible();

  // 通報＋ブロック → マッチが消え、メッセージ一覧に戻る
  await f3.getByRole("button", { name: "メニュー" }).click();
  await f3.getByRole("button", { name: "通報する" }).click();
  await f3.getByRole("button", { name: "嫌がらせ・不快な言動" }).click();
  await f3.getByRole("button", { name: "通報する" }).last().click();
  await expect(f3).toHaveURL(/\/messages/);
  await expect(demo).toHaveURL(/\/messages/); // 相手側もマッチ解除をリアルタイムに検知
});
