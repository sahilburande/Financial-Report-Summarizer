import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const uploadRoot = () =>
  process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

function normalizeKey(relKey: string) {
  return relKey.replace(/^\/+/, "").replace(/\.\./g, "_");
}

function appendHashSuffix(relKey: string) {
  const hash = crypto.randomBytes(4).toString("hex");
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
  const absolutePath = path.join(uploadRoot(), key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  await fs.writeFile(absolutePath, bytes);
  return { key, url: `/uploads/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/uploads/${key}`;
}
