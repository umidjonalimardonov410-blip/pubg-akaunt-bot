export type BotLang = 'uz' | 'ru' | 'en';

export function normalizeBotLang(value?: string | null): BotLang {
  if (value === 'ru' || value?.startsWith('ru')) return 'ru';
  if (value === 'en' || value?.startsWith('en')) return 'en';
  return 'uz';
}

type Texts = {
  menuMarket: string;
  menuSell: string;
  menuOrders: string;
  menuProfile: string;
  menuListings: string;
  menuWallet: string;
  menuReferral: string;
  menuRules: string;
  menuSupport: string;
  menuLanguage: string;
  menuContact: string;
  placeholder: string;
  welcomeTitle: string;
  welcomeBody: string;
  openApp: string;
  rulesTitle: string;
  rulesBody: string;
  referralTitle: string;
  referralBody: string;
  supportTitle: string;
  supportBody: string;
  languageTitle: string;
  languageSaved: string;
  listingsTitle: string;
  listingsBody: string;
  contactVerified: string;
  contactLogin: string;
  mainMenu: string;
};

const uz: Texts = {
  menuMarket: '🛒 Bozor',
  menuSell: '➕ Akkaunt sotish',
  menuOrders: '📦 Buyurtmalarim',
  menuProfile: '👤 Profilim',
  menuListings: '🧾 E’lonlarim',
  menuWallet: '💳 Balans',
  menuReferral: '👥 Referal',
  menuRules: '📜 Qoidalar',
  menuSupport: '🆘 Yordam',
  menuLanguage: '🌐 Til',
  menuContact: '📱 Raqam orqali kirish',
  placeholder: 'Kerakli bo‘limni tanlang',
  welcomeTitle: '🏆 INFERNO GOLD MARKET',
  welcomeBody:
    'Assalomu alaykum, {name}!\n\nBu — PUBG Mobile akkauntlari uchun <b>kafolatli savdo maydoni</b>.\n\n' +
    '💰 <b>Qanday sotib olinadi?</b>\n1️⃣ Balansni to‘ldiring\n2️⃣ Bozordan akkaunt tanlang\n3️⃣ Pul escrow’da muzlatiladi\n4️⃣ Akkauntni tekshirib tasdiqlaysiz\n\n' +
    '🛡 Har bir e’lon rasm va video bilan tekshiriladi.\n📜 Savdo oldidan <b>Qoidalar</b> bo‘limini o‘qing.',
  openApp: '📱 Mini App’ni ochish',
  rulesTitle: '📜 SAVDO QOIDALARI',
  rulesBody:
    '<b>Umumiy</b>\n• Har bir foydalanuvchi Telegram raqami bilan tasdiqlanadi\n• Barcha savdo faqat escrow orqali\n• Login/parolni chatga yozish taqiqlanadi\n\n' +
    '<b>Xaridor</b>\n• Avval balansni to‘ldiring, so‘ng sotib oling\n• Rasm va videoni sinchiklab tekshiring\n• 24 soat ichida tasdiqlang\n\n' +
    '<b>Sotuvchi</b>\n• Kamida 3 ta rasm va 1 ta video\n• Ma’lumotlar haqiqiy bo‘lsin\n• Sotilgan akkauntni qaytarib olish — doimiy blok\n\n' +
    '<b>To‘lov</b>\n• Kartaga o‘tkazib, chek rasmini yuboring\n• Admin tasdig‘idan so‘ng balans qo‘shiladi\n• Minimal yechish: 10 000 so‘m\n\n' +
    '🚫 <b>Taqiqlangan:</b> soxta e’lon, o‘g‘irlangan akkaunt, platformadan tashqari to‘lov, spam.',
  referralTitle: '👥 REFERAL DASTURI',
  referralBody:
    'Do‘stlaringizni taklif qiling va har bir faol do‘st uchun <b>5 000 so‘m</b> oling.\n\nSizning havolangiz:\n{link}\n\nHavolani ulashing — bonus avtomatik balansingizga tushadi.',
  supportTitle: '🆘 YORDAM MARKAZI',
  supportBody: 'Savol yoki muammo bo‘lsa, Mini App’dagi Yordam bo‘limiga buyurtma raqami va dalillar bilan murojaat qiling.\n\n⚠️ Hech qachon login yoki parolingizni hech kimga yubormang.',
  languageTitle: '🌐 Tilni tanlang / Выберите язык / Choose language',
  languageSaved: '✅ Til o‘zgartirildi: O‘zbekcha',
  listingsTitle: '🧾 Mening e’lonlarim',
  listingsBody: 'Bozorga qo‘ygan akkauntlaringizni ko‘rish va tahrirlash uchun tugmani bosing.',
  contactVerified: '✅ <b>Raqamingiz tasdiqlandi</b>',
  contactLogin: '🔓 Profilga kirish (Mini App)',
  mainMenu: 'Asosiy menyu:',
};

