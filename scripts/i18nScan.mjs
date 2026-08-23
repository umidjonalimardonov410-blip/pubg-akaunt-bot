#!/usr/bin/env node
/**
 * i18n skaner: client/src ichidagi foydalanuvchiga ko'rinadigan o'zbekcha
 * matnlarni topadi va ulardan qaysilari phrases.ts lug'atida yo'qligini
 * (ya'ni RU/EN da tarjimasiz qolishini) sahifa/qatori bilan ko'rsatadi.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "client", "src");
const PHRASES_FILE = path.join(SRC, "lib", "phrases.ts");

const SKIP_PATTERNS = [
  /\.test\.(ts|tsx)$/,
  /[\\/]components[\\/]ui[\\/]/,
  /ComponentShowcase\.tsx$/,
  /[\\/]lib[\\/]phrases\.ts$/,
  /[\\/]lib[\\/]i18n\.tsx$/,
  /[\\/]lib[\\/]autoTranslate\.tsx$/,
  /[\\/]lib[\\/]phraseStore\.ts$/,
];

const IGNORE_EXACT = new Set(["Siz", "Pending", "DRIVING", "BOOTING SYSTEM"]);

const UZ_WORDS = new Set(
  `bekor saqlash tanlang tanlash yuklanmoqda qoidalar sotuvchi xaridor akkaunt akkauntlar hisob narx savdo tema ko'rinish yo'q hali topilmadi topildi kiriting tasdiqlash rad qabul yuborish ochish yopish kutilmoqda muvaffaqiyatli muvaffaqiyatsiz xatolik to'ldirish yechish balans elon e'lon so'm sana holat jami yangi eski qidirish qidiruv filtr filtrlar barcha faol yakunlangan sharh sharhlar buyurtma buyurtmalar nizo nizolar xabar xabarlar chek karta skin skinlar reyting foydalanuvchi foydalanuvchilar tarix tarixi bildirishnoma bildirishnomalar yordam qaytish ma'lumot ma'lumotlari tayyorlanmoqda tekshirilmoqda yangilanmoqda yaratilmoqda`
    .split(/\s+/)
    .filter(Boolean),
);

const UZ_SUFFIX = /(lar(i|ni|ga|da|dan)?|ning|ingiz|siz|moqda|gan|kan|qan|ydi|adi)\b/;

export function normalizePhrase(value) {
  return value.replace(/[‘’ʻ`]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

function listSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP_PATTERNS.some(rx => rx.test(full))) out.push(full);
  }
  return out;
}

export function readPhraseKeys() {
  const source = fs.readFileSync(PHRASES_FILE, "utf8");
  const keys = [...source.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*\{/gm)].map(match => match[1]);
  return new Set(keys.map(normalizePhrase));
}

function isUserFacing(text) {
  if (text.length < 3 || text.length > 160) return false;
  if (IGNORE_EXACT.has(text)) return false;
  if (!/^[A-ZА-ЯЁ0-9‘’'"]/.test(text)) return false;
  if (/[<>{}\\/@#]|=>|px-|text-|bg-|flex|http|\bclass\b/.test(text)) return false;
  const lower = text.toLowerCase();
  const tokens = lower.match(/[\wʻ‘’']+/g) ?? [];
  return tokens.some(token => UZ_WORDS.has(normalizePhrase(token))) || UZ_SUFFIX.test(lower);
}

export function scanMissingPhrases() {
  const known = readPhraseKeys();
  const missing = [];
  const seen = new Set();
  for (const file of listSourceFiles(SRC)) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      const candidates = [
        ...[...line.matchAll(/>([^<>{}\n]{3,160})</g)].map(m => m[1]),
        ...[...line.matchAll(/"([^"\n]{3,160})"/g)].map(m => m[1]),
        ...[...line.matchAll(/'([^'\n]{3,160})'/g)].map(m => m[1]),
        ...[...line.matchAll(/`([^`\n{$]{3,160})`/g)].map(m => m[1]),
      ];
      for (const raw of candidates) {
        const text = raw.trim();
        if (!isUserFacing(text)) continue;
        const key = normalizePhrase(text);
        if (known.has(key) || seen.has(key)) continue;
        seen.add(key);
        missing.push({ file: path.relative(ROOT, file), line: index + 1, text });
      }
    });
  }
  return missing;
}

export function scanBrokenPhrases() {
  const source = fs.readFileSync(PHRASES_FILE, "utf8");
  const broken = [];
  for (const match of source.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*\{\s*ru:\s*"([^"]*)",\s*en:\s*"([^"]*)"\s*\}/gm)) {
    const [, key, ru, en] = match;
    if (!ru.trim()) broken.push({ key, issue: "ru tarjimasi bo'sh" });
    if (!en.trim()) broken.push({ key, issue: "en tarjimasi bo'sh" });
    if (ru.trim() && ru.trim() === key.trim() && /[ʻ‘’]|o'|g'/.test(key)) {
      broken.push({ key, issue: "ru tarjimasi o'zbekcha bilan bir xil" });
    }
  }
  return broken;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const missing = scanMissingPhrases();
  const broken = scanBrokenPhrases();
  if (missing.length === 0 && broken.length === 0) {
    console.log("i18n: OK — barcha UI matnlari RU/EN tarjimasiga ega.");
    process.exit(0);
  }
  if (missing.length) {
    console.error(`\ni18n: ${missing.length} ta tarjimasiz matn topildi:\n`);
    for (const item of missing) console.error(`    ${item.file}:${item.line}  "${item.text}"`);
  }
  if (broken.length) {
    console.error(`\ni18n: ${broken.length} ta buzuq lug'at yozuvi:\n`);
    for (const item of broken) console.error(`    "${item.key}" -> ${item.issue}`);
  }
  console.error("\nTuzatish: client/src/lib/phrases.ts ga ru/en tarjimalarini qo'shing.\n");
  process.exit(1);
}
