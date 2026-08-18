import { useSyncExternalStore } from "react";

export type Lang = "uz" | "ru" | "en";

const STORAGE_KEY = "inferno-lang";
const EXPLICIT_KEY = "inferno-lang-explicit";
const listeners = new Set<() => void>();

const SUPPORTED: Lang[] = ["uz", "ru", "en"];

/** Fallback zanjiri: tanlangan til topilmasa keyingi tilga o'tadi. */
const FALLBACK_CHAIN: Record<Lang, Lang[]> = {
  uz: ["uz", "ru", "en"],
  ru: ["ru", "uz", "en"],
  en: ["en", "uz", "ru"],
};

/**
 * Telegram user tilini (language_code) UZ/RU/EN ga moslaydi.
 * Masalan: uz-Latn -> uz, ru/be/kk/ky/tg/uk -> ru, boshqalar -> en.
 */
export function mapLanguageCode(raw?: string | null): Lang | null {
  if (!raw) return null;
  const code = raw.toLowerCase().replace("_", "-");
  const base = code.split("-")[0];
  if (base === "uz") return "uz";
  if (["ru", "be", "kk", "ky", "tg", "tk", "uk", "az", "hy", "ka", "mo"].includes(base)) return "ru";
  if (base === "en") return "en";
  return null;
}

export function detectTelegramLang(): Lang | null {
  if (typeof window === "undefined") return null;
  const tgLang = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code as string | undefined;
  return mapLanguageCode(tgLang);
}

function detectBrowserLang(): Lang | null {
  if (typeof navigator === "undefined") return null;
  for (const candidate of navigator.languages ?? [navigator.language]) {
    const mapped = mapLanguageCode(candidate);
    if (mapped) return mapped;
  }
  return null;
}

function readLang(): Lang {
  if (typeof window === "undefined") return "uz";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED as string[]).includes(stored)) return stored as Lang;
  // 1) Telegram user tili, 2) brauzer tili, 3) zaxira: uz
  return detectTelegramLang() ?? detectBrowserLang() ?? "uz";
}

let current: Lang = readLang();

function isExplicit() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(EXPLICIT_KEY) === "1";
}

export function setLang(next: Lang, options?: { explicit?: boolean }) {
  const explicit = options?.explicit ?? true;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
    if (explicit) window.localStorage.setItem(EXPLICIT_KEY, "1");
  } catch {}
  listeners.forEach(listener => listener());
}

/**
 * Profil/Telegram tomonidan kelgan tilni qo'llaydi, lekin foydalanuvchi
 * qo'lda til tanlagan bo'lsa uni bosib ketmaydi.
 */
