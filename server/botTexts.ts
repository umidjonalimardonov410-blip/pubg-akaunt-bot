export type BotLang = 'uz' | 'ru' | 'en';

/** Telegram `language_code` ni UZ/RU/EN ga moslaydi. Zaxira til — uz. */
const RU_FAMILY = ['ru', 'be', 'kk', 'ky', 'tg', 'tk', 'uk', 'az', 'hy', 'ka', 'mo'];

export function normalizeBotLang(value?: string | null): BotLang {
  if (!value) return 'uz';
  const code = value.toLowerCase().replace('_', '-');
  const base = code.split('-')[0];
  if (base === 'uz') return 'uz';
  if (RU_FAMILY.includes(base)) return 'ru';
  if (base === 'en') return 'en';
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
  menuAdmin: string;
  menuPanel: string;
  panelTitle: string;
  panelBody: string;
  panelBotControl: string;
  panelListings: string;
  panelReceipts: string;
  panelAdminChat: string;
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
  adminTitle: string;
  adminBody: string;
  chooseSection: string;
  walletTitle: string;
  walletIntro: string;
  walletChooseAmount: string;
  walletChooseMethod: string;
  walletMethodUzcard: string;
  walletMethodVisa: string;
  walletMethodTon: string;
  walletMethodStars: string;
  walletSoon: string;
  walletCardMessage: string;
  walletAmountChosen: string;
  walletReceiptReceived: string;
  walletApproved: string;
  walletRejected: string;
  adminApprove: string;
  adminReject: string;
  marketTitle: string;
  marketBody: string;
  marketPriceLow: string;
  marketPriceMid: string;
  marketPriceHigh: string;
  marketPro: string;
  marketConqueror: string;
  marketClassic: string;
  marketReset: string;
  marketOpenFull: string;
  marketOpenSelected: string;
  marketShowResults: string;
  marketPrev: string;
  marketNext: string;
  marketChangeFilters: string;
  marketResultsTitle: string;
  marketEmpty: string;
  marketPage: string;
  marketCurrency: string;
  sellTitle: string;
  sellBody: string;
  ordersTitle: string;
  ordersBody: string;
  faqTitle: string;
  helpTitle: string;
  helpBody: string;
  adminOnly: string;
  receiptTooLarge: string;
  receiptFailed: string;
  receiptNoAmount: string;
  contactOtherUser: string;
  contactVerifiedBody: string;
  adminNewReceipt: string;
  adminReviewDone: string;
  adminReviewSkipped: string;
  callbackExpired: string;
  cbLoading: string;
  cbFilters: string;
  walletBack: string;
  walletOther: string;
  startCommandHint: string;
};

