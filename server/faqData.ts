import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { faqItems } from "../drizzle/schema";

/** Baza bo'sh bo'lsa ham foydalanuvchi javobsiz qolmasligi uchun zaxira FAQ. */
export const DEFAULT_FAQ: Array<{ question: string; answer: string; category: string }> = [
  {
    question: "Akkaunt sotib olsam pulim qanday himoyalanadi?",
    answer:
      "To'lov darhol sotuvchiga o'tmaydi. Mablag' escrow (kafolat) hisobida muzlatiladi va siz akkauntni tekshirib tasdiqlaganingizdan keyingina sotuvchiga o'tkaziladi.",
    category: "to'lov",
  },
  {
    question: "Buyurtma holatlari nimani anglatadi?",
    answer:
      "⏳ Kutilmoqda — to'lov muzlatildi, sotuvchi javobini kutamiz.\n⚙️ Yaratilmoqda — akkaunt ma'lumotlari tayyorlanmoqda.\n✅ Yuborildi — login yuborildi, endi tekshirib tasdiqlaysiz.",
    category: "buyurtma",
  },
  {
    question: "Qanday fayl yuklay olaman?",
    answer:
      "Rasm: JPG, PNG, WEBP. Video: MP4, WEBM, MOV. Bitta fayl 200 MB gacha. Rasmlar yuklashdan oldin brauzerda avtomatik siqiladi.",
    category: "media",
  },
  {
    question: "Nega yuklagan rasmim darhol ko'rinmayapti?",
    answer: "Har bir media admin moderatsiyasidan o'tadi. Tasdiqlangandan keyin e'loningizda avtomatik ko'rinadi.",
    category: "media",
  },
  {
    question: "Sotuvchi aloqaga chiqmasa nima qilaman?",
    answer: "Support bo'limidan ticket yuboring yoki nizo oching. Admin 24 soat ichida ko'rib chiqadi.",
    category: "xavfsizlik",
  },
  {
    question: "Login va parolni chatda yuborsam bo'ladimi?",
    answer: "Yo'q. Parolni hech qachon ochiq chatda yubormang. Faqat escrow bosqichida platforma orqali topshiring.",
    category: "xavfsizlik",
  },
];

function fallback() {
  return DEFAULT_FAQ.map((item, index) => ({ id: -(index + 1), sortOrder: index, isActive: true, ...item }));
}

/** Aktiv FAQ ro'yxati — bot va Mini App uchun umumiy. */
export async function listFaq() {
  const db = await getDb();
  if (!db) return fallback();
  try {
    const rows = await db.select().from(faqItems).where(eq(faqItems.isActive, true)).orderBy(faqItems.sortOrder, faqItems.id);
    if (rows.length) return rows;
  } catch (error) {
    console.warn("[FAQ] Ro'yxatni o'qib bo'lmadi:", error);
  }
  return fallback();
}
