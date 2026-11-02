import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { q } from "./db.js";

const scryptAsync = promisify(scrypt) as (p: string, s: Buffer, n: number) => Promise<Buffer>;

function appSecret() {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set to 32+ characters");
  return "dev-only-secret-never-used-in-production";
}
const encKey = () => createHash("sha256").update(appSecret() + ":phone").digest();

export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[\s\-()]/g, "");
  const m = d.match(/^(?:\+?254|0)?([17]\d{8})$/);
  return m ? `+254${m[1]}` : null;
}
export const phoneHash = (p: string) => createHmac("sha256", appSecret()).update(p).digest("hex");
export const maskPhone = (p: string) => `${p.slice(0, 7)}***${p.slice(-2)}`;

export function encrypt(text: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(), iv);
  const body = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}
export function decrypt(blob: string) {
  const [iv, tag, body] = blob.split(".").map((s) => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", encKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

export async function hashSecret(secret: string) {
  const salt = randomBytes(16);
  return `${salt.toString("base64")}.${(await scryptAsync(secret, salt, 32)).toString("base64")}`;
}
export async function checkSecret(secret: string, stored: string | null) {
  // Unknown users still pay for a scrypt, so timing does not reveal who is registered.
  const [s, h] = (stored ?? `${randomBytes(16).toString("base64")}.${randomBytes(32).toString("base64")}`).split(".");
  const got = await scryptAsync(secret, Buffer.from(s, "base64"), 32);
  return timingSafeEqual(got, Buffer.from(h, "base64")) && !!stored;
}

export function pinProblem(pin: string) {
  if (!/^\d{6}$/.test(pin)) return "pin_format";
  if (/^(\d)\1{5}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) return "pin_weak";
  return null;
}

export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

// Stored in Postgres so limits hold across serverless instances.
export async function limited(key: string, max: number, windowSec: number) {
  const [r] = await q<{ count: number }>(
    `insert into rate (key, count, window_start) values ($1, 1, now())
     on conflict (key) do update set
       count = case when rate.window_start < now() - make_interval(secs => $2) then 1 else rate.count + 1 end,
       window_start = case when rate.window_start < now() - make_interval(secs => $2) then now() else rate.window_start end
     returning count`, [key, windowSec]);
  return r.count > max;
}

export const audit = (actor: string | null, action: string, detail = "") =>
  q("insert into audit (actor, action, detail) values ($1, $2, $3)", [actor, action, detail.slice(0, 300)]);

// Removes direct identifiers before text is stored or leaves the server.
export function redact(text: string) {
  return text
    .replace(/(?:\+?254|\b0)[17]\d{8}\b/g, "[nambari ya simu]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[barua pepe]")
    .replace(/\b(?:id|kitambulisho|passport|pasipoti)\D{0,15}\d{6,9}\b/gi, "[kitambulisho]")
    .replace(/\b(?:pin|nenosiri|password)\D{0,12}\S+/gi, "[siri]");
}
export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, max) : "");

export const verifyMetaSignature = (raw: string, header: string | undefined, secret: string) => {
  if (!header) return false;
  const want = Buffer.from(`sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`);
  const got = Buffer.from(header);
  return want.length === got.length && timingSafeEqual(want, got);
};
