import { describe, expect, it } from "vitest";
import { getAdminPayoutCardStatus } from "./payoutCard";

describe("admin payout card configuration", () => {
  it("returns only a masked, server-side-safe card status", () => {
    const status = getAdminPayoutCardStatus();
    expect(status.configured).toBe(true);
    expect(status.holder).toBe("Alimardonov U");
    expect(status.maskedNumber).toBe('5614 **** **** 7758');
    expect(status.maskedNumber).not.toContain("5614680577167758");
    expect(status.fullNumber).toBeUndefined();
  });
});
