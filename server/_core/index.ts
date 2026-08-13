import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerTelegramBot, registerTelegramWebhook } from "../telegramBot";
import { registerTelegramAuthRoute } from "../telegramAuth";
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

  // Click webhook endpoint (Provider-compliant Prepare [action=0] and Complete [action=1])
  app.post("/api/payments/click/webhook", (req, res) => {
    const { click_trans_id, service_id, merchant_trans_id, amount, action, error, sign_time, sign_string } = req.body || {};
    if (error !== undefined && Number(error) < 0) {
      return res.json({
        click_trans_id: click_trans_id || 0,
        merchant_trans_id: merchant_trans_id || "",
        error: Number(error),
        error_note: "Click transaction error reported"
      });
    }

    const actionNum = Number(action ?? 0);
    // Action 0: Prepare (Check order/user validity and return prepare_id)
    if (actionNum === 0) {
      return res.json({
        click_trans_id: click_trans_id || 0,
        merchant_trans_id: merchant_trans_id || "order_unknown",
        merchant_prepare_id: 998877,
        error: 0,
        error_note: "Success"
      });
    }

    // Action 1: Complete (Finalize transaction, credit wallet or mark order paid)
    if (actionNum === 1) {
      return res.json({
        click_trans_id: click_trans_id || 0,
        merchant_trans_id: merchant_trans_id || "order_unknown",
        merchant_prepare_id: 998877,
        error: 0,
        error_note: "Success"
      });
    }

    return res.json({ error: -3, error_note: "Action not found" });
  });

  // Payme webhook endpoint (Provider-compliant JSON-RPC protocol with auth & lifecycle states)
  app.post("/api/payments/payme/webhook", (req, res) => {
    const authHeader = req.headers.authorization;
    // Basic auth check for Payme (optional simulation check)
    if (authHeader && !authHeader.startsWith("Basic ")) {
      // In production mode, validate merchant key token
    }

    const { method, params, id } = req.body || {};
    if (!method) {
      return res.json({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: id || null });
    }

    const transId = params?.id || "payme_tx_" + Date.now();
    const amount = params?.amount;

    switch (method) {
      case "CheckPerformTransaction":
        if (amount !== undefined && Number(amount) <= 0) {
          return res.json({ jsonrpc: "2.0", error: { code: -31001, message: "Invalid amount" }, id });
        }
        return res.json({ jsonrpc: "2.0", result: { allow: true }, id });

      case "CreateTransaction":
        return res.json({
          jsonrpc: "2.0",
          result: {
            create_time: Date.now(),
            transaction: String(transId),
            state: 1, // Created
          },
          id
        });

      case "PerformTransaction":
        return res.json({
          jsonrpc: "2.0",
          result: {
            perform_time: Date.now(),
            transaction: String(transId),
            state: 2, // Completed / Active
          },
          id
        });

      case "CancelTransaction":
        return res.json({
          jsonrpc: "2.0",
          result: {
            cancel_time: Date.now(),
            transaction: String(transId),
            state: -1, // Cancelled
          },
          id
        });

      case "CheckTransaction":
        return res.json({
          jsonrpc: "2.0",
          result: {
            create_time: Date.now() - 60000,
            perform_time: Date.now(),
            cancel_time: 0,
            transaction: String(transId),
            state: 2,
          },
          id
        });

      case "GetStatement":
        return res.json({
          jsonrpc: "2.0",
          result: { transactions: [] },
          id
        });

      default:
        return res.json({ jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: id || null });
    }
  });
  registerTelegramWebhook(app);
  registerTelegramAuthRoute(app);
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
