import React, { createContext, useContext, useMemo, useState } from "react";

export type Language = "uz" | "en" | "ru";

type TranslationKey =
  | "market"
  | "saved"
  | "sell"
  | "escrow"
  | "referral"
  | "proCenter"
  | "proTools"
  | "profile"
  | "support"
  | "notifications"
  | "importantTradeNews"
  | "noNotifications"
  | "openProfile"
  | "loginToSeeNotifications"
  | "language"
  | "themeDark"
  | "themeLight"
  | "accountSaved"
  | "wishlist"
  | "priceDropAlert"
  | "priceDropOn"
  | "priceDropOff"
  | "browseMarket"
  | "backToMarket"
  | "details"
  | "savedAccounts"
  | "wishlistDescription"
  | "savedAccountsEmpty"
  | "saveAccountsHint"
  | "loginToSave"
  | "cabinet"
  | "myProfile"
  | "menu";

const translations: Record<Language, Record<TranslationKey, string>> = {
  uz: {
    market: "Bozor", saved: "Saqlanganlar", sell: "Sotish", escrow: "Kafolatli savdo", referral: "Referral",
    proCenter: "Pro markaz", proTools: "Pro vositalar", profile: "Profil", support: "Yordam",
    notifications: "Bildirishnomalar", importantTradeNews: "Muhim savdo yangiliklari", noNotifications: "Hozircha yangi bildirishnoma yo‘q.",
    openProfile: "Profilni ochish", loginToSeeNotifications: "Bildirishnomalarni ko‘rish uchun profilga kiring.", language: "Til",
    themeDark: "Neon dark", themeLight: "Yorug‘ rejim", accountSaved: "Akkaunt saqlandi", wishlist: "Wishlist",
    priceDropAlert: "Narx tushishi", priceDropOn: "Narx tushishi: ON", priceDropOff: "Narx tushishi: OFF",
    browseMarket: "Bozorni ko‘rish", backToMarket: "Bozorga qaytish", details: "Batafsil", savedAccounts: "Saqlangan akkauntlar",
    wishlistDescription: "Sevimli akkauntni saqlang va narxi tushsa darhol bildirishnoma oling.", savedAccountsEmpty: "Ro‘yxat hozircha bo‘sh",
    saveAccountsHint: "Bozorda yurakcha tugmasini bosib akkaunt saqlang.", loginToSave: "Saqlash uchun avval tizimga kiring.", cabinet: "Kabinet", myProfile: "Mening profilim", menu: "Menyu",
  },
  en: {
    market: "Market", saved: "Wishlist", sell: "Sell", escrow: "Secure escrow", referral: "Referral",
    proCenter: "Pro hub", proTools: "Pro tools", profile: "Profile", support: "Support",
    notifications: "Notifications", importantTradeNews: "Important trade updates", noNotifications: "No new notifications yet.",
    openProfile: "Open profile", loginToSeeNotifications: "Sign in to view notifications.", language: "Language",
    themeDark: "Neon dark", themeLight: "Light mode", accountSaved: "Account saved", wishlist: "Wishlist",
    priceDropAlert: "Price-drop alert", priceDropOn: "Price drop: ON", priceDropOff: "Price drop: OFF",
    browseMarket: "Browse market", backToMarket: "Back to market", details: "Details", savedAccounts: "Saved accounts",
    wishlistDescription: "Save favorite accounts and get notified when their price drops.", savedAccountsEmpty: "Your wishlist is empty",
    saveAccountsHint: "Tap the heart on an account to save it.", loginToSave: "Sign in before saving an account.", cabinet: "Account", myProfile: "My profile", menu: "Menu",
  },
  ru: {
    market: "Маркет", saved: "Избранное", sell: "Продать", escrow: "Безопасная сделка", referral: "Реферал",
    proCenter: "Pro-центр", proTools: "Pro-инструменты", profile: "Профиль", support: "Поддержка",
    notifications: "Уведомления", importantTradeNews: "Важные новости сделок", noNotifications: "Новых уведомлений пока нет.",
    openProfile: "Открыть профиль", loginToSeeNotifications: "Войдите, чтобы увидеть уведомления.", language: "Язык",
    themeDark: "Неон-тёмная тема", themeLight: "Светлая тема", accountSaved: "Аккаунт сохранён", wishlist: "Избранное",
    priceDropAlert: "Снижение цены", priceDropOn: "Снижение цены: ON", priceDropOff: "Снижение цены: OFF",
    browseMarket: "Открыть маркет", backToMarket: "Вернуться в маркет", details: "Подробнее", savedAccounts: "Сохранённые аккаунты",
    wishlistDescription: "Сохраняйте аккаунты и получайте уведомления при снижении цены.", savedAccountsEmpty: "Избранное пока пусто",
    saveAccountsHint: "Нажмите на сердце, чтобы сохранить аккаунт.", loginToSave: "Войдите, чтобы сохранить аккаунт.", cabinet: "Кабинет", myProfile: "Мой профиль", menu: "Меню",
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  languageLabel: string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children, defaultLanguage = "uz" }: { children: React.ReactNode; defaultLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("inferno-language") : null;
    return stored === "en" || stored === "ru" || stored === "uz" ? stored : defaultLanguage;
  });

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: next => {
      setLanguage(next);
      if (typeof window !== "undefined") window.localStorage.setItem("inferno-language", next);
    },
    t: key => translations[language][key],
    languageLabel: language === "uz" ? "O‘zbekcha" : language === "en" ? "English" : "Русский",
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export function LanguageSelect() {
  const { language, setLanguage, t } = useLanguage();
  return <label className="sr-only">{t("language")}<select aria-label={t("language")} value={language} onChange={event => setLanguage(event.target.value as Language)} className="not-sr-only ml-1 min-h-10 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-xs font-bold text-white outline-none focus:border-red-400/60"><option value="uz">UZ</option><option value="en">EN</option><option value="ru">RU</option></select></label>;
}
