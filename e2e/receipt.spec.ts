import { expect, test } from "@playwright/test";
import { setupApp, skipIntro, tinyJpeg } from "./fixtures";

test("user uploads a receipt and sees its pending status", async ({ page }) => {
  const calls = await setupApp(page);
  await page.goto("/profile");
  await skipIntro(page);

  const openTopup = page.getByRole("button", { name: /to.ldirish|chek|balans|пополн|top ?up/i }).first();
  if (await openTopup.isVisible().catch(() => false)) await openTopup.click();

  const amount = page.getByTestId("receipt-amount");
  await expect(amount).toBeVisible();
  await amount.fill("137000");

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({ name: "chek.jpg", mimeType: "image/jpeg", buffer: tinyJpeg });

  await page.getByRole("button", { name: /yuborish|submit|отправить/i }).first().click();

  await expect.poll(() => calls.find(c => c.path === "wallet.submitReceipt")?.input as any, { timeout: 15_000 })
    .toMatchObject({ amount: 137000 });

  await expect(page.locator("body")).toContainText(/kutilmoqda|pending|ожид|yuborildi|qabul/i, { timeout: 10_000 });
});

test("admin sees the pending receipt and approves it", async ({ page }) => {
  const calls = await setupApp(page, { admin: true });
  await page.goto("/admin");
  await skipIntro(page);

  const receiptsTab = page.getByRole("button", { name: /chek|receipt|квитан|to.ldirish/i }).first();
  if (await receiptsTab.isVisible().catch(() => false)) await receiptsTab.click();

  await expect(page.locator("body")).toContainText(/137[  ]?000/, { timeout: 15_000 });

  await page.getByRole("button", { name: /tasdiqlash|approve|подтверд/i }).first().click();

  await expect.poll(() => calls.find(c => c.path === "admin.reviewDepositReceipt")?.input as any, { timeout: 15_000 })
    .toBeTruthy();
});
