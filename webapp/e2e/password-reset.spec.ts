import { expect, test } from "@playwright/test";
import { latestMailLink, login } from "./helpers";

test("パスワード再設定メール → 新しいパスワードでログイン", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.fill("#email", "m7@example.com");
  await page.getByRole("button", { name: "送信する" }).click();
  await expect(page.getByText("パスワード再設定用のメールを送信しました")).toBeVisible();

  await page.goto(await latestMailLink("m7@example.com"));
  await expect(page).toHaveURL(/\/reset-password/);
  await page.fill("#password", "NewPassw0rd");
  await page.fill("#confirm", "NewPassw0rd");
  await page.getByRole("button", { name: "変更する" }).click();
  await expect(page.getByText("パスワードを変更しました")).toBeVisible();

  await page.context().clearCookies();
  await login(page, "m7@example.com", "NewPassw0rd");
});
