import type { Express } from "express";
import path from "node:path";
import { ENV } from "./env";
import { dbStorageRead, hasForgeStorage, localStorageRead, storagePutRaw, verifyLocalUploadToken } from "../storage";

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

    const declaredSize = Number(req.headers["content-length"] ?? 0);
    if (declaredSize > MAX_DIRECT_UPLOAD_BYTES) {
      res.status(413).send("File is too large");
      return;
    }

    const contentType =
      (typeof req.query.ct === "string" && req.query.ct) ||
      (typeof req.headers["content-type"] === "string" ? req.headers["content-type"] : "") ||
      contentTypeForKey(key);

    // Faylni oqim bilan qabul qilamiz, so'ng saqlash joyiga (S3 yoki lokal) yozamiz.
    if (hasForgeStorage()) {
      const chunks: Buffer[] = [];
      let received = 0;
      let failed = false;
      req.on("data", chunk => {
        received += chunk.length;
        if (received > MAX_DIRECT_UPLOAD_BYTES) {
          failed = true;
          req.destroy(new Error("File is too large"));
          return;
        }
        chunks.push(chunk as Buffer);
      });
      req.on("error", error => {
        if (!res.headersSent) res.status(error.message === "File is too large" ? 413 : 500).send(error.message);
      });
      req.on("end", async () => {
        if (failed) return;
        try {
          await storagePutRaw(key, Buffer.concat(chunks), contentType);
          if (!res.headersSent) res.status(204).end();
        } catch (error) {
          console.error("[StorageProxy] upload failed:", error);
          if (!res.headersSent) res.status(502).send(error instanceof Error ? error.message : "Upload failed");
        }
      });
      return;
    }

    // Forge yo'q bo'lsa ham faylni bazaga (yoki lokal diskka) saqlaymiz:
    // Railway diski vaqtinchalik bo'lgani uchun avval baza urinib ko'riladi.
    const chunks: Buffer[] = [];
    let received = 0;
    let failed = false;
    req.on("data", chunk => {
      received += chunk.length;
      if (received > MAX_DIRECT_UPLOAD_BYTES) {
        failed = true;
        req.destroy(new Error("File is too large"));
        return;
      }
      chunks.push(chunk as Buffer);
    });
    req.on("error", error => {
      if (!res.headersSent) res.status(error.message === "File is too large" ? 413 : 500).send(error.message);
    });
    req.on("end", async () => {
      if (failed) return;
      try {
        await storagePutRaw(key, Buffer.concat(chunks), contentType);
        if (!res.headersSent) res.status(204).end();
      } catch (error) {
        console.error("[StorageProxy] local upload failed:", error);
        if (!res.headersSent) res.status(500).send(error instanceof Error ? error.message : "Upload failed");
      }
    });
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
