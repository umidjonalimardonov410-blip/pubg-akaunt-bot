import { describe, expect, it } from "vitest";
import { estimateAccountPrice } from "./ProRouters";

describe("Inferno Stealth Pro features", () => {
  it("calculates a stable price range from account quality signals", () => {
    const estimate = estimateAccountPrice({ level: 60, kd: 3.5, skinsCount: 15, hasM416Glacier: true, hasXSuit: false });
    expect(estimate.recommended).toBeGreaterThan(0);
    expect(estimate.minPrice).toBeLessThan(estimate.recommended);
    expect(estimate.maxPrice).toBeGreaterThan(estimate.recommended);
  });

  it("increases the recommendation when rare inventory is present", () => {
    const base = estimateAccountPrice({ level: 60, kd: 3.5, skinsCount: 15, hasM416Glacier: false, hasXSuit: false });
    const rare = estimateAccountPrice({ level: 60, kd: 3.5, skinsCount: 15, hasM416Glacier: true, hasXSuit: true });
    expect(rare.recommended).toBeGreaterThan(base.recommended);
  });
});