const ru: Texts = {
  menuMarket: '🛒 Маркет',
  menuSell: '➕ Продать аккаунт',
  menuOrders: '📦 Мои сделки',
  menuProfile: '👤 Профиль',
  menuListings: '🧾 Мои объявления',
  menuWallet: '💳 Баланс',
  menuReferral: '👥 Рефералы',
  menuRules: '📜 Правила',
  menuSupport: '🆘 Поддержка',
  menuLanguage: '🌐 Язык',
  menuContact: '📱 Вход по номеру',
  placeholder: 'Выберите раздел',
  welcomeTitle: '🏆 INFERNO GOLD MARKET',
  welcomeBody:
    'Здравствуйте, {name}!\n\nЭто <b>безопасная площадка</b> для торговли аккаунтами PUBG Mobile.\n\n' +
    '💰 <b>Как купить?</b>\n1️⃣ Пополните баланс\n2️⃣ Выберите аккаунт\n3️⃣ Деньги замораживаются в escrow\n4️⃣ Проверяете и подтверждаете\n\n' +
    '🛡 Каждое объявление с фото и видео.\n📜 Перед сделкой прочитайте <b>Правила</b>.',
  openApp: '📱 Открыть Mini App',
  rulesTitle: '📜 ПРАВИЛА ТОРГОВЛИ',
  rulesBody:
    '<b>Общее</b>\n• Проверка через номер Telegram\n• Только escrow-сделки\n• Логин/пароль в чат — запрещено\n\n' +
    '<b>Покупателю</b>\n• Сначала пополните баланс\n• Проверьте фото и видео\n• Подтвердите в течение 24 часов\n\n' +
    '<b>Продавцу</b>\n• Минимум 3 фото и 1 видео\n• Данные должны быть настоящими\n• Возврат проданного аккаунта — перманентный бан\n\n' +
    '<b>Оплата</b>\n• Переведите на карту и отправьте чек\n• Баланс зачислится после проверки\n• Минимальный вывод: 10 000 сум\n\n' +
    '🚫 <b>Запрещено:</b> фейковые объявления, краденые аккаунты, оплата вне платформы, спам.',
  referralTitle: '👥 РЕФЕРАЛЬНАЯ ПРОГРАММА',
  referralBody: 'Приглашайте друзей и получайте <b>5 000 сум</b> за каждого активного друга.\n\nВаша ссылка:\n{link}',
  supportTitle: '🆘 ПОДДЕРЖКА',
  supportBody: 'Напишите в раздел «Поддержка» в Mini App, указав номер сделки и доказательства.\n\n⚠️ Никогда не отправляйте логин и пароль.',
  languageTitle: '🌐 Tilni tanlang / Выберите язык / Choose language',
  languageSaved: '✅ Язык изменён: Русский',
  listingsTitle: '🧾 Мои объявления',
  listingsBody: 'Нажмите кнопку, чтобы посмотреть и отредактировать свои объявления.',
  contactVerified: '✅ <b>Номер подтверждён</b>',
  contactLogin: '🔓 Войти в профиль (Mini App)',
  mainMenu: 'Главное меню:',
};

const en: Texts = {
  menuMarket: '🛒 Market',
  menuSell: '➕ Sell account',
  menuOrders: '📦 My deals',
  menuProfile: '👤 Profile',
  menuListings: '🧾 My listings',
  menuWallet: '💳 Balance',
  menuReferral: '👥 Referral',
  menuRules: '📜 Rules',
  menuSupport: '🆘 Support',
  menuLanguage: '🌐 Language',
  menuContact: '📱 Login by phone',
  placeholder: 'Choose a section',
  welcomeTitle: '🏆 INFERNO GOLD MARKET',
  welcomeBody:
    'Hello, {name}!\n\nThis is a <b>secure marketplace</b> for PUBG Mobile accounts.\n\n' +
    '💰 <b>How to buy?</b>\n1️⃣ Top up your balance\n2️⃣ Pick an account\n3️⃣ Funds are frozen in escrow\n4️⃣ Inspect and confirm\n\n' +
    '🛡 Every listing has photos and video.\n📜 Read the <b>Rules</b> before trading.',
  openApp: '📱 Open Mini App',
  rulesTitle: '📜 TRADING RULES',
  rulesBody:
    '<b>General</b>\n• Every user is verified by Telegram phone\n• Escrow-only deals\n• Never send logins/passwords in chat\n\n' +
    '<b>Buyers</b>\n• Top up first, then buy\n• Inspect all photos and video\n• Confirm within 24 hours\n\n' +
    '<b>Sellers</b>\n• At least 3 photos and 1 video\n• Data must be genuine\n• Reclaiming a sold account = permanent ban\n\n' +
    '<b>Payments</b>\n• Transfer to the card and send the receipt\n• Balance is credited after approval\n• Minimum withdrawal: 10,000 so‘m\n\n' +
    '🚫 <b>Prohibited:</b> fake listings, stolen accounts, off-platform payments, spam.',
  referralTitle: '👥 REFERRAL PROGRAM',
  referralBody: 'Invite friends and earn <b>5,000 so‘m</b> for every active friend.\n\nYour link:\n{link}',
  supportTitle: '🆘 SUPPORT',
  supportBody: 'Open the Support section in the Mini App with your order number and evidence.\n\n⚠️ Never share your login or password.',
  languageTitle: '🌐 Tilni tanlang / Выберите язык / Choose language',
  languageSaved: '✅ Language changed: English',
  listingsTitle: '🧾 My listings',
  listingsBody: 'Tap the button to view and edit your listings.',
  contactVerified: '✅ <b>Phone number verified</b>',
  contactLogin: '🔓 Open profile (Mini App)',
  mainMenu: 'Main menu:',
};

const dictionary: Record<BotLang, Texts> = { uz, ru, en };

export function botText(lang: BotLang): Texts {
  return dictionary[lang];
}

/** Every localized reply-keyboard label, used to route button taps. */
export function matchMenuKey(label: string): keyof Texts | null {
  const trimmed = label.trim();
  for (const lang of ['uz', 'ru', 'en'] as BotLang[]) {
    const texts = dictionary[lang];
    for (const key of Object.keys(texts) as (keyof Texts)[]) {
      if (key.startsWith('menu') && texts[key] === trimmed) return key;
    }
  }
  return null;
}
