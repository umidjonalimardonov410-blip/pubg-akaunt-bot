import { expect, test } from "@playwright/test";
import { setupApp, skipIntro } from "./fixtures";

const openSwitcher = async (page: import("@playwright/test").Page) => {
  const trigger = page
    .locator('[data-testid="language-switcher"], button[aria-label*="til" i], button[aria-label*="lang" i], button[aria-label*="язык" i]')
    .first();
  await expect(trigger).toBeVisible();
  await trigger.click();
};

test("switching to English translates the UI and persists", async ({ page }) => {
  await setupApp(page);
  await page.goto("/");
  await skipIntro(page);

  const before = await page.locator("body").innerText();
  await openSwitcher(page);
  await page.getByTestId("language-option-en").click();

  await expect.poll(async () => (await page.locator("body").innerText()) !== before, { timeout: 10_000 }).toBe(true);
  await expect(page.locator("body")).toContainText(/home|market|profile|wallet|sell/i);

  const stored = await page.evaluate(() => localStorage.getItem("inferno-lang"));
  expect(stored).toMatch(/en/i);

  await page.reload();
  await skipIntro(page);
  await expect(page.locator("body")).toContainText(/home|market|profile|wallet|sell/i);
});

test("switching to Russian translates the UI", async ({ page }) => {
  await setupApp(page);
  await page.goto("/");
  await skipIntro(page);

  await openSwitcher(page);
  await page.getByTestId("language-option-ru").click();

  await expect(page.locator("body")).toContainText(/[а-яА-Я]{3,}/, { timeout: 10_000 });
  const stored = await page.evaluate(() => localStorage.getItem("inferno-lang"));
  expect(stored).toMatch(/ru/i);
});