const uz: Texts = {
  menuMarket: '🛒 Bozor',
  menuSell: '➕ Sotish',
  menuOrders: '📦 Buyurtmalarim',
  menuProfile: '👤 Profilim',
  menuListings: '🧾 E’lonlarim',
  menuWallet: '💳 Balans',
  menuReferral: '👥 Referal',
  menuRules: '📜 Qoidalar',
  menuSupport: '🆘 Yordam',
  menuAdmin: '👨‍💼 Admin',
  menuPanel: '🛡 Admin panel',
  panelTitle: '🛡 ADMIN PANEL',
  panelBody: 'Bot boshqaruvi, akkaunt tasdiqlash va chek nazorati shu yerda. Panel egasi: {panelAdmin}',
  panelBotControl: '⚙️ Bot boshqaruvi',
  panelListings: '✅ Akkaunt tasdiqlash',
  panelReceipts: '🧾 Cheklar',
  panelAdminChat: '👑 Panel admin',
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
  adminTitle: '👨‍💼 ADMIN BILAN ALOQA',
  adminBody: 'Savdo, to‘lov yoki nizo bo‘yicha savollar uchun to‘g‘ridan-to‘g‘ri adminimizga yozing: {admin}\n\n⚠️ Login va parolni hech kimga yubormang. Admin hech qachon parol so‘ramaydi.',
  chooseSection: '👇 Quyidagi menyudan kerakli bo‘limni tanlang:',
  walletTitle: '💳 BALANSNI TO‘LDIRISH',
  walletIntro: '1️⃣ Summani tanlang\n2️⃣ To‘lov usulini tanlang\n3️⃣ Chek rasmini shu chatga yuboring\n\nAdmin tasdiqlagach balans avtomatik qo‘shiladi.',
  walletChooseAmount: '💰 Summani tanlang:',
  walletChooseMethod: '💳 To‘lov usulini tanlang:',
  walletMethodUzcard: '🟢 UZCARD',
  walletMethodVisa: '🔵 VISA',
  walletMethodTon: '💎 TON — tez orada',
  walletMethodStars: '⭐ Stars — tez orada',
  walletSoon: '🚧 Tez orada ishga tushadi. Hozircha karta orqali to‘lang.',
  walletCardMessage: '💳 <b>{method}</b>\n\nKarta: <code>{card}</code>\nEgasi: <b>{holder}</b>\nSumma: <b>{amount} so‘m</b>\n\n📸 To‘lovdan so‘ng chek rasmini shu chatga yuboring.',
  walletAmountChosen: '✅ {amount} so‘m tanlandi.',
  walletReceiptReceived: '✅ <b>Chek qabul qilindi</b>\n\n{amount} so‘m uchun so‘rov #{id} admin tekshiruviga yuborildi.',
  walletApproved: '✅ <b>Balans to‘ldirildi</b>\n\n{amount} so‘m hisobingizga qo‘shildi. Endi bozordan akkaunt sotib olishingiz mumkin.',
  walletRejected: '❌ <b>Chek rad etildi</b>\n\n{amount} so‘m uchun to‘lov tasdiqlanmadi. Admin bilan bog‘laning.',
  adminApprove: '✅ Tasdiqlash',
  adminReject: '❌ Rad etish',
  marketTitle: '<b>🛒 Inferno Market — tezkor qidiruv</b>',
  marketBody: 'Narx yoki toifani tanlang. Tugma sizni shu filtr qo‘llangan Mini App bozoriga olib kiradi.',
  marketPriceLow: '💰 0–500 ming',
  marketPriceMid: '💰 500 ming–2 mln',
  marketPriceHigh: '💰 2 mln+',
  marketPro: '🏆 Pro / X-Suit',
  marketConqueror: '👑 Conqueror',
  marketClassic: '🎮 Classic',
  marketReset: '🔄 Filtrlarni tozalash',
  marketOpenFull: '📱 To‘liq bozor',
  marketOpenSelected: '📱 Tanlangan bozorni ochish',
  marketShowResults: '🔎 Natijalarni ko‘rish',
  marketPrev: '⬅️ Oldingi',
  marketNext: 'Keyingi ➡️',
  marketChangeFilters: '⚙️ Filtrlarni o‘zgartirish',
  marketResultsTitle: '🔎 Marketplace natijalari',
  marketEmpty: 'Bu filtr bo‘yicha hozircha e’lon topilmadi.',
  marketPage: 'Sahifa',
  marketCurrency: 'so‘m',
  sellTitle: '➕ AKKAUNT SOTISH',
  sellBody: 'Mini App’ni oching, rasm/video qo‘shing va narx belgilang.\nAdmin tekshiruvidan so‘ng e’lon bozorda paydo bo‘ladi.',
  ordersTitle: '📦 BUYURTMALARIM',
  ordersBody: 'Escrow holati, to‘lov va topshirish tasdig‘i Mini App’da.',
  faqTitle: '❓ KO‘P BERILADIGAN SAVOLLAR',
  helpTitle: '🎮 INFERNO GOLD MARKET',
  helpBody: 'Pastdagi menyudan kerakli bo‘limni tanlang 👇',
  adminOnly: '⛔ Bu bo‘lim faqat adminlar uchun.',
  receiptTooLarge: '❌ Chek hajmi 8 MB dan oshmasin. Kichikroq rasm yuboring.',
  receiptFailed: '❌ Chekni qabul qilib bo‘lmadi. Qayta urinib ko‘ring.',
  receiptNoAmount: '⚠️ Avval summani tanlang, so‘ng chek rasmini yuboring.',
  contactOtherUser: '⚠️ Bu boshqa foydalanuvchining raqami. O‘z raqamingizni yuboring.',
  contactVerifiedBody: 'Pastdagi tugma orqali Mini App’ni oching — profil va e’lonlaringiz avtomatik yuklanadi.',
  adminNewReceipt: '📥 <b>Yangi balans cheki</b>\n\nFoydalanuvchi: #{user}\nSumma: <b>{amount} so‘m</b>\nChek: {url}',
  adminReviewDone: '{icon} Chek #{id} — {state}.',
  adminReviewSkipped: '⚠️ Chek #{id} holati o‘zgartirilmadi ({reason}).',
  callbackExpired: 'Bu tugma eskirgan. Menyuni qayta oching.',
  cbLoading: 'Yuklanmoqda…',
  cbFilters: 'Filtrlar',
  walletBack: '⬅️ Orqaga',
  walletOther: '✍️ Boshqa summa',
  startCommandHint: 'Inferno menyusini ochish',
};

