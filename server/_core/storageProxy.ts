import type { Express } from "express";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./env";
import { dbStorageRead, getLocalStoragePath, hasForgeStorage, localStorageRead, verifyLocalUploadToken } from "../storage";

const MAX_DIRECT_UPLOAD_BYTES = 200 * 1024 * 1024;

function contentTypeForKey(key: string): string {
  const extension = path.extname(key).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

export function registerStorageProxy(app: Express) {
  app.put("/api/storage/upload/*", async (req, res) => {
    if (hasForgeStorage()) {
      res.status(404).send("Not found");
      return;
    }

    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    const expires = Number(req.query.expires);
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!verifyLocalUploadToken(key, expires, token)) {
      res.status(403).send("Invalid or expired upload URL");
      return;
    }

    let destination = "";
    try {
      destination = getLocalStoragePath(key);
      await mkdir(path.dirname(destination), { recursive: true });
      const declaredSize = Number(req.headers["content-length"] ?? 0);
      if (declaredSize > MAX_DIRECT_UPLOAD_BYTES) {
        res.status(413).send("File is too large");
        return;
      }

      let received = 0;
      // "w" emas "wx": mavjud faylni qayta yozmaymiz, lekin xato bo'lsa ham
      // boshqa birovning faylini o'chirib yubormaymiz (quyidagi created bayrog'i).
      const writer = createWriteStream(destination, { flags: "wx" });
      let created = true;
      writer.on("open", () => { created = true; });
      req.on("data", chunk => {
        received += chunk.length;
        if (received > MAX_DIRECT_UPLOAD_BYTES) req.destroy(new Error("File is too large"));
      });
      req.pipe(writer);
      writer.on("finish", () => res.status(204).end());
      writer.on("error", async error => {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          created = false;
          if (!res.headersSent) res.status(204).end();
          return;
        }
        if (created) await unlink(destination).catch(() => undefined);
        if (!res.headersSent) res.status(500).send(error.message);
      });
      req.on("error", async error => {
        writer.destroy();
        if (created) await unlink(destination).catch(() => undefined);
        if (!res.headersSent) res.status(error.message === "File is too large" ? 413 : 500).send(error.message);
      });
    } catch (error) {
      if (destination) await unlink(destination).catch(() => undefined);
      res.status(400).send(error instanceof Error ? error.message : "Upload failed");
    }
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!hasForgeStorage()) {
      const fromDb = await dbStorageRead(key);
      if (fromDb) {
        res.set("Content-Type", fromDb.contentType || contentTypeForKey(key));
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.send(fromDb.data);
        return;
      }
      try {
        const file = await localStorageRead(key);
        res.set("Content-Type", contentTypeForKey(key));
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.send(file);
      } catch {
        res.status(404).send("File not found");
      }
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
