import { z } from "zod";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { DEFAULT_FAQ, listFaq } from "./faqData";
export { DEFAULT_FAQ, listFaq };
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, getInsertId, getOrderById, getUserById } from "./db";
import { notifyTelegramAdmins } from "./telegramBot";
import {
  categories,
  faqItems,
  mediaUploads,
  notifications,
  orders,
  pubgAccounts,
  supportTicketMessages,
  supportTickets,
  users,
} from "../drizzle/schema";

export const TICKET_CATEGORIES = ["buyurtma", "to'lov", "akkaunt", "media", "boshqa"] as const;

export const FULFILLMENT_LABELS: Record<string, string> = {
  waiting: "Kutilmoqda",
  preparing: "Yaratilmoqda",
  delivered: "Yuborildi",
};

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Baza vaqtincha ishlamayapti" });
  return db;
}

export const supportRouter = router({
  faq: publicProcedure.query(async () => listFaq()),

  myTickets: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(supportTickets).where(eq(supportTickets.userId, ctx.user.id)).orderBy(desc(supportTickets.createdAt));
  }),

  ticketMessages: protectedProcedure
    .input(z.object({ ticketId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, input.ticketId)).limit(1);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket topilmadi" });
      if (ticket.userId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const messages = await db
        .select()
        .from(supportTicketMessages)
        .where(eq(supportTicketMessages.ticketId, input.ticketId))
        .orderBy(supportTicketMessages.createdAt);
      return { ticket, messages };
    }),

  createTicket: protectedProcedure
    .input(
      z.object({
        subject: z.string().trim().min(4).max(160),
        category: z.enum(TICKET_CATEGORIES),
        message: z.string().trim().min(10).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const open = await db
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(and(eq(supportTickets.userId, ctx.user.id), inArray(supportTickets.status, ["open", "in_progress"])));
      if (open.length >= 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Sizda 5 ta ochiq ticket bor. Avval ularga javob oling." });
      const result = await db.insert(supportTickets).values({
        userId: ctx.user.id,
        subject: input.subject,
        category: input.category,
        message: input.message,
        status: "open",
      });
      const ticketId = getInsertId(result);
      await db.insert(supportTicketMessages).values({ ticketId, authorId: ctx.user.id, authorRole: "user", body: input.message });
      await notifyTelegramAdmins(
        `\u{1F4E9} <b>Yangi support murojaati</b>\n#${ticketId} \u2022 ${input.category}\n<b>${input.subject}</b>\n${input.message.slice(0, 500)}`,
      ).catch(() => undefined);
      return { ticketId };
    }),

  reply: protectedProcedure
    .input(z.object({ ticketId: z.number().int().positive(), body: z.string().trim().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, input.ticketId)).limit(1);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket topilmadi" });
      const isAdmin = ctx.user.role === "admin";
      if (ticket.userId !== ctx.user.id && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      if (ticket.status === "closed") throw new TRPCError({ code: "BAD_REQUEST", message: "Bu ticket yopilgan" });
      await db.insert(supportTicketMessages).values({
        ticketId: input.ticketId,
        authorId: ctx.user.id,
        authorRole: isAdmin ? "admin" : "user",
        body: input.body,
      });
      await db
        .update(supportTickets)
        .set(isAdmin ? { status: "in_progress", adminReply: input.body } : { status: "open" })
        .where(eq(supportTickets.id, input.ticketId));
      if (isAdmin && ticket.userId !== ctx.user.id) {
        await db.insert(notifications).values({
          userId: ticket.userId,
          type: "admin_message",
          title: `Support javobi #${ticket.id}`,
          message: input.body.slice(0, 240),
        });
      }
      return { ok: true };
    }),

  adminTickets: adminProcedure
    .input(z.object({ status: z.enum(["all", "open", "in_progress", "resolved", "closed"]).default("open") }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const status = input?.status ?? "open";
      const base = db
        .select({ ticket: supportTickets, userName: users.name, userOpenId: users.openId })
        .from(supportTickets)
        .leftJoin(users, eq(users.id, supportTickets.userId))
        .orderBy(desc(supportTickets.createdAt));
      return status === "all" ? await base : await base.where(eq(supportTickets.status, status));
    }),

  setTicketStatus: adminProcedure
    .input(z.object({ ticketId: z.number().int().positive(), status: z.enum(["open", "in_progress", "resolved", "closed"]) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(supportTickets).set({ status: input.status }).where(eq(supportTickets.id, input.ticketId));
      return { ok: true };
    }),
});

export const faqAdminRouter = router({
  listAll: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(faqItems).orderBy(faqItems.sortOrder, faqItems.id);
  }),
  create: adminProcedure
    .input(
      z.object({
        question: z.string().trim().min(4).max(255),
        answer: z.string().trim().min(4).max(4000),
        category: z.string().trim().min(2).max(64).default("umumiy"),
        sortOrder: z.number().int().min(0).max(999).default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const result = await db.insert(faqItems).values(input);
      return { id: getInsertId(result) };
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        question: z.string().trim().min(4).max(255).optional(),
        answer: z.string().trim().min(4).max(4000).optional(),
        category: z.string().trim().min(2).max(64).optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const db = await requireDb();
      await db.update(faqItems).set(rest).where(eq(faqItems.id, id));
      return { ok: true };
    }),
  remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(faqItems).where(eq(faqItems.id, input.id));
    return { ok: true };
  }),
});

