import { describe, expect, it } from "vitest";
import { PHRASES } from "./phrases";
import { translatePhrase } from "./autoTranslate";
// @ts-ignore — build-time skaner (JS modul)
import { scanMissingPhrases, scanBrokenPhrases } from "../../../scripts/i18nScan.mjs";

type Missing = { file: string; line: number; text: string };
type Broken = { key: string; issue: string };

describe("i18n coverage", () => {
  it("has no untranslated user-facing text in any page", () => {
    const missing = scanMissingPhrases() as Missing[];
    const report = missing.map(item => `${item.file}:${item.line} -> "${item.text}"`).join("\n");
    expect(report, `Tarjimasiz matnlar:\n${report}`).toBe("");
  });

  it("has no empty or broken dictionary entries", () => {
    const broken = scanBrokenPhrases() as Broken[];
    const report = broken.map(item => `"${item.key}" -> ${item.issue}`).join("\n");
    expect(report, `Buzuq yozuvlar:\n${report}`).toBe("");
  });

  it("returns a real RU and EN string for every dictionary key", () => {
    const failures: string[] = [];
    for (const [key, value] of Object.entries(PHRASES)) {
      for (const lang of ["ru", "en"] as const) {
        const translated = (value as Record<string, string>)[lang];
        if (!translated || !translated.trim()) failures.push(`${key} (${lang}) bo'sh`);
      }
      if (translatePhrase(key, "ru") === null && translatePhrase(key, "en") === null) {
        failures.push(`${key} -> tarjima qaytmadi`);
      }
    }
    expect(failures.join("\n")).toBe("");
  });
});
