/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  FLASH_MAX_DISCOUNT,
  FLASH_MIN_DISCOUNT,
  countdownLabel,
  discountedPrice,
  isFlashWindow,
  nextFlashStart,
  rollDiscountPercent,
  selectFlashAccounts,
  tashkentDayKey,
  tashkentHour,
} from "./flashSale";

describe("flash sale scheduling", () => {
  it("uses Tashkent time for the daily key and hour", () => {
    // 2026-08-27 16:30 UTC = 21:30 Toshkent
    const date = new Date("2026-08-27T16:30:00Z");
    expect(tashkentHour(date)).toBe(21);
    expect(tashkentDayKey(date)).toBe("2026-08-27");
    // 2026-08-27 20:30 UTC = 01:30 (28-avgust) Toshkent
    expect(tashkentDayKey(new Date("2026-08-27T20:30:00Z"))).toBe("2026-08-28");
  });

  it("opens the window only between 20:00 and 21:00 Tashkent time", () => {
    expect(isFlashWindow(new Date("2026-08-27T15:00:00Z"))).toBe(true); // 20:00
    expect(isFlashWindow(new Date("2026-08-27T15:59:00Z"))).toBe(true); // 20:59
    expect(isFlashWindow(new Date("2026-08-27T16:00:00Z"))).toBe(false); // 21:00
    expect(isFlashWindow(new Date("2026-08-27T09:00:00Z"))).toBe(false); // 14:00
  });

  it("computes the next 20:00 start in the future", () => {
    const now = new Date("2026-08-27T09:00:00Z");
    expect(nextFlashStart(now).toISOString()).toBe("2026-08-27T15:00:00.000Z");
    const evening = new Date("2026-08-27T16:10:00Z");
    expect(nextFlashStart(evening).toISOString()).toBe("2026-08-28T15:00:00.000Z");
  });

  it("rolls a discount between 10% and 15%", () => {
    expect(rollDiscountPercent(() => 0)).toBe(FLASH_MIN_DISCOUNT);
    expect(rollDiscountPercent(() => 0.999)).toBe(FLASH_MAX_DISCOUNT);
    for (let i = 0; i < 200; i += 1) {
      const value = rollDiscountPercent();
      expect(value).toBeGreaterThanOrEqual(FLASH_MIN_DISCOUNT);
      expect(value).toBeLessThanOrEqual(FLASH_MAX_DISCOUNT);
    }
  });

  it("rounds the sale price to the nearest 1000", () => {
    expect(discountedPrice(500_000, 10)).toBe(450_000);
    expect(discountedPrice(333_333, 15)).toBe(283_000);
    expect(discountedPrice(2_000, 15)).toBe(2_000);
  });

  it("picks three accounts and prefers popular verified listings", () => {
    const candidates = [
      { id: 1, price: 100_000, viewCount: 500, isVerified: true },
      { id: 2, price: 200_000, viewCount: 5, isVerified: false },
      { id: 3, price: 300_000, viewCount: 300, isVerified: true },
      { id: 4, price: 0, viewCount: 900, isVerified: true },
      { id: 5, price: 150_000, viewCount: 200, isVerified: false },
    ];
    const picked = selectFlashAccounts(candidates, 3, () => 0.5);
    expect(picked).toHaveLength(3);
    expect(picked.map(item => item.id)).not.toContain(4); // narxsiz e'lon tushmaydi
    expect(picked.map(item => item.id)).toContain(1);
  });

  it("formats the countdown", () => {
    expect(countdownLabel(0)).toBe("00:00:00");
    expect(countdownLabel(3_723_000)).toBe("01:02:03");
    expect(countdownLabel(-5000)).toBe("00:00:00");
  });
});
