import { randomInt } from "node:crypto";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { AUDIENCES, COUNCIL, INTAKE, THEMES, type Audience, type Lang, type Theme } from "../shared/content.js";
import { STARTERS, asText } from "../shared/council.js";
import { MODULES } from "../shared/curriculum.js";
import { MIN_GROUP, buildCurriculum, gapScores } from "./analyze.js";
import { circleReply, intakeQuestion, nextLesson, respond, reviewDocument, saveInsight, translate, type BotUser, type Mode } from "./bot.js";
import { q } from "./db.js";
import { audit, checkSecret, clean, decrypt, encrypt, hashSecret, limited, maskPhone, newToken, normalizePhone, phoneHash, pinProblem, redact, sha, verifyMetaSignature } from "./security.js";
import { sendText, sendTemplate, waConfigured } from "./whatsapp.js";

type User = BotUser & { name: string; role: string; village: string | null; phone_enc: string; wa_opted_in: boolean };
type Env = { Variables: { user: User } };
export const app = new Hono<Env>().basePath("/api");
const COOKIE = "ky_session";
const DAY = 86400_000;

// SameSite=Strict plus a required header blocks cross-site writes; the Meta webhook authenticates by signature.
app.use("*", async (c, next) => {
  if (c.req.method !== "GET" && !c.req.path.endsWith("/whatsapp/webhook") && c.req.header("x-ky") !== "1") return c.json({ error: "forbidden" }, 403);
  await next();
});
app.onError((e, c) => { console.error("api error", e.message); return c.json({ error: "server" }, 500); });

