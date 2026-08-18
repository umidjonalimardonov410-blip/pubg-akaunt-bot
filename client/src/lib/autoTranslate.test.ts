import { describe, expect, it } from "vitest";
import { translatePhrase } from "./autoTranslate";

describe("autoTranslate", () => {
  it("keeps Uzbek source text untouched", () => {
    expect(translatePhrase("Akkauntlar bozori", "uz")).toBeNull();
  });

  it("translates known phrases to Russian and English", () => {
    expect(translatePhrase("Akkauntlar bozori", "ru")).toBeTruthy();
    expect(translatePhrase("Akkauntlar bozori", "en")).toBeTruthy();
  });

  it("matches phrases with different apostrophes and spacing", () => {
    expect(translatePhrase("  Akkaunt topilmadi ", "en")).toContain("ccount");
  });

  it("returns null for unknown text", () => {
    expect(translatePhrase("zzz-unknown-string", "en")).toBeNull();
  });
});
