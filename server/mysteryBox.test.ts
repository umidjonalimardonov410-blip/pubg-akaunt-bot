/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  MYSTERY_BOX_PRICE,
  MYSTERY_DAILY_GLOBAL_LIMIT,
  MYSTERY_DAILY_USER_LIMIT,
  MYSTERY_UC_AMOUNTS,
  checkMysteryAvailability,
  generateBoxCode,
  prizeLabel,
  rollMysteryPrize,
  rollUcAmount,
} from "./mysteryBox";

describe("mystery box", () => {
  it("keeps the box price at 50 000", () => {
    expect(MYSTERY_BOX_PRICE).toBe(50_000);
  });

  it("rolls prizes by weight and always returns a valid kind", () => {
    expect(rollMysteryPrize(() => 0)).toBe("empty");
    expect(rollMysteryPrize(() => 0.99)).toBe("account");
    const counts: Record<string, number> = {};
    for (let i = 0; i < 5000; i += 1) {
      const kind = rollMysteryPrize();
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual(["account", "empty", "promo", "uc"]);
    expect(counts.empty).toBeGreaterThan(counts.account);
  });

  it("only returns known UC amounts", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(MYSTERY_UC_AMOUNTS).toContain(rollUcAmount() as (typeof MYSTERY_UC_AMOUNTS)[number]);
    }
  });

  it("generates readable codes without confusing characters", () => {
    const code = generateBoxCode("BOX", 6, () => 0.42);
    expect(code.startsWith("BOX-")).toBe(true);
    expect(code).toHaveLength(10);
    expect(/[01OI]/.test(code.slice(4))).toBe(false);
  });

  it("enforces the daily global and per-user limits", () => {
    expect(checkMysteryAvailability({ globalToday: 0, userToday: 0 })).toMatchObject({ canOpen: true, reason: "ok" });
    expect(checkMysteryAvailability({ globalToday: MYSTERY_DAILY_GLOBAL_LIMIT, userToday: 0 })).toMatchObject({
      canOpen: false,
      reason: "global_limit",
    });
    expect(checkMysteryAvailability({ globalToday: 1, userToday: MYSTERY_DAILY_USER_LIMIT })).toMatchObject({
      canOpen: false,
      reason: "user_limit",
    });
  });

  it("builds a human readable prize label", () => {
    expect(prizeLabel("uc", "325")).toBe("325 UC kodi");
    expect(prizeLabel("promo", "BOX-AB12CD")).toContain("10%");
    expect(prizeLabel("empty")).toContain("Bo'sh quti");
  });
});
