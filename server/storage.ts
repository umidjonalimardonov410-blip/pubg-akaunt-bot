// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { ENV } from "./_core/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";

const LOCAL_STORAGE_ROOT = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

export function hasForgeStorage(): boolean {
  return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function signLocalUpload(key: string, expires: number): string {
  return createHmac("sha256", ENV.cookieSecret)
    .update(`${key}:${expires}`)
    .digest("hex");
}

export function verifyLocalUploadToken(key: string, expires: number, token: string): boolean {
  if (!ENV.cookieSecret || !Number.isFinite(expires) || expires < Date.now()) return false;
  if (token.length !== 64) return false;
  const expected = Buffer.from(signLocalUpload(key, expires));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getLocalStoragePath(relKey: string): string {
  const key = normalizeKey(relKey);
  const fullPath = path.resolve(LOCAL_STORAGE_ROOT, key);
  const relative = path.relative(LOCAL_STORAGE_ROOT, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage key");
  }
  return fullPath;
}

export async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
): Promise<void> {
  const fullPath = getLocalStoragePath(relKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

/** Bazadagi zaxira xotira: kichik fayllar (<= 8 MB) uchun. */
const DB_BLOB_LIMIT = 8 * 1024 * 1024;

export async function dbStoragePut(key: string, data: Buffer, contentType: string): Promise<boolean> {
  if (data.length > DB_BLOB_LIMIT) return false;
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return false;
    const { mediaBlobs } = await import("../drizzle/schema");
    await db.insert(mediaBlobs).values({
      storageKey: normalizeKey(key),
      contentType,
      byteSize: data.length,
      data,
    });
    return true;
  } catch (error) {
    console.error("[storage] db blob saqlanmadi:", error);
    return false;
  }
}

export async function dbStorageRead(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return null;
    const { mediaBlobs } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(mediaBlobs).where(eq(mediaBlobs.storageKey, normalizeKey(key))).limit(1);
    const row = rows[0];
    if (!row) return null;
    return { data: Buffer.from(row.data as Buffer), contentType: row.contentType };
  } catch (error) {
    console.error("[storage] db blob o'qilmadi:", error);
    return null;
  }
}

export async function localStorageRead(relKey: string): Promise<Buffer> {
  return readFile(getLocalStoragePath(relKey));
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (!hasForgeStorage()) {
    const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
    // Avval bazaga (deploydan keyin ham saqlanadi), bo'lmasa lokal diskka.
    const saved = await dbStoragePut(key, buffer, contentType);
    if (!saved) await localStoragePut(key, buffer);
    return { key, url: `/manus-storage/${key}` };
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

/** Presigned PUT URL so the browser can upload large files (e.g. 200 MB video) directly to S3. */
export async function storagePresignPut(
  relKey: string,
  contentType = "application/octet-stream",
): Promise<{ key: string; uploadUrl: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (!hasForgeStorage()) {
    const expires = Date.now() + 15 * 60 * 1000;
    const token = signLocalUpload(key, expires);
    return {
      key,
      uploadUrl: `/api/storage/upload/${key.split("/").map(encodeURIComponent).join("/")}?expires=${expires}&token=${token}`,
      url: `/manus-storage/${key}`,
    };
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  presignUrl.searchParams.set("content_type", contentType);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: uploadUrl } = (await presignResp.json()) as { url: string };
  if (!uploadUrl) throw new Error("Forge returned empty presign URL");

  return { key, uploadUrl, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  if (!hasForgeStorage()) return `/manus-storage/${normalizeKey(relKey)}`;
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
