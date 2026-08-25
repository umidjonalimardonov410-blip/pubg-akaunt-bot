import { expect, test } from "@playwright/test";
import { horizontalOverflow, setupApp, skipIntro } from "./fixtures";

const routes = ["/", "/accounts", "/sell", "/profile", "/transactions", "/orders"];

for (const route of routes) {
  test(`${route} fits the phone screen without sideways scroll`, async ({ page }) => {
    await setupApp(page);
    await page.goto(route);
    await skipIntro(page);

    const overflow = await horizontalOverflow(page);
    expect(overflow.offenders, `overflowing elements on ${route}`).toEqual([]);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
  });
}

test("profile edit opens with a tap-friendly control and saves", async ({ page }) => {
  const calls = await setupApp(page);
  await page.goto("/profile");
  await skipIntro(page);

  const edit = page.getByRole("button", { name: /tahrirlash|edit|редактировать/i }).first();
  await expect(edit).toBeVisible();
  const box = await edit.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(36);

  await edit.click();
  const nameInput = page
    .locator('input[name="name"], input[name="fullName"], input[placeholder*="Ism" i], input[placeholder*="name" i], input[placeholder*="имя" i]')
    .first();
  await expect(nameInput).toBeVisible();
  await nameInput.fill("PRO INSPECTOR");

  await page.getByRole("button", { name: /saqlash|save|сохранить/i }).first().click();
  await expect.poll(() => calls.some(c => c.path === "profile.update")).toBe(true);

  const overflow = await horizontalOverflow(page);
  expect(overflow.offenders).toEqual([]);
});
