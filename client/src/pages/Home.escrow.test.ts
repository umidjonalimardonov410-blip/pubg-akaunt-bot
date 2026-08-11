import { describe, expect, it } from "vitest";
import { ESCROW_STAGES, ESCROW_STATUS_LABELS, getEscrowStatusLabel } from "./Home";

describe("Inferno Stealth escrow contract", () => {
  it("keeps exactly three Uzbek escrow stages in order", () => {
    expect(ESCROW_STAGES).toHaveLength(3);
    expect(ESCROW_STAGES.map(stage => stage.key)).toEqual([
      "payment_frozen",
      "account_verification",
      "buyer_confirmation",
    ]);
    expect(ESCROW_STAGES.map(stage => stage.label)).toEqual([
      "To‘lov muzlatildi",
      "Akkaunt tekshiruvi",
      "Xaridor tasdig‘i",
    ]);
  });

  it("preserves the exact required status badge labels", () => {
    expect(ESCROW_STATUS_LABELS).toEqual({
      pending: "Pending",
      in_escrow: "In Escrow",
      completed: "Completed",
    });
    expect(getEscrowStatusLabel("pending")).toBe("Pending");
    expect(getEscrowStatusLabel("in_escrow")).toBe("In Escrow");
    expect(getEscrowStatusLabel("completed")).toBe("Completed");
  });
});
