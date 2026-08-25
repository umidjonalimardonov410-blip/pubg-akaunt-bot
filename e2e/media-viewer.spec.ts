import { expect, test } from "@playwright/test";
import { horizontalOverflow, setupApp, skipIntro } from "./fixtures";

test("listing media opens full-screen and shows the whole image", async ({ page }) => {
  await setupApp(page);
  await page.goto("/account/1");
  await skipIntro(page);

  const media = page.locator("img").filter({ hasNot: page.locator("[aria-hidden=true]") }).first();
  await expect(media).toBeVisible();
  await media.click();

  const viewer = page.locator('[data-testid="media-viewer"], [role="dialog"]').first();
  await expect(viewer).toBeVisible();

  const shown = viewer.locator("img, video").first();
  await expect(shown).toBeVisible();
  const fit = await shown.evaluate(el => getComputedStyle(el).objectFit);
  expect(["contain", "scale-down"]).toContain(fit);

  const size = await shown.boundingBox();
  const viewport = page.viewportSize()!;
  expect(size!.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(size!.height).toBeLessThanOrEqual(viewport.height + 2);

  const overflow = await horizontalOverflow(page);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden({ timeout: 5000 });
});
