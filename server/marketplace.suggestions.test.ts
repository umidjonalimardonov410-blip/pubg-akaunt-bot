import { describe, expect, it } from "vitest";
import { getAccountSuggestions } from "./db";

describe("marketplace account suggestions", () => {
  it("returns the featured M416 Glacier skin suggestion", async () => {
    const suggestions = await getAccountSuggestions("M416");
    expect(suggestions.some(item => item.type === "Skin" && item.value === "M416 Glacier")).toBe(true);
  });

  it("does not query for a one-character search", async () => {
    await expect(getAccountSuggestions("M")).resolves.toEqual([]);
  });
});
