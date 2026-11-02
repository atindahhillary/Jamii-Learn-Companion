import { randomBytes } from "node:crypto";
import { classify } from "./analyze.js";
import { q } from "./db.js";
import { encrypt, hashSecret, phoneHash } from "./security.js";
import { MODULES } from "../shared/curriculum.js";
import { BOT_POST, CIRCLES, FIRST_POST, NAMES, SAYINGS } from "../shared/demo-data.js";

// Fictional people only. Circles are always created; demo learners need SEED_DEMO=1.
export async function seed() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO) throw new Error("demo seed is not allowed in production");
  if (!(await q("select 1 from circles limit 1")).length)
    for (const [n, t] of CIRCLES) await q("insert into circles (name, topic) values ($1,$2)", [n, t]);
  if (!process.env.SEED_DEMO || (await q("select 1 from users limit 1")).length) return;

  const [{ id: a }] = await q("insert into communities (name, county) values ('Jamii ya Mfano A','Kajiado') returning id");
  const [{ id: b }] = await q("insert into communities (name, county) values ('Jamii ya Mfano B','Samburu') returning id");
  const adminPhone = "+254700000001", learnerPhone = "+254700000002";
  const adminSecret = process.env.SEED_ADMIN_SECRET || randomBytes(12).toString("base64url");
  await q("insert into users (name, phone_hash, phone_enc, secret_hash, role, lang, consent_at, intake_step) values ('Msimamizi Mfano',$1,$2,$3,'admin','sw',now(),5)", [phoneHash(adminPhone), encrypt(adminPhone), await hashSecret(adminSecret)]);
  await q("insert into users (name, phone_hash, phone_enc, secret_hash, community_id, village, lang, consent_ai, consent_share, consent_at, intake_step) values ('Mshiriki Mfano',$1,$2,$3,$4,'Kijiji 1','sw',true,true,now(),5)", [phoneHash(learnerPhone), encrypt(learnerPhone), await hashSecret("482913"), a]);
  for (const [i, name] of NAMES.entries()) {
    const phone = `+25470100${String(i).padStart(4, "0")}`;
    const comm = i % 3 === 2 ? b : a;
    const [{ id }] = await q("insert into users (name, phone_hash, phone_enc, secret_hash, community_id, village, audience, consent_share, consent_at, intake_step, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9, now() - make_interval(days => $10)) returning id",
      [name, phoneHash(phone), encrypt(phone), await hashSecret(randomBytes(9).toString("hex")), comm, `Kijiji ${1 + (i % 4)}`, ["herder", "leader", "student", "elder", "trainer"][i % 5], i % 4 !== 3, i === 11 ? 2 : 5, 13 - i]);
    for (let j = 0; j < 3; j++) {
      const say = SAYINGS[(i * 3 + j) % SAYINGS.length], { theme, kind, sentiment } = classify(say), ago = (i + j * 3) % 14;
      await q("insert into insights (user_id, community_id, body, theme, kind, sentiment, shareable, created_at) values ($1,$2,$3,$4,$5,$6,$7, now() - make_interval(days => $8))", [id, comm, say, theme, kind, sentiment, i % 4 !== 3, ago]);
      await q("insert into messages (user_id, channel, role, body, created_at) values ($1,$2,'user',$3, now() - make_interval(days => $4))", [id, i % 3 === 0 ? "whatsapp" : "web", say, ago]);
    }
    for (const m of MODULES.slice(0, (i * 5) % 9))
      await q("insert into progress (user_id, module_id, score, updated_at) values ($1,$2,$3, now() - make_interval(days => $4))", [id, m.id, [50, 100, 100, 50][(i + m.id.length) % 4], (i * 2) % 12]);
    await q("insert into circle_members select id, $1 from circles on conflict do nothing", [id]);
  }
  await q("insert into circle_members select c.id, u.id from circles c, users u where u.name = 'Mshiriki Mfano' on conflict do nothing");
  const [u] = await q("select id from users where name = 'Nasieku L.'");
  await q("insert into posts (circle_id, user_id, body) values (1,$1,$2)", [u.id, FIRST_POST]);
  await q("insert into posts (circle_id, is_bot, body) values (1,true,$1)", [BOT_POST]);
  console.log(`Demo admin +254700000001 ${process.env.SEED_ADMIN_SECRET ? "(your SEED_ADMIN_SECRET)" : `/ ${adminSecret}`}\nDemo learner +254700000002 / 482913`);
}
