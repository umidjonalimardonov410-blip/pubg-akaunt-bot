import type { Lang } from "./i18n";

/**
 * Admin panelda tahrirlangan tarjimalar (phrase overrides) uchun runtime store.
 * Server'dan kelgan overridelar shu yerda saqlanadi va DOM tarjimoni (AutoTranslate)
 * har bir yangilanishda qayta ishga tushadi — ya'ni tarjima real vaqtda almashadi.
 */

export type PhraseOverride = { key: string; uz?: string | null; ru?: string | null; en?: string | null };

const listeners = new Set<() => void>();
let version = 0;
let byExact: Record<string, PhraseOverride> = {};
let byNormalized: Record<string, PhraseOverride> = {};

export function normalizePhrase(value: string) {
  return value
    .replace(/[‘’ʻ`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function setPhraseOverrides(rows: PhraseOverride[]) {
  const exact: Record<string, PhraseOverride> = {};
  const normalized: Record<string, PhraseOverride> = {};
  for (const row of rows) {
    if (!row?.key) continue;
    exact[row.key] = row;
    normalized[normalizePhrase(row.key)] = row;
  }
  byExact = exact;
  byNormalized = normalized;
  version += 1;
  listeners.forEach(listener => listener());
}

export function getPhraseOverride(text: string, lang: Lang): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const row = byExact[trimmed] ?? byNormalized[normalizePhrase(trimmed)];
  if (!row) return null;
  const value = row[lang];
  if (!value || !value.trim() || value === trimmed) return null;
  return value;
}

export function subscribePhraseOverrides(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPhraseOverridesVersion() {
  return version;
}
