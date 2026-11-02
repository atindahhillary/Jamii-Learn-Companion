// Admins exist only through this script, never through the API. Usage: ADMIN_PHONE=07.. ADMIN_NAME=.. ADMIN_SECRET=.. npm run make-admin
import { q } from "./db.js";
import { encrypt, hashSecret, normalizePhone, phoneHash } from "./security.js";

const phone = normalizePhone(process.env.ADMIN_PHONE ?? ""), secret = process.env.ADMIN_SECRET ?? "";
if (!phone || secret.length < 12) throw new Error("Set ADMIN_PHONE and an ADMIN_SECRET of 12 or more characters");
await q(`insert into users (name, phone_hash, phone_enc, secret_hash, role, consent_at, intake_step) values ($1,$2,$3,$4,'admin',now(),5)
         on conflict (phone_hash) do update set role = 'admin', secret_hash = excluded.secret_hash`,
  [process.env.ADMIN_NAME || "Admin", phoneHash(phone), encrypt(phone), await hashSecret(secret)]);
console.log("Admin ready");
process.exit(0);
