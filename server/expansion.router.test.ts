import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getTelegramDeliveryStatus, sendTelegramNotification } from "./telegramNotifications";

const context = (user: any) => ({ user, req: { protocol: "https", headers: {} } as any, res: {} as any });

describe("expansion router", () => {
  it("exposes payment providers with an honest setup state", async () => {
    const caller = appRouter.createCaller(context({ id: 7, role: "user" }));
    const providers = await caller.expansion.payments.providers();
    expect(providers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "wallet", status: "active" }),
      expect.objectContaining({ key: "click", status: "setup_required" }),
      expect.objectContaining({ key: "payme", status: "setup_required" }),
    ]));
  });

  it("keeps admin monitoring protected from regular users", async () => {
    const caller = appRouter.createCaller(context({ id: 7, role: "user" }));
    await expect(caller.expansion.admin.monitor()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps trust profile input bounded to a positive user id", async () => {
    const caller = appRouter.createCaller(context({ id: 7, role: "user" }));
    await expect(caller.expansion.trust.profile({ userId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("reports Telegram delivery readiness without pretending it is configured", () => {
    const readiness = getTelegramDeliveryStatus();
    expect(["active", "setup_required"]).toContain(readiness.status);
    expect(typeof readiness.configured).toBe("boolean");
  });

  it("uses an explicit setup fallback when Telegram credentials are absent", async () => {
    const previous = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendTelegramNotification({ chatId: "test", text: "test" })).resolves.toEqual({ sent: false, status: "setup_required" });
    if (previous) process.env.TELEGRAM_BOT_TOKEN = previous;
  });
});
