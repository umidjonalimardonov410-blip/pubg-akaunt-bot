import { describe, expect, it } from "vitest";
import { proRouter } from "./ProRouters";

describe("Inferno Stealth Pro router contract", () => {
  it("exposes support ticket creation and threaded conversation procedures", () => {
    const procedures = proRouter._def.record as Record<string, unknown>;
    expect(procedures.tickets).toBeDefined();
    expect(procedures.messages).toBeDefined();
    expect(procedures.adminTickets).toBeDefined();
  });

  it("exposes seller verification, analytics, and explicit badge audit procedures", () => {
    const procedures = proRouter._def.record as Record<string, unknown>;
    expect(procedures.verification).toBeDefined();
    expect(procedures.sellerDashboard).toBeDefined();
    expect(procedures.badgeAudit).toBeDefined();
  });
});