export function applyDetectedLang(raw?: string | null) {
  const mapped = mapLanguageCode(raw) ?? detectTelegramLang();
  if (!mapped || isExplicit() || mapped === current) return;
  setLang(mapped, { explicit: false });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "uz", label: "O‘zbekcha", flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

type Dict = Record<string, string>;

const uz: Dict = {
  "nav.market": "Bozor",
  "nav.saved": "Saqlanganlar",
  "nav.sell": "Sotish",
  "nav.orders": "Kafolatli savdo",
  "nav.transactions": "Tranzaksiyalar",
  "nav.referral": "Referal",
  "nav.rules": "Qoidalar",
  "nav.support": "Yordam",
  "nav.profile": "Profil",
  "nav.home": "Asosiy",
  "common.language": "Til",
  "common.copy": "Nusxa olish",
  "common.copied": "Nusxa olindi",
  "common.save": "Saqlash",
  "common.cancel": "Bekor qilish",
  "common.edit": "Tahrirlash",
  "profile.telegramId": "Telegram ID",
  "profile.phone": "Telefon raqam",
  "profile.fullName": "To‘liq ism",
  "profile.editTitle": "Profil ma’lumotlari",
  "rules.title": "Savdo qoidalari",
  "rules.subtitle": "Inferno Gold Market’da xavfsiz savdo qilish tartibi",
  "rules.section.general": "Umumiy qoidalar",
  "rules.section.buyer": "Xaridor uchun",
  "rules.section.seller": "Sotuvchi uchun",
  "rules.section.payment": "To‘lov va balans",
  "rules.section.banned": "Taqiqlangan harakatlar",
  "rules.g1": "Har bir foydalanuvchi Telegram raqami orqali tasdiqlanadi.",
  "rules.g2": "Barcha savdolar faqat platforma escrow tizimi orqali amalga oshiriladi.",
  "rules.g3": "Login va parolni chatga yozish qat’iyan man etiladi.",
  "rules.g4": "Nizo yuzaga kelsa, dalillar (screenshot, video) 24 soat ichida yuboriladi.",
  "rules.b1": "Avval balansingizni to‘ldiring, so‘ng akkauntni sotib oling.",
  "rules.b2": "Akkaunt rasm va videolarini xarid oldidan diqqat bilan tekshiring.",
  "rules.b3": "Akkauntni qabul qilgach 24 soat ichida tasdiqlang, aks holda avtomatik yopiladi.",
  "rules.s1": "E’longa kamida 3 ta rasm va 1 ta video biriktiring.",
  "rules.s2": "Akkaunt ma’lumotlari (ID, level, K/D, skinlar) haqiqiy bo‘lishi shart.",
  "rules.s3": "Sotilgan akkauntni qaytarib olishga urinish doimiy blokga olib keladi.",
  "rules.p1": "Balans karta orqali to‘ldiriladi: karta raqamiga o‘tkazing va chek rasmini yuboring.",
  "rules.p2": "Admin tasdiqlagach summa balansga qo‘shiladi (odatda 5–30 daqiqa).",
  "rules.p3": "Pul yechish minimal summasi 10 000 so‘m.",
  "rules.x1": "Soxta e’lon va o‘g‘irlangan akkaunt sotish.",
  "rules.x2": "Platformadan tashqarida to‘lov taklif qilish.",
  "rules.x3": "Boshqa foydalanuvchini haqorat qilish yoki spam yuborish.",
  "rules.footerTitle": "Qoidabuzarlik oqibati",
  "rules.footerText": "Qoidalarni buzgan foydalanuvchi hisobi bloklanadi va balansi muzlatiladi.",
};

const ru: Dict = {
  "nav.market": "Маркет",
  "nav.saved": "Избранное",
  "nav.sell": "Продать",
  "nav.orders": "Сделки",
  "nav.transactions": "Транзакции",
  "nav.referral": "Рефералы",
  "nav.rules": "Правила",
  "nav.support": "Поддержка",
  "nav.profile": "Профиль",
  "nav.home": "Главная",
  "common.language": "Язык",
  "common.copy": "Копировать",
  "common.copied": "Скопировано",
  "common.save": "Сохранить",
  "common.cancel": "Отмена",
  "common.edit": "Изменить",
  "profile.telegramId": "Telegram ID",
  "profile.phone": "Номер телефона",
  "profile.fullName": "Полное имя",
  "profile.editTitle": "Данные профиля",
  "rules.title": "Правила торговли",
  "rules.subtitle": "Порядок безопасных сделок на Inferno Gold Market",
  "rules.section.general": "Общие правила",
  "rules.section.buyer": "Для покупателя",
  "rules.section.seller": "Для продавца",
  "rules.section.payment": "Оплата и баланс",
  "rules.section.banned": "Запрещено",
  "rules.g1": "Каждый пользователь подтверждается по номеру Telegram.",
  "rules.g2": "Все сделки проходят только через escrow платформы.",
  "rules.g3": "Строго запрещено писать логин и пароль в чат.",
  "rules.g4": "При споре доказательства (скриншот, видео) отправляются в течение 24 часов.",
  "rules.b1": "Сначала пополните баланс, затем покупайте аккаунт.",
  "rules.b2": "Внимательно проверьте фото и видео аккаунта до покупки.",
  "rules.b3": "Подтвердите получение в течение 24 часов, иначе сделка закроется автоматически.",
  "rules.s1": "К объявлению приложите минимум 3 фото и 1 видео.",
  "rules.s2": "Данные аккаунта (ID, уровень, K/D, скины) должны быть настоящими.",
  "rules.s3": "Попытка вернуть проданный аккаунт ведёт к перманентному бану.",
  "rules.p1": "Баланс пополняется картой: переведите на номер карты и отправьте фото чека.",
  "rules.p2": "После подтверждения админом сумма зачисляется (обычно 5–30 минут).",
  "rules.p3": "Минимальная сумма вывода — 10 000 сум.",
  "rules.x1": "Фальшивые объявления и продажа краденых аккаунтов.",
  "rules.x2": "Предложение оплаты вне платформы.",
  "rules.x3": "Оскорбления и спам в адрес других пользователей.",
  "rules.footerTitle": "Последствия нарушения",
  "rules.footerText": "Аккаунт нарушителя блокируется, баланс замораживается.",
};

const en: Dict = {
  "nav.market": "Market",
  "nav.saved": "Saved",
  "nav.sell": "Sell",
  "nav.orders": "Escrow deals",
  "nav.transactions": "Transactions",
  "nav.referral": "Referral",
  "nav.rules": "Rules",
  "nav.support": "Support",
  "nav.profile": "Profile",
  "nav.home": "Home",
  "common.language": "Language",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.edit": "Edit",
  "profile.telegramId": "Telegram ID",
  "profile.phone": "Phone number",
  "profile.fullName": "Full name",
  "profile.editTitle": "Profile details",
  "rules.title": "Trading rules",
  "rules.subtitle": "How safe trading works on Inferno Gold Market",
  "rules.section.general": "General rules",
  "rules.section.buyer": "For buyers",
  "rules.section.seller": "For sellers",
  "rules.section.payment": "Payments & balance",
  "rules.section.banned": "Prohibited",
  "rules.g1": "Every user is verified through their Telegram phone number.",
  "rules.g2": "All deals go through the platform escrow only.",
  "rules.g3": "Never send logins or passwords in chat.",
  "rules.g4": "In a dispute, evidence (screenshots, video) must be sent within 24 hours.",
  "rules.b1": "Top up your balance first, then buy the account.",
  "rules.b2": "Inspect all photos and video of the account before buying.",
  "rules.b3": "Confirm delivery within 24 hours or the deal closes automatically.",
  "rules.s1": "Attach at least 3 photos and 1 video to every listing.",
  "rules.s2": "Account data (ID, level, K/D, skins) must be genuine.",
  "rules.s3": "Trying to reclaim a sold account leads to a permanent ban.",
  "rules.p1": "Top up by card: transfer to the card number and send the receipt photo.",
  "rules.p2": "Once an admin approves it, the amount is credited (usually 5–30 min).",
  "rules.p3": "Minimum withdrawal is 10,000 so'm.",
  "rules.x1": "Fake listings and selling stolen accounts.",
  "rules.x2": "Offering payment outside the platform.",
  "rules.x3": "Insulting other users or spamming.",
  "rules.footerTitle": "Consequences",
  "rules.footerText": "Rule breakers are blocked and their balance is frozen.",
};

const dictionaries: Record<Lang, Dict> = { uz, ru, en };

export function translate(lang: Lang, key: string) {
  for (const candidate of FALLBACK_CHAIN[lang]) {
    const value = dictionaries[candidate][key];
    if (value) return value;
  }
  return key;
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, () => current, () => "uz" as Lang);
  return { lang, setLang, t: (key: string) => translate(lang, key) };
}

export function getLang() {
  return current;
}
