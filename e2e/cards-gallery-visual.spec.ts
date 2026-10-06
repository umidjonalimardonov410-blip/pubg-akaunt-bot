import { expect, test } from "@playwright/test";
import { horizontalOverflow, setupApp, skipIntro } from "./fixtures";

const viewports = [
  { name: "360px", width: 360, height: 740 },
  { name: "390px", width: 390, height: 844 },
  { name: "420px", width: 420, height: 890 },
];

for (const vp of viewports) {
  test.describe(`Responsive Cards and Gallery (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`renders cards grid and maintains zero horizontal overflow on ${vp.name}`, async ({ page }) => {
      await setupApp(page);
      await page.goto("/");
      await skipIntro(page);

      // Verify listing cards exist
      const card = page.locator("article.pubg-card").first();
      await expect(card).toBeVisible({ timeout: 10000 });

      // Check card width is responsive and fits within screen
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeLessThan(vp.width);
      expect(box!.width).toBeGreaterThan(80);

      // Verify no horizontal overflow
      const overflow = await horizontalOverflow(page);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);

      // Visual snapshot of the cards section
      await expect(page).toHaveScreenshot(`cards-grid-${vp.name}.png`, {
        maxDiffPixelRatio: 0.15,
        animations: "disabled",
      });
    });

    test(`opens fullscreen gallery properly and fits screen on ${vp.name}`, async ({ page }) => {
      await setupApp(page);
      await page.goto("/");
      await skipIntro(page);

      const card = page.locator("article.pubg-card").first();
      await expect(card).toBeVisible();

      // Click card image to trigger fullscreen gallery (force: true avoids motion instability)
      const cardImg = card.locator("img[role='button']").first();
      await expect(cardImg).toBeVisible();
      await cardImg.click({ force: true });

      // Gallery dialog should be visible
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Gallery image should be contained inside dialog
      const galleryImg = dialog.locator("img").first();
      await expect(galleryImg).toBeVisible();
      const imgBox = await galleryImg.boundingBox();
      expect(imgBox).not.toBeNull();
      expect(imgBox!.width).toBeLessThanOrEqual(vp.width + 2);

      // Visual snapshot of open gallery
      await expect(page).toHaveScreenshot(`gallery-open-${vp.name}.png`, {
        maxDiffPixelRatio: 0.15,
        animations: "disabled",
      });

      // Close gallery
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden({ timeout: 5000 });
    });
  });
}

test("shows compact fallback and retries when card image fails to load", async ({ page }) => {
  await setupApp(page);
  // Abort image requests for pubg card assets to trigger onError fallback
  await page.route("**/pubg-card-*.jpg", route => route.abort("failed"));

  await page.goto("/");
  await skipIntro(page);

  // Fallback alert should appear
  const fallback = page.locator('[data-testid^="listing-card-fallback-"]').first();
  await expect(fallback).toBeVisible({ timeout: 10000 });
  await expect(fallback).toContainText("Rasm yuklanmadi");

  // Retry button is available and clickable
  const retryBtn = fallback.locator('[data-testid^="listing-card-retry-"]').first();
  await expect(retryBtn).toBeVisible();

  // Re-enable routing
  await page.unroute("**/pubg-card-*.jpg");
  await retryBtn.click();
});