const ru: Texts = {
  menuMarket: '🛒 Маркет',
  menuSell: '➕ Продать',
  menuOrders: '📦 Мои сделки',
  menuProfile: '👤 Профиль',
  menuListings: '🧾 Объявления',
  menuWallet: '💳 Баланс',
  menuReferral: '👥 Рефералы',
  menuRules: '📜 Правила',
  menuSupport: '🆘 Поддержка',
  menuAdmin: '👨‍💼 Админ',
  menuPanel: '🛡 Админ панель',
  panelTitle: '🛡 АДМИН ПАНЕЛЬ',
  panelBody: 'Управление ботом, подтверждение аккаунтов и проверка чеков здесь. Владелец панели: {panelAdmin}',
  panelBotControl: '⚙️ Управление ботом',
  panelListings: '✅ Подтверждение аккаунтов',
  panelReceipts: '🧾 Чеки',
  panelAdminChat: '👑 Админ панели',
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
  adminTitle: '👨‍💼 СВЯЗЬ С АДМИНОМ',
  adminBody: 'По вопросам сделки, оплаты или спора пишите напрямую админу: {admin}\n\n⚠️ Никогда не отправляйте логин и пароль. Админ никогда их не просит.',
  chooseSection: '👇 Выберите нужный раздел в меню ниже:',
  walletTitle: '💳 ПОПОЛНЕНИЕ БАЛАНСА',
  walletIntro: '1️⃣ Выберите сумму\n2️⃣ Выберите способ оплаты\n3️⃣ Отправьте фото чека в этот чат\n\nПосле подтверждения админом баланс пополнится автоматически.',
  walletChooseAmount: '💰 Выберите сумму:',
  walletChooseMethod: '💳 Выберите способ оплаты:',
  walletMethodUzcard: '🟢 UZCARD',
  walletMethodVisa: '🔵 VISA',
  walletMethodTon: '💎 TON — скоро',
  walletMethodStars: '⭐ Stars — скоро',
  walletSoon: '🚧 Скоро будет доступно. Пока оплатите картой.',
  walletCardMessage: '💳 <b>{method}</b>\n\nКарта: <code>{card}</code>\nВладелец: <b>{holder}</b>\nСумма: <b>{amount} сум</b>\n\n📸 После оплаты отправьте фото чека в этот чат.',
  walletAmountChosen: '✅ Выбрано {amount} сум.',
  walletReceiptReceived: '✅ <b>Чек принят</b>\n\nЗаявка #{id} на {amount} сум отправлена админу на проверку.',
  walletApproved: '✅ <b>Баланс пополнен</b>\n\n{amount} сум зачислено на ваш счёт.',
  walletRejected: '❌ <b>Чек отклонён</b>\n\nОплата на {amount} сум не подтверждена. Свяжитесь с админом.',
  adminApprove: '✅ Подтвердить',
  adminReject: '❌ Отклонить',
  marketTitle: '<b>🛒 Inferno Market — быстрый поиск</b>',
  marketBody: 'Выберите цену или категорию. Кнопка откроет Mini App с этим фильтром.',
  marketPriceLow: '💰 0–500 тыс',
  marketPriceMid: '💰 500 тыс–2 млн',
  marketPriceHigh: '💰 2 млн+',
  marketPro: '🏆 Pro / X-Suit',
  marketConqueror: '👑 Conqueror',
  marketClassic: '🎮 Classic',
  marketReset: '🔄 Сбросить фильтры',
  marketOpenFull: '📱 Весь маркет',
  marketOpenSelected: '📱 Открыть с фильтром',
  marketShowResults: '🔎 Показать результаты',
  marketPrev: '⬅️ Назад',
  marketNext: 'Вперёд ➡️',
  marketChangeFilters: '⚙️ Изменить фильтры',
  marketResultsTitle: '🔎 Результаты маркета',
  marketEmpty: 'По этому фильтру объявлений пока нет.',
  marketPage: 'Страница',
  marketCurrency: 'сум',
  sellTitle: '➕ ПРОДАТЬ АККАУНТ',
  sellBody: 'Откройте Mini App, добавьте фото/видео и укажите цену.\nПосле проверки админом объявление появится на маркете.',
  ordersTitle: '📦 МОИ СДЕЛКИ',
  ordersBody: 'Статус escrow, оплата и подтверждение передачи — в Mini App.',
  faqTitle: '❓ ЧАСТЫЕ ВОПРОСЫ',
  helpTitle: '🎮 INFERNO GOLD MARKET',
  helpBody: 'Выберите раздел в меню ниже 👇',
  adminOnly: '⛔ Этот раздел только для админов.',
  receiptTooLarge: '❌ Чек должен быть меньше 8 МБ. Отправьте фото поменьше.',
  receiptFailed: '❌ Не удалось принять чек. Попробуйте ещё раз.',
  receiptNoAmount: '⚠️ Сначала выберите сумму, затем отправьте фото чека.',
  contactOtherUser: '⚠️ Это номер другого пользователя. Отправьте свой контакт.',
  contactVerifiedBody: 'Откройте Mini App ниже — профиль и объявления загрузятся автоматически.',
  adminNewReceipt: '📥 <b>Новый чек пополнения</b>\n\nПользователь: #{user}\nСумма: <b>{amount} сум</b>\nЧек: {url}',
  adminReviewDone: '{icon} Чек #{id} — {state}.',
  adminReviewSkipped: '⚠️ Чек #{id} не изменён ({reason}).',
  callbackExpired: 'Кнопка устарела. Откройте меню заново.',
  cbLoading: 'Загрузка…',
  cbFilters: 'Фильтры',
  walletBack: '⬅️ Назад',
  walletOther: '✍️ Другая сумма',
  startCommandHint: 'Открыть меню Inferno',
};

