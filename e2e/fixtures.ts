import type { Page } from "@playwright/test";
import { demoAccount, demoReceipt, demoUser, mockTrpc, type CallLog, type Handlers } from "./trpcMock";

const searchResult = {
  items: [demoAccount],
  accounts: [demoAccount],
  total: 1,
  nextCursor: null,
  hasMore: false,
};

export function baseHandlers(overrides: Handlers = {}, opts: { admin?: boolean } = {}): Handlers {
  const user = { ...demoUser, role: opts.admin ? "admin" : "user" };
  return {
    "auth.me": user,
    "profile.get": user,
    "profile.update": (input: any) => ({ ...user, ...(input ?? {}) }),
    "profile.referral": { code: "INFERNO7", invited: 0, earned: 0 },
    "accounts.search": [demoAccount],
    "accounts.suggestions": [],
    "accounts.getById": demoAccount,
    "accounts.getSellerAccounts": [demoAccount],
    "accounts.recordView": { success: true },
    "accounts.create": { success: true, id: 99 },
    "favorites.list": [],
    "orders.getUserOrders": [],
    "chat.threads": [],
    "notifications.getUnread": [],
    "wallet.getBalance": { balance: 150000, currency: "UZS" },
    "wallet.getTransactions": [],
    "wallet.getTopupInstructions": { amounts: [10000, 20000, 50000], cardNumber: "8600 1234 5678 9012", cardHolder: "PUBG MARKET", note: "Chek yuboring" },
    "wallet.getDepositReceipts": [demoReceipt],
    "wallet.myReceipts": [demoReceipt],
    "wallet.submitReceipt": { success: true, receiptId: 55, status: "pending" },
    "wallet.uploadReceipt": { success: true, receiptId: 55, status: "pending" },
    "media.presignUpload": { uploadUrl: "https://storage.test/upload/mock", key: "users/7/media/mock.jpg", url: "https://picsum.photos/seed/up/600/600" },
    "media.upload": { url: "https://picsum.photos/seed/up/600/600", key: "users/7/media/mock.jpg" },
    "orders.getSellerOrders": [],
    "reviews.getSellerReviews": [],
    "notifications.getAll": [],
    "phrases.list": [],
    "admin.getPendingAccounts": [],
    "admin.getSellerVerificationQueue": [],
    "admin.getReviewReports": [],
    "admin.getDisputes": [],
    "admin.getPayoutQueue": [],
    "admin.getAuditLogs": [],
    "admin.getStats": { users: 12, accounts: 5, orders: 3, revenue: 100000 },
    "admin.pendingReceipts": [{ ...demoReceipt, amount: 137000, userName: "INSPECTOR", userOpenId: "telegram:12345" }],
    "admin.getDepositReceipts": [demoReceipt],
    "admin.reviewReceipt": { success: true, id: 3, status: "approved" },
    "admin.reviewDepositReceipt": { success: true },
    ...overrides,
  };
}

export async function setupApp(
  page: Page,
  opts: { admin?: boolean; handlers?: Handlers; lang?: string } = {},
): Promise<CallLog> {
  await page.route("**/storage.test/**", route => route.fulfill({ status: 200, body: "ok" }));
  await page.route("**picsum.photos/**", route =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#f59e0b"/></svg>',
    }),
  );
  const calls = await mockTrpc(page, baseHandlers(opts.handlers ?? {}, { admin: opts.admin }));
  await page.addInitScript((lang: string) => {
    localStorage.setItem("inferno-lang", lang);
    localStorage.setItem("lang", lang);
    localStorage.setItem("language", lang);
    localStorage.setItem("pubg-intro-seen", "1");
    localStorage.setItem("introSeen", "1");
  }, opts.lang ?? "uz");
  return calls;
}

/** Reports content elements that stick out past the phone viewport. */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const limit = doc.clientWidth + 2;
    const offenders: string[] = [];

    const isClipped = (el: HTMLElement) => {
      let parent = el.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (style.overflowX === "hidden" || style.overflowX === "auto" || style.overflowX === "scroll") return true;
        parent = parent.parentElement;
      }
      return false;
    };

    document.querySelectorAll<HTMLElement>("body *").forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      if (rect.right <= limit) return;
      const style = getComputedStyle(el);
      // Decorative layers (backgrounds, glows) may be oversized on purpose.
      if (style.pointerEvents === "none" || style.position === "fixed") return;
      const hasOwnText = Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
      const interactive = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
      if (!hasOwnText && !interactive) return;
      if (isClipped(el)) return;
      offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    });

    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders: offenders.slice(0, 5) };
  });
}

export async function skipIntro(page: Page) {
  const skip = page.getByRole("button", { name: /skip|o.tkazib|пропустить|boshlash|start/i }).first();
  if (await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
  await page.waitForTimeout(1500);
}

export const tinyJpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);