export const DEFAULT_CATEGORIES = [
  { slug: "conqueror", name: "Conqueror", emoji: "👑", description: "Conqueror tarixi bor eng kuchli akkauntlar", sortOrder: 1 },
  { slug: "xsuit", name: "X-Suit", emoji: "🥷", description: "X-Suit va mifik to'plamli akkauntlar", sortOrder: 2 },
  { slug: "mythic", name: "Mifik skin", emoji: "🔥", description: "Mifik qurol skinlariga boy akkauntlar", sortOrder: 3 },
  { slug: "budget", name: "Arzon", emoji: "💸", description: "Boshlovchilar uchun hamyonbop akkauntlar", sortOrder: 4 },
  { slug: "classic", name: "Klassik", emoji: "🎯", description: "Barqaror statistikali oddiy akkauntlar", sortOrder: 5 },
];

export const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_CATEGORIES.map((item, index) => ({ id: -(index + 1), isActive: true, ...item }));
    try {
      const rows = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder, categories.id);
      if (rows.length) return rows;
    } catch (error) {
      console.warn("[Categories] Ro'yxatni o'qib bo'lmadi:", error);
    }
    return DEFAULT_CATEGORIES.map((item, index) => ({ id: -(index + 1), isActive: true, ...item }));
  }),
  listAll: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(categories).orderBy(categories.sortOrder, categories.id);
  }),
  create: adminProcedure
    .input(
      z.object({
        slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,64}$/, "Slug faqat lotin harf, raqam va tire"),
        name: z.string().trim().min(2).max(96),
        emoji: z.string().trim().max(8).optional(),
        description: z.string().trim().max(255).optional(),
        sortOrder: z.number().int().min(0).max(999).default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, input.slug)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Bu slug band" });
      const result = await db.insert(categories).values(input);
      return { id: getInsertId(result) };
    }),
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().trim().min(2).max(96).optional(),
        emoji: z.string().trim().max(8).optional(),
        description: z.string().trim().max(255).optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const db = await requireDb();
      await db.update(categories).set(rest).where(eq(categories.id, id));
      return { ok: true };
    }),
  remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(categories).where(eq(categories.id, input.id));
    return { ok: true };
  }),
});