const en: Texts = {
  menuMarket: '🛒 Market',
  menuSell: '➕ Sell',
  menuOrders: '📦 My deals',
  menuProfile: '👤 Profile',
  menuListings: '🧾 My listings',
  menuWallet: '💳 Balance',
  menuReferral: '👥 Referral',
  menuRules: '📜 Rules',
  menuSupport: '🆘 Support',
  menuAdmin: '👨‍💼 Admin',
  menuPanel: '🛡 Admin panel',
  panelTitle: '🛡 ADMIN PANEL',
  panelBody: 'Bot control, account approval and receipt review live here. Panel owner: {panelAdmin}',
  panelBotControl: '⚙️ Bot control',
  panelListings: '✅ Approve accounts',
  panelReceipts: '🧾 Receipts',
  panelAdminChat: '👑 Panel admin',
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
  adminTitle: '👨‍💼 CONTACT ADMIN',
  adminBody: 'For deal, payment or dispute questions message our admin directly: {admin}\n\n⚠️ Never share your login or password. The admin never asks for them.',
  chooseSection: '👇 Pick a section from the menu below:',
  walletTitle: '💳 TOP UP BALANCE',
  walletIntro: '1️⃣ Choose an amount\n2️⃣ Choose a payment method\n3️⃣ Send the receipt photo here\n\nYour balance is credited once an admin approves it.',
  walletChooseAmount: '💰 Choose an amount:',
  walletChooseMethod: '💳 Choose a payment method:',
  walletMethodUzcard: '🟢 UZCARD',
  walletMethodVisa: '🔵 VISA',
  walletMethodTon: '💎 TON — soon',
  walletMethodStars: '⭐ Stars — soon',
  walletSoon: '🚧 Coming soon. Please pay by card for now.',
  walletCardMessage: '💳 <b>{method}</b>\n\nCard: <code>{card}</code>\nHolder: <b>{holder}</b>\nAmount: <b>{amount} so‘m</b>\n\n📸 Send the payment receipt photo to this chat.',
  walletAmountChosen: '✅ {amount} so‘m selected.',
  walletReceiptReceived: '✅ <b>Receipt received</b>\n\nRequest #{id} for {amount} so‘m was sent to admin review.',
  walletApproved: '✅ <b>Balance topped up</b>\n\n{amount} so‘m has been added to your account.',
  walletRejected: '❌ <b>Receipt rejected</b>\n\nThe {amount} so‘m payment was not confirmed. Contact the admin.',
  adminApprove: '✅ Approve',
  adminReject: '❌ Reject',
  marketTitle: '<b>🛒 Inferno Market — quick search</b>',
  marketBody: 'Pick a price range or category. The button opens the Mini App market with that filter.',
  marketPriceLow: '💰 0–500K',
  marketPriceMid: '💰 500K–2M',
  marketPriceHigh: '💰 2M+',
  marketPro: '🏆 Pro / X-Suit',
  marketConqueror: '👑 Conqueror',
  marketClassic: '🎮 Classic',
  marketReset: '🔄 Reset filters',
  marketOpenFull: '📱 Full market',
  marketOpenSelected: '📱 Open filtered market',
  marketShowResults: '🔎 Show results',
  marketPrev: '⬅️ Previous',
  marketNext: 'Next ➡️',
  marketChangeFilters: '⚙️ Change filters',
  marketResultsTitle: '🔎 Marketplace results',
  marketEmpty: 'No listings match this filter yet.',
  marketPage: 'Page',
  marketCurrency: 'UZS',
  sellTitle: '➕ SELL AN ACCOUNT',
  sellBody: 'Open the Mini App, add photos/video and set your price.\nAfter admin review the listing goes live on the market.',
  ordersTitle: '📦 MY DEALS',
  ordersBody: 'Escrow status, payment and delivery confirmation are in the Mini App.',
  faqTitle: '❓ FAQ',
  helpTitle: '🎮 INFERNO GOLD MARKET',
  helpBody: 'Pick a section from the menu below 👇',
  adminOnly: '⛔ This section is for admins only.',
  receiptTooLarge: '❌ The receipt must be under 8 MB. Send a smaller photo.',
  receiptFailed: '❌ Could not accept the receipt. Please try again.',
  receiptNoAmount: '⚠️ First choose an amount, then send the receipt photo.',
  contactOtherUser: '⚠️ This is another user’s number. Please share your own contact.',
  contactVerifiedBody: 'Open the Mini App below — your profile and listings load automatically.',
  adminNewReceipt: '📥 <b>New top-up receipt</b>\n\nUser: #{user}\nAmount: <b>{amount} so‘m</b>\nReceipt: {url}',
  adminReviewDone: '{icon} Receipt #{id} — {state}.',
  adminReviewSkipped: '⚠️ Receipt #{id} was not changed ({reason}).',
  callbackExpired: 'This button expired. Open the menu again.',
  cbLoading: 'Loading…',
  cbFilters: 'Filters',
  walletBack: '⬅️ Back',
  walletOther: '✍️ Other amount',
  startCommandHint: 'Open the Inferno menu',
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
