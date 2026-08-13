import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerTelegramBot, registerTelegramWebhook } from "../telegramBot";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Click webhook endpoint
  app.post("/api/payments/click/webhook", (req, res) => {
    const { click_trans_id, merchant_trans_id, error } = req.body || {};
    if (error && Number(error) < 0) {
      return res.json({ error: Number(error), error_note: "Error in request" });
    }
    return res.json({
      click_trans_id: click_trans_id || 999999,
      merchant_trans_id: merchant_trans_id || "order_unknown",
      merchant_prepare_id: 12345,
      error: 0,
      error_note: "Success"
    });
  });

  // Payme webhook endpoint (JSON-RPC)
  app.post("/api/payments/payme/webhook", (req, res) => {
    const { method, params, id } = req.body || {};
    if (!method) {
      return res.json({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: id || null });
    }
    switch (method) {
      case "CheckPerformTransaction":
        return res.json({ jsonrpc: "2.0", result: { allow: true }, id });
      case "CreateTransaction":
        return res.json({ jsonrpc: "2.0", result: { create_time: Date.now(), transaction: "payme_trans_" + (params?.id || Date.now()), state: 1 }, id });
      case "PerformTransaction":
        return res.json({ jsonrpc: "2.0", result: { perform_time: Date.now(), transaction: "payme_trans_" + (params?.id || Date.now()), state: 2 }, id });
      case "CancelTransaction":
        return res.json({ jsonrpc: "2.0", result: { cancel_time: Date.now(), transaction: "payme_trans_" + (params?.id || Date.now()), state: -1 }, id });
      case "CheckTransaction":
        return res.json({ jsonrpc: "2.0", result: { create_time: Date.now(), perform_time: Date.now(), cancel_time: 0, transaction: "payme_trans_" + (params?.id || Date.now()), state: 2 }, id });
      default:
        return res.json({ jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: id || null });
    }
  });
  registerTelegramWebhook(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Register Telegram bot commands, menu button, and webhook
    const botStatus = await registerTelegramBot();
    console.log(`[Telegram] commands=${botStatus.commands} menu=${botStatus.menu} webhook=${botStatus.webhook} status=${botStatus.status}`);
  });
}

startServer().catch(console.error);
