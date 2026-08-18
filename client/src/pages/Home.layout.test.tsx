import { describe, expect, it } from "vitest";
import { marketplaceLayoutClass } from "./Home";

describe("marketplace layout transition", () => {
  it("keeps the browse mode four columns and fades it in when settled", () => {
    const classes = marketplaceLayoutClass("grid", false);

    expect(classes).toContain("grid-cols-4");
    expect(classes).toContain("translate-y-0");
    expect(classes).toContain("opacity-100");
  });

  it("uses the compact stack and temporary fade state while switching", () => {
    const classes = marketplaceLayoutClass("list", true);

    expect(classes).toContain("space-y-3");
    expect(classes).toContain("translate-y-1");
    expect(classes).toContain("opacity-0");
  });
});
