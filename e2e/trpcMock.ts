import type { Page, Route } from "@playwright/test";

export type Handler = (input: unknown) => unknown;
export type Handlers = Record<string, Handler | unknown>;

/** Calls recorded during a test, so specs can assert what the UI sent. */
export type CallLog = { path: string; input: unknown }[];

const resolve = (handlers: Handlers, path: string, input: unknown) => {
  const handler = handlers[path];
  if (typeof handler === "function") return (handler as Handler)(input);
  return handler ?? null;
};

/**
 * Intercepts the tRPC httpBatchLink so mobile e2e specs run without a database.
 * Responses use the superjson envelope the client expects.
 */
export async function mockTrpc(page: Page, handlers: Handlers): Promise<CallLog> {
  const calls: CallLog = [];

  await page.route("**/api/trpc/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const paths = decodeURIComponent(url.pathname.replace(/.*\/api\/trpc\//, "")).split(",");

    let inputs: Record<string, unknown> = {};
    if (request.method() === "GET") {
      const raw = url.searchParams.get("input");
      inputs = raw ? JSON.parse(raw) : {};
    } else {
      try {
        inputs = JSON.parse(request.postData() || "{}");
      } catch {
        inputs = {};
      }
    }

    const body = paths.map((path, index) => {
      const wrapped = (inputs as any)[index];
      const input = wrapped && typeof wrapped === "object" && "json" in wrapped ? (wrapped as any).json : wrapped;
      calls.push({ path, input });
      const data = resolve(handlers, path, input);
      if (data instanceof Error) {
        return {
          error: { json: { message: data.message, code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400, path } } },
        };
      }
      return { result: { data: { json: data ?? null } } };
    });

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });

  return calls;
}

export const demoUser = {
  id: 7,
  openId: "telegram:12345",
  telegramId: "12345",
  name: "INSPECTOR",
  role: "user",
  avatarUrl: null,
  phone: null,
  walletBalance: "150000",
  language: "uz",
  createdAt: new Date().toISOString(),
};

export const demoAccount = {
  id: 1,
  sellerId: 7,
  playerName: "Inferno Warrior",
  title: "Conqueror akkaunt",
  description: "M416 Glacier, Level 70",
  price: "1499000",
  level: 70,
  status: "available",
  images: ["https://picsum.photos/seed/pubg1/800/600", "https://picsum.photos/seed/pubg2/800/600"],
  videos: [],
  createdAt: new Date().toISOString(),
};

export const demoReceipt = {
  id: 3,
  userId: 7,
  amount: "137000",
  receiptKey: "users/7/receipts/chek.jpg",
  receiptUrl: "https://picsum.photos/seed/chek/600/900",
  status: "pending",
  createdAt: new Date().toISOString(),
};