export const mediaModerationRouter = router({
  /** Fayl storage'ga yuklangandan keyin moderatsiya navbatiga qo'yiladi. */
  register: protectedProcedure
    .input(
      z.object({
        url: z.string().url().max(500),
        contentType: z.string().min(3).max(64),
        sizeBytes: z.number().int().min(0).max(200 * 1024 * 1024),
        originalSizeBytes: z.number().int().min(0).max(2_000 * 1024 * 1024).default(0),
        accountId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const kind = input.contentType.startsWith("video/") ? "video" : "image";
      const result = await db.insert(mediaUploads).values({
        userId: ctx.user.id,
        accountId: input.accountId ?? null,
        url: input.url,
        kind,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        originalSizeBytes: input.originalSizeBytes || input.sizeBytes,
        status: "pending",
      });
      return { id: getInsertId(result), status: "pending" as const };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(mediaUploads).where(eq(mediaUploads.userId, ctx.user.id)).orderBy(desc(mediaUploads.createdAt));
  }),

  queue: adminProcedure
    .input(z.object({ status: z.enum(["all", "pending", "approved", "rejected"]).default("pending") }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const status = input?.status ?? "pending";
      const base = db
        .select({ media: mediaUploads, userName: users.name, userOpenId: users.openId })
        .from(mediaUploads)
        .leftJoin(users, eq(users.id, mediaUploads.userId))
        .orderBy(desc(mediaUploads.createdAt));
      return status === "all" ? await base : await base.where(eq(mediaUploads.status, status));
    }),

  moderate: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        approved: z.boolean(),
        note: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [media] = await db.select().from(mediaUploads).where(eq(mediaUploads.id, input.id)).limit(1);
      if (!media) throw new TRPCError({ code: "NOT_FOUND", message: "Media topilmadi" });
      await db
        .update(mediaUploads)
        .set({ status: input.approved ? "approved" : "rejected", reviewNote: input.note ?? null, reviewedBy: ctx.user.id })
        .where(eq(mediaUploads.id, input.id));
      await db.insert(notifications).values({
        userId: media.userId,
        type: "admin_message",
        title: input.approved ? "Media tasdiqlandi" : "Media rad etildi",
        message: input.approved
          ? "Yuklagan faylingiz moderatsiyadan o'tdi va e'londa ko'rinadi."
          : `Fayl rad etildi. Sabab: ${input.note || "qoidalarga mos emas"}.`,
        accountId: media.accountId ?? undefined,
      });
      return { ok: true };
    }),
});

export const trackingRouter = router({
  /** Xaridor buyurtmalari + yetkazish bosqichi. */
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db
      .select({
        order: orders,
        accountName: pubgAccounts.playerName,
        accountThumb: pubgAccounts.thumbnailUrl,
        accountLevel: pubgAccounts.level,
        accountRegion: pubgAccounts.region,
      })
      .from(orders)
      .leftJoin(pubgAccounts, eq(pubgAccounts.id, orders.accountId))
      .where(or(eq(orders.buyerId, ctx.user.id), eq(orders.sellerId, ctx.user.id)))
      .orderBy(desc(orders.createdAt));
  }),

  /** Sotuvchi yoki admin buyurtma bosqichini yangilaydi. */
  setFulfillment: protectedProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        status: z.enum(["waiting", "preparing", "delivered"]),
        note: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Buyurtma topilmadi" });
      const isAdmin = ctx.user.role === "admin";
      if (order.sellerId !== ctx.user.id && !isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Faqat sotuvchi yoki admin o'zgartiradi" });
      await db
        .update(orders)
        .set({
          fulfillmentStatus: input.status,
          fulfillmentNote: input.note ?? null,
          deliveredAt: input.status === "delivered" ? new Date() : null,
        })
        .where(eq(orders.id, input.orderId));
      const buyer = await getUserById(order.buyerId);
      if (buyer) {
        await db.insert(notifications).values({
          userId: buyer.id,
          type: "order_status",
          title: `Buyurtma #${order.id}: ${FULFILLMENT_LABELS[input.status]}`,
          message: input.note?.trim() || `Buyurtmangiz holati "${FULFILLMENT_LABELS[input.status]}" ga o'zgardi.`,
          orderId: order.id,
          accountId: order.accountId,
        });
      }
      return { ok: true, status: input.status };
    }),
});