const ip = (c: Context) => c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "local";
const body = async (c: Context) => (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

async function startSession(c: Context, userId: string) {
  const token = newToken();
  await q("insert into sessions values ($1,$2,$3)", [sha(token), userId, new Date(Date.now() + 14 * DAY)]);
  setCookie(c, COOKIE, token, { httpOnly: true, sameSite: "Strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 14 * 86400 });
}
const auth = async (c: Context<Env>, next: () => Promise<void>) => {
  const t = getCookie(c, COOKIE);
  const [u] = t ? await q<User>("select u.* from users u join sessions s on s.user_id = u.id where s.token_hash = $1 and s.expires_at > now()", [sha(t)]) : [];
  if (!u) return c.json({ error: "auth" }, 401);
  c.set("user", u);
  await next();
};
const admin = async (c: Context<Env>, next: () => Promise<void>) => {
  if (c.get("user").role !== "admin") { await audit(c.get("user").id, "admin_denied", c.req.path); return c.json({ error: "forbidden" }, 403); }
  await next();
};
const publicUser = (u: User) => ({ id: u.id, name: u.name, role: u.role, lang: u.lang, audience: u.audience, village: u.village, consentAi: u.consent_ai, consentShare: u.consent_share, intakeStep: u.intake_step, intakeTotal: INTAKE.length, phone: maskPhone(decrypt(u.phone_enc)) });

async function communityId(name: string, county: string) {
  if (!name || !county) return null;
  const [r] = await q<{ id: number }>("insert into communities (name, county) values ($1,$2) on conflict (name, county) do update set name = excluded.name returning id", [name, county]);
  return r.id;
}

app.post("/auth/register", async (c) => {
  // A whole workshop can share one mobile network IP, so this stays generous.
  if (await limited(`reg:${ip(c)}`, 60, 3600)) return c.json({ error: "rate" }, 429);
  const b = await body(c);
  const name = clean(b.name, 60), phone = normalizePhone(clean(b.phone, 20)), pin = clean(b.pin, 6);
  const lang: Lang = b.lang === "en" ? "en" : "sw";
  const audience = (clean(b.audience, 10) in AUDIENCES ? b.audience : "herder") as Audience;
  if (!name || !phone) return c.json({ error: "fields" }, 400);
  if (b.consentTerms !== true) return c.json({ error: "consent" }, 400);
  const bad = pinProblem(pin);
  if (bad) return c.json({ error: bad }, 400);
  const cid = await communityId(clean(b.community, 60), clean(b.county, 40));
  const [u] = await q<{ id: string }>(
    `insert into users (name, phone_hash, phone_enc, secret_hash, community_id, village, audience, lang, consent_ai, consent_share, consent_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now()) on conflict (phone_hash) do nothing returning id`,
    [name, phoneHash(phone), encrypt(phone), await hashSecret(pin), cid, clean(b.village, 60), audience, lang, b.consentAi === true, b.consentShare === true]);
  if (!u) return c.json({ error: "exists" }, 409);
  const circles = await q<{ id: number }>("select id from circles where community_id is null or community_id = $1", [cid]);
  for (const x of circles) await q("insert into circle_members values ($1,$2) on conflict do nothing", [x.id, u.id]);
  await audit(u.id, "register");
  await startSession(c, u.id);
  return c.json({ ok: true });
});

app.post("/auth/login", async (c) => {
  const b = await body(c);
  const phone = normalizePhone(clean(b.phone, 20)), secret = clean(b.secret, 128);
  if (await limited(`login:${ip(c)}`, 120, 900)) return c.json({ error: "rate" }, 429);
  const [u] = phone ? await q<User & { secret_hash: string; failed: number; locked_until: string | null }>("select * from users where phone_hash = $1", [phoneHash(phone)]) : [];
  if (u?.locked_until && new Date(u.locked_until) > new Date()) return c.json({ error: "locked" }, 423);
  if (!(await checkSecret(secret, u?.secret_hash ?? null))) {
    if (u) await q("update users set failed = failed + 1, locked_until = case when failed >= 4 then now() + interval '15 minutes' else null end where id = $1", [u.id]);
    return c.json({ error: "login" }, 401);
  }
  await q("update users set failed = 0, locked_until = null where id = $1", [u.id]);
  await audit(u.id, "login");
  await startSession(c, u.id);
  return c.json({ ok: true });
});

app.post("/auth/logout", async (c) => {
  const t = getCookie(c, COOKIE);
  if (t) await q("delete from sessions where token_hash = $1", [sha(t)]);
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.get("/me", auth, async (c) => {
  const u = c.get("user");
  const [comm] = u.community_id ? await q("select name, county from communities where id = $1", [u.community_id]) : [];
  return c.json({ ...publicUser(u), community: comm ?? null, whatsapp: waConfigured() });
});
app.patch("/me", auth, async (c) => {
  const b = await body(c), u = c.get("user");
  await q("update users set lang = $1, audience = $2, consent_ai = $3, consent_share = $4, consent_at = now() where id = $5",
    [b.lang === "en" ? "en" : b.lang === "sw" ? "sw" : u.lang, clean(b.audience, 10) in AUDIENCES ? b.audience : u.audience, typeof b.consentAi === "boolean" ? b.consentAi : u.consent_ai, typeof b.consentShare === "boolean" ? b.consentShare : u.consent_share, u.id]);
  if (b.consentShare === false) await q("update insights set shareable = false where user_id = $1", [u.id]);
  return c.json({ ok: true });
});
app.get("/me/export", auth, async (c) => {
  const u = c.get("user");
  const [messages, insights, progress, posts] = await Promise.all([
    q("select channel, role, body, created_at from messages where user_id = $1 order by id", [u.id]),
    q("select body, theme, kind, created_at from insights where user_id = $1 order by id", [u.id]),
    q("select module_id, score, updated_at from progress where user_id = $1", [u.id]),
    q("select circle_id, body, created_at from posts where user_id = $1", [u.id]),
  ]);
  await audit(u.id, "export_self");
  return c.json({ profile: publicUser(u), messages, insights, progress, posts });
});
app.delete("/me", auth, async (c) => {
  const u = c.get("user");
  await q("delete from users where id = $1", [u.id]); // cascades to everything they created
  await audit(null, "erasure");
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.get("/chat", auth, async (c) => {
  const u = c.get("user");
  const history = await q("select id, role, expert, body, source, flagged, asks, created_at from messages where user_id = $1 order by id desc limit 60", [u.id]);
  return c.json({ messages: history.reverse(), intakeQuestion: history.length ? null : intakeQuestion(u), starters: STARTERS.map((s) => s[u.lang as Lang]) });
});
app.post("/chat", auth, async (c) => {
  const u = c.get("user");
  if (await limited(`chat:${u.id}`, 40, 3600)) return c.json({ error: "rate" }, 429);
  const b = await body(c), text = clean(b.text, 1500);
  if (!text) return c.json({ error: "fields" }, 400);
  const mode = (["ask", "analogy", "game"].includes(b.mode as string) ? b.mode : "ask") as Mode;
  return c.json(await respond(u, text, "web", mode, clean(b.expert, 20) || undefined));
});
app.post("/chat/flag", auth, async (c) => {
  const b = await body(c);
  await q("update messages set flagged = true, flag_reason = $1 where id = $2 and user_id = $3 and role = 'bot'", [clean(b.reason, 200), Number(b.id) || 0, c.get("user").id]);
  return c.json({ ok: true });
});

const planFor = async (communityId: number | null) => {
  const [ins, prog] = await Promise.all([
    q("select theme, kind from insights where community_id is not distinct from $1", [communityId]),
    q("select p.module_id, p.score from progress p join users u on u.id = p.user_id where u.community_id is not distinct from $1", [communityId]),
  ]);
  return buildCurriculum(gapScores(ins, prog));
};

app.get("/learn", auth, async (c) => {
  const u = c.get("user");
  const [progress, circles, peers] = await Promise.all([
    q("select module_id, score, updated_at from progress where user_id = $1", [u.id]),
    q("select c.id, c.name, c.topic, (select count(*)::int from circle_members m where m.circle_id = c.id) members from circles c join circle_members m on m.circle_id = c.id where m.user_id = $1", [u.id]),
    q(`select to_char(d, 'YYYY-MM-DD') as day, (select count(*)::int from messages m where m.user_id = $1 and m.role = 'user' and m.created_at::date = d::date) + (select count(*)::int from progress p where p.user_id = $1 and p.updated_at::date = d::date) as n
       from generate_series(now() - interval '6 days', now(), interval '1 day') d order by d`, [u.id]),
  ]);
  return c.json({ progress, circles, activity: peers, plan: await planFor(u.community_id) });
});
app.post("/learn/quiz", auth, async (c) => {
  const u = c.get("user"), b = await body(c);
  const m = MODULES.find((x) => x.id === b.moduleId);
  if (!m || !Array.isArray(b.answers)) return c.json({ error: "fields" }, 400);
  const right = m.quiz.filter((qq, i) => (b.answers as number[])[i] === qq.answer).length; // graded here, so scores cannot be forged
  const score = Math.round((right / m.quiz.length) * 100);
  await q("insert into progress (user_id, module_id, score) values ($1,$2,$3) on conflict (user_id, module_id) do update set score = greatest(progress.score, excluded.score), updated_at = now()", [u.id, m.id, score]);
  return c.json({ score, right, total: m.quiz.length });
});
app.post("/learn/reflect", auth, async (c) => {
  const b = await body(c), m = MODULES.find((x) => x.id === b.moduleId), text = redact(clean(b.text, 600));
  if (!m || !text) return c.json({ error: "fields" }, 400);
  await saveInsight(c.get("user"), text, m.theme);
  return c.json({ ok: true });
});
// Questions asked mid-lesson skip the listening intake, so a learner is never pulled out of the walk.
app.post("/learn/ask", auth, async (c) => {
  const u = c.get("user");
  if (await limited(`chat:${u.id}`, 40, 3600)) return c.json({ error: "rate" }, 429);
  const text = clean((await body(c)).text, 800);
  return text ? c.json(await respond(u, text, "web", "ask", undefined, true)) : c.json({ error: "fields" }, 400);
});
app.get("/assignments", auth, async (c) => c.json(await q("select id, module_id, body, feedback from assignments where user_id = $1 order by id", [c.get("user").id])));
app.post("/assignments", auth, async (c) => {
  const u = c.get("user"), b = await body(c), text = redact(clean(b.text, 1500));
  if (!MODULES.some((m) => m.id === b.moduleId) || !text) return c.json({ error: "fields" }, 400);
  if (await limited(`work:${u.id}`, 30, 3600)) return c.json({ error: "rate" }, 429);
  await q("insert into assignments (user_id, module_id, body) values ($1,$2,$3) on conflict (user_id, module_id) do update set body = excluded.body, feedback = null, reviewed_by = null, updated_at = now()", [u.id, b.moduleId, text]);
  return c.json({ ok: true });
});
app.post("/learn/practice", auth, async (c) => {
  const score = Math.max(0, Math.min(100, Number((await body(c)).score) || 0));
  await q("insert into progress (user_id, module_id, score) values ($1,'roleplay',$2) on conflict (user_id, module_id) do update set score = greatest(progress.score, excluded.score), updated_at = now()", [c.get("user").id, score]);
  return c.json({ ok: true });
});

app.post("/tools/review", auth, async (c) => {
  const u = c.get("user");
  if (await limited(`tool:${u.id}`, 20, 3600)) return c.json({ error: "rate" }, 429);
  const text = clean((await body(c)).text, 12000);
  return text ? c.json(await reviewDocument(u, text)) : c.json({ error: "fields" }, 400);
});
app.post("/tools/translate", auth, async (c) => {
  const u = c.get("user");
  if (await limited(`tool:${u.id}`, 20, 3600)) return c.json({ error: "rate" }, 429);
  const b = await body(c), text = clean(b.text, 2000);
  return text ? c.json(await translate(u, text, b.to === "en" ? "en" : "sw")) : c.json({ error: "fields" }, 400);
});

const inCircle = async (id: number, uid: string) => (await q("select 1 from circle_members where circle_id = $1 and user_id = $2", [id, uid])).length > 0;
app.get("/circles/:id/posts", auth, async (c) => {
  const id = Number(c.req.param("id")), u = c.get("user");
  if (u.role !== "admin" && !(await inCircle(id, u.id))) return c.json({ error: "forbidden" }, 403);
  return c.json(await q("select p.id, p.body, p.is_bot, p.created_at, coalesce(u.name, 'Msaidizi') author from posts p left join users u on u.id = p.user_id where p.circle_id = $1 and not p.hidden order by p.id desc limit 50", [id]));
});
app.post("/circles/:id/posts", auth, async (c) => {
  const id = Number(c.req.param("id")), u = c.get("user");
  if (!(await inCircle(id, u.id))) return c.json({ error: "forbidden" }, 403);
  if (await limited(`post:${u.id}`, 20, 3600)) return c.json({ error: "rate" }, 429);
  const text = redact(clean((await body(c)).text, 800));
  if (!text) return c.json({ error: "fields" }, 400);
  await q("insert into posts (circle_id, user_id, body) values ($1,$2,$3)", [id, u.id, text]);
  if (/@msaidizi|@bot/i.test(text)) await q("insert into posts (circle_id, is_bot, body) values ($1,true,$2)", [id, await circleReply(u, text)]);
  return c.json({ ok: true });
});

// WhatsApp: the user keys in a number, we mint a one-time code and the chat continues on the bot's number.
app.post("/whatsapp/link", auth, async (c) => {
  const u = c.get("user");
  if (await limited(`walink:${u.id}`, 5, 3600)) return c.json({ error: "rate" }, 429);
  const phone = normalizePhone(clean((await body(c)).phone, 20));
  if (!phone) return c.json({ error: "phone" }, 400);
  if (phoneHash(phone) !== phoneHash(decrypt(u.phone_enc))) return c.json({ error: "phone_mismatch" }, 400);
  if (!waConfigured()) return c.json({ error: "not_configured" }, 503);
  const code = String(randomInt(100000, 1000000));
  await q("insert into wa_links values ($1,$2,now() + interval '15 minutes')", [sha(code), u.id]);
  await sendTemplate(phone, u.lang as Lang, code).catch(() => console.warn("template send failed")); // the link below still works
  return c.json({ url: `https://wa.me/${process.env.WA_BOT_NUMBER}?text=${encodeURIComponent(`JIUNGE ${code}`)}` });
});
app.get("/whatsapp/webhook", (c) => {
  const ok = c.req.query("hub.mode") === "subscribe" && c.req.query("hub.verify_token") === process.env.WA_VERIFY_TOKEN && !!process.env.WA_VERIFY_TOKEN;
  return ok ? c.text(c.req.query("hub.challenge") ?? "") : c.text("no", 403);
});
app.post("/whatsapp/webhook", async (c) => {
  const raw = await c.req.text(), secret = process.env.WA_APP_SECRET;
  if (!secret || !verifyMetaSignature(raw, c.req.header("x-hub-signature-256"), secret)) return c.text("no", 401);
  const value = JSON.parse(raw)?.entry?.[0]?.changes?.[0]?.value;
  for (const m of value?.messages ?? []) {
    const [fresh] = await q("insert into wa_seen (id) values ($1) on conflict do nothing returning id", [m.id]); // Meta retries deliveries
    if (fresh && m.type === "text") await handleWhatsApp(`+${m.from}`, clean(m.text?.body, 1500));
  }
  return c.text("ok");
});

const WA = {
  menu: { sw: "Andika swali lako, au: SOMO (somo lijalo), MAENDELEO, ACHA (kusitisha).", en: "Type your question, or: LESSON (next lesson), PROGRESS, STOP (opt out)." },
  stop: { sw: "Umesitishwa. Hutapokea ujumbe tena. Andika ANZA kurudi.", en: "You have opted out. Send START to come back." },
  join: { sw: "Karibu Jamii Learn Companion. Ili kujiunga, fungua programu na uweke nambari yako ili upate msimbo, kisha utume JIUNGE na msimbo huo hapa.", en: "Welcome to Jamii Learn Companion. To join, open the app, key in your number to get a code, then send JIUNGE and the code here." },
  linked: { sw: "Imeunganishwa. Mazungumzo yanaendelea hapa WhatsApp.", en: "Linked. Your chat continues here on WhatsApp." },
};
async function handleWhatsApp(phone: string, text: string) {
  const norm = normalizePhone(phone) ?? phone;
  if (await limited(`wa:${phoneHash(norm)}`, 30, 3600)) return;
  const code = text.match(/^jiunge\s+(\d{6})$/i)?.[1];
  const [known] = await q<User>("select * from users where phone_hash = $1", [phoneHash(norm)]);
  if (code) {
    const [link] = await q<{ user_id: string }>("delete from wa_links where code_hash = $1 and expires_at > now() returning user_id", [sha(code)]);
    // The code only links the phone that registered it, so a leaked code is useless elsewhere.
    if (!link || !known || link.user_id !== known.id) return sendText(norm, WA.join.sw);
    await q("update users set wa_opted_in = true where id = $1", [known.id]);
    await audit(known.id, "whatsapp_linked");
    const next = intakeQuestion(known);
    return sendText(norm, `${WA.linked[known.lang]}\n\n${next ?? WA.menu[known.lang]}`);
  }
  if (!known?.wa_opted_in) {
    if (known && /^(anza|start)$/i.test(text)) { await q("update users set wa_opted_in = true where id = $1", [known.id]); return sendText(norm, WA.menu[known.lang]); }
    return sendText(norm, WA.join.sw);
  }
  const lang = known.lang as Lang;
  if (/^(acha|stop)$/i.test(text)) { await q("update users set wa_opted_in = false where id = $1", [known.id]); return sendText(norm, WA.stop[lang]); }
  if (/^(menu|menyu|msaada|help)$/i.test(text)) return sendText(norm, WA.menu[lang]);
  const prog = await q<{ module_id: string; score: number }>("select module_id, score from progress where user_id = $1", [known.id]);
  if (/^(somo|lesson)$/i.test(text)) return sendText(norm, nextLesson(prog.map((p) => p.module_id), lang) ?? WA.menu[lang]);
  if (/^(maendeleo|progress)$/i.test(text)) return sendText(norm, `${prog.filter((p) => p.module_id !== "roleplay").length}/${MODULES.length}`);
  const r = await respond(known, text, "whatsapp");
  return sendText(norm, asText(r.replies, Object.fromEntries(COUNCIL.map((e) => [e.id, e.name[lang]]))));
}

app.use("/admin/*", auth, admin);

const reportData = async () => {
  const [ins, prog, users, shareable] = await Promise.all([
    q("select theme, kind, sentiment from insights"),
    q("select module_id, score from progress"),
    q("select c.name, c.county, count(u.id)::int n from users u join communities c on c.id = u.community_id where u.role = 'learner' group by 1,2 order by n desc"),
    // The minimum counts distinct people, not messages, so one talkative person cannot unlock a small group.
    q(`select distinct on (i.body) i.body, i.theme, i.kind, c.name community from insights i join communities c on c.id = i.community_id
       where i.shareable and i.kind <> 'knowledge' and i.community_id in (select community_id from insights where shareable group by 1 having count(distinct user_id) >= ${MIN_GROUP})
       order by i.body limit 40`),
  ]);
  const gaps = gapScores(ins, prog);
  const kinds = Object.fromEntries(["idea", "knowledge", "concern", "question"].map((k) => [k, ins.filter((i) => i.kind === k).length]));
  const voices = shareable.slice(0, 12);
  const sentiment = { pos: ins.filter((i) => i.sentiment > 0).length, neg: ins.filter((i) => i.sentiment < 0).length, total: ins.length };
  return { gaps, curriculum: buildCurriculum(gaps), kinds, voices, communities: users, sentiment, generatedAt: new Date().toISOString() };
};

app.get("/admin/overview", async (c) => {
  const [counts] = await q(`select (select count(*)::int from users where role = 'learner') learners,
    (select count(distinct user_id)::int from messages where created_at > now() - interval '7 days') active,
    (select count(*)::int from insights) insights,
    (select count(*)::int from progress where score >= 50 and module_id <> 'roleplay') passed,
    (select count(*)::int from messages where channel = 'whatsapp' and role = 'user') wa,
    (select count(*)::int from messages where channel = 'web' and role = 'user') web,
    (select count(*)::int from messages where flagged and not resolved) flags`);
  const [activity, stages, recent] = await Promise.all([
    q(`select to_char(d, 'MM-DD') as day, (select count(*)::int from messages m where m.role = 'user' and m.created_at::date = d::date) as messages,
       (select count(*)::int from progress p where p.updated_at::date = d::date) as lessons
       from generate_series(now() - interval '13 days', now(), interval '1 day') d order by d`),
    q(`select stage, count(*)::int n from (select u.id, case when u.intake_step < ${INTAKE.length} then 'listening' when count(p.module_id) = 0 then 'started'
       when count(p.module_id) < ${MODULES.length} then 'learning' else 'completed' end stage
       from users u left join progress p on p.user_id = u.id and p.module_id <> 'roleplay' where u.role = 'learner' group by u.id) x group by stage`),
    q("select action, at from audit where action in ('register','whatsapp_linked','export_self') order by id desc limit 6"),
  ]);
  return c.json({ counts, activity, stages, recent });
});
app.get("/admin/learners", async (c) => {
  const rows = await q<any>(`select u.id, u.name, u.village, u.audience, u.intake_step, u.wa_opted_in, u.phone_enc, u.created_at, c.name community,
    count(p.module_id) filter (where p.module_id <> 'roleplay')::int modules, round(avg(p.score))::int avg_score,
    (select max(m.created_at) from messages m where m.user_id = u.id) last_seen
    from users u left join communities c on c.id = u.community_id left join progress p on p.user_id = u.id
    where u.role = 'learner' group by u.id, c.name order by last_seen desc nulls last limit 500`);
  await audit(c.get("user").id, "view_learners");
  return c.json(rows.map(({ phone_enc, ...r }) => ({ ...r, phone: maskPhone(decrypt(phone_enc)) })));
});
app.get("/admin/report", async (c) => c.json(await reportData()));
app.get("/admin/report.csv", async (c) => {
  const r = await reportData();
  await audit(c.get("user").id, "export_report");
  const rows = [["order", "theme", "gap", "mastery_percent", "learners_tested", "voices", "start_day"], ...r.curriculum.map((g) => [g.order, THEMES[g.theme as Theme].en, g.gap, g.mastery, g.learners, g.voice, g.day])];
  c.header("content-type", "text/csv; charset=utf-8");
  c.header("content-disposition", 'attachment; filename="jamii-learn-companion-report.csv"');
  return c.body(rows.map((x) => x.join(",")).join("\n"));
});
app.get("/admin/assignments", async (c) => c.json(await q("select a.id, a.module_id, a.body, a.feedback, u.name from assignments a join users u on u.id = a.user_id order by a.feedback is not null, a.updated_at desc limit 200")));
app.post("/admin/assignments/:id/feedback", async (c) => {
  const text = redact(clean((await body(c)).text, 600));
  if (!text) return c.json({ error: "fields" }, 400);
  await q("update assignments set feedback = $1, reviewed_by = $2 where id = $3", [text, c.get("user").id, Number(c.req.param("id"))]);
  await audit(c.get("user").id, "assignment_feedback", c.req.param("id"));
  return c.json({ ok: true });
});
app.get("/admin/flags", async (c) => c.json(await q("select m.id, m.body, m.flag_reason, m.expert, m.created_at from messages m where m.flagged and not m.resolved order by m.id desc limit 50")));
app.post("/admin/flags/:id/resolve", async (c) => {
  await q("update messages set resolved = true where id = $1", [Number(c.req.param("id"))]);
  await audit(c.get("user").id, "flag_resolved", c.req.param("id"));
  return c.json({ ok: true });
});
app.get("/admin/circles", async (c) => c.json(await q("select c.id, c.name, c.topic, (select count(*)::int from circle_members m where m.circle_id = c.id) members, (select count(*)::int from posts p where p.circle_id = c.id and not p.hidden) posts from circles c order by c.id")));
app.post("/admin/posts/:id/hide", async (c) => {
  await q("update posts set hidden = true where id = $1", [Number(c.req.param("id"))]);
  await audit(c.get("user").id, "post_hidden", c.req.param("id"));
  return c.json({ ok: true });
});
