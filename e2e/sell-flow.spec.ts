import { expect, test } from "@playwright/test";
import { horizontalOverflow, setupApp, skipIntro, tinyJpeg } from "./fixtures";

test("seller creates an account listing with media on mobile", async ({ page }) => {
  const calls = await setupApp(page);
  await page.goto("/sell");
  await skipIntro(page);

  const overflow = await horizontalOverflow(page);
  expect(overflow.offenders).toEqual([]);

  const textInputs = page.locator('form input[type="text"], input[type="text"]');
  const count = await textInputs.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < Math.min(count, 3); i++) {
    await textInputs.nth(i).fill("Conqueror Inferno akkaunt");
  }

  const price = page.locator('input[type="number"], input[inputmode="numeric"]').first();
  if (await price.isVisible().catch(() => false)) await price.fill("1499000");

  const description = page.locator("textarea").first();
  if (await description.isVisible().catch(() => false)) {
    await description.fill("M416 Glacier, Level 70, 100+ skin. Pro gamer akkaunt.");
  }

  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    await fileInput.setInputFiles({ name: "shot.jpg", mimeType: "image/jpeg", buffer: tinyJpeg });
    await expect(page.locator("img, video")).not.toHaveCount(0);
  }

  await page.getByRole("button", { name: /joylash|sotish|e.lon|submit|создать|publish|saqlash/i }).first().click();

  await expect.poll(() => calls.some(c => c.path === "accounts.create"), { timeout: 20_000 }).toBe(true);
});
