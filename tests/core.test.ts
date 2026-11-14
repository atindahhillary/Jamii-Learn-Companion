import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { MODULES, CARDS } from "../shared/curriculum.js";
import { RED_FLAGS, routeExpert } from "../shared/content.js";
import { buildCurriculum, classify, gapScores } from "../server/analyze.js";
import { app } from "../server/app.js";
import { q } from "../server/db.js";
import { seed } from "../server/seed.js";
import { checkSecret, decrypt, encrypt, hashSecret, normalizePhone, phoneHash, pinProblem, redact } from "../server/security.js";

const H = { "content-type": "application/json", "x-ky": "1" };
const post = (path: string, body: object, cookie = "") => app.request(`/api${path}`, { method: "POST", headers: { ...H, cookie }, body: JSON.stringify(body) });
const get = (path: string, cookie = "") => app.request(`/api${path}`, { headers: { cookie } });
let n = 10;
async function register(extra: object = {}) {
  const phone = `07123${String(n++).padStart(5, "0")}`;
  const r = await post("/auth/register", { name: "Test", phone, pin: "482913", community: "A", county: "Kajiado", consentTerms: true, consentShare: true, ...extra });
  expect(r.status).toBe(200);
  return { cookie: r.headers.get("set-cookie")!.split(";")[0], phone };
}

describe("council conversation", () => {
  const u = { lang: "sw" as const, audience: "herder" as const, intake_step: 5 };
  it("answers in one voice that carries several experts' points", async () => {
    const { converse, ALSO } = await import("../shared/council.js");
    const t = converse("Mgao wa mapato ni asilimia ngapi?", u, { pending: null, n: 0 });
    expect(t.replies).toHaveLength(1);
    expect(t.replies[0].expert).toBe("jamii");
    expect(t.replies[0].body).toContain("40%");
    expect(t.replies[0].body).toContain(ALSO.sw);
    expect(t.replies[0].source).toContain("reg 29");
    expect(t.followups).toHaveLength(3);
  });
  it("varies how a specialist opens", async () => {
    const { converse } = await import("../shared/council.js");
    const a = converse("CDA ni nini?", u, { pending: null, n: 0 }).replies[0].body, b = converse("CDA ni nini?", u, { pending: null, n: 1 }).replies[0].body;
    expect(a).not.toBe(b);
  });
  it("reacts to a shared worry and weaves in the next listening question", async () => {
    const { converse, REACT } = await import("../shared/council.js");
    const t = converse("Nina wasiwasi pesa hazitafika kwa wote", { ...u, intake_step: 0 }, { pending: 0, n: 0 });
    expect(t.answered).toBe(0);
    expect(t.replies).toHaveLength(1);
    expect(REACT.concern.some((x) => t.replies[0].body.startsWith(x.sw))).toBe(true);
    expect(t.replies[0].asks).toBe(1);
  });
  it("answers a question asked instead of a listening answer", async () => {
    const { converse } = await import("../shared/council.js");
    const t = converse("Je, tunaweza kusema hapana?", { ...u, intake_step: 2 }, { pending: 2, n: 0 });
    expect(t.answered).toBeNull(); // a question does not use up the listening question
    expect(t.replies.some((r) => r.body.includes("kusema hapana"))).toBe(true);
  });
  it("always replies, handles greetings and app questions, and never decides for the community", async () => {
    const { converse } = await import("../shared/council.js");
    const en = { lang: "en" as const, audience: "herder" as const, intake_step: 1 };
    for (const [i, q] of ["hello", "asante", "Who are you?", "how do I make a game?", "what about water rights?", "What is the price of maize?", "xyz qqq?", "Should we sign the contract?", "habari, nani hununua mikopo ya kaboni?"].entries()) {
      const t = converse(q, en, { pending: 1, n: i });
      expect(t.replies[0].body.trim().length, q).toBeGreaterThan(20);
      expect(t.answered, q).toBeNull();
    }
    const water = converse("what about water rights?", en, { pending: null, n: 0 });
    expect(water.replies[0].source).toContain("Jamii lesson");
    const sign = converse("Should we sign the contract?", en, { pending: null, n: 0 }).replies[0].body;
    expect(sign).toMatch(/cannot tell you to sign|not for an AI/);
    expect(sign).not.toMatch(/you should sign|go ahead and sign/i);
    expect(converse("What is the price of maize?", en, { pending: null, n: 0 }).replies[0].body).toContain("If you are asking about carbon");
    expect(converse("tree planting is good", en, { pending: null, n: 0 }).replies[0].body).not.toContain("Help me get started");
  });
  it("words the same question differently from turn to turn", async () => {
    const { converse } = await import("../shared/council.js");
    const bodies = new Set([0, 1, 2, 3, 4, 5].map((n) => converse("CDA ni nini?", u, { pending: null, n }).replies[0].body));
    expect(bodies.size).toBeGreaterThanOrEqual(4);
    for (const b of bodies) expect(b).toContain("CDA");
  });
  it("gives an analogy without the extra points", async () => {
    const { converse, ALSO } = await import("../shared/council.js");
    const t = converse("Ridhaa ni nini?", u, { pending: null, n: 0, mode: "analogy" });
    expect(t.replies[0].body).not.toContain(ALSO.sw);
  });
  it("finds the new topics and every suggested question has an answer", async () => {
    const { findCard, FOLLOW, STARTERS } = await import("../shared/council.js");
    for (const [q, id] of [["Who buys carbon credits?", "buyers"], ["Nani hununua mikopo ya kaboni?", "buyers"], ["Malalamiko yanapelekwa wapi?", "grievance"], ["Can we say no?", "sayno"], ["How long does a project last?", "duration"], ["Wanawake na vijana wanapata nini?", "inclusion"]]) expect(findCard(q)?.id).toBe(id);
    for (const f of [...Object.values(FOLLOW).flat(), ...STARTERS]) for (const l of ["sw", "en"] as const) expect(findCard(f[l]), f[l]).not.toBeNull();
  });
  it("answers through the server in one message and remembers the pending question", async () => {
    const { cookie } = await register();
    const first = await (await post("/chat", { text: "Wazee wetu hupumzisha malisho kwa desturi" }, cookie)).json();
    expect(first.replies.at(-1).asks).toBe(1);
    const second = await (await post("/chat", { text: "Mgao wa mapato ni asilimia ngapi?" }, cookie)).json();
    expect(second.intakeStep).toBe(1); // a question is answered without using up the listening question
    expect(second.replies).toHaveLength(1);
  });
  it("keeps every conversation and starts a new one on request", async () => {
    const { cookie } = await register();
    await post("/chat", { text: "CDA ni nini?" }, cookie);
    await post("/chat/new", {}, cookie);
    await post("/chat", { text: "Who buys carbon credits?" }, cookie);
    expect((await (await get("/chat", cookie)).json()).messages.every((m: any) => !m.body.includes("CDA ni nini"))).toBe(true);
    const all = await (await get("/chat/transcripts", cookie)).json();
    expect(all).toHaveLength(2);
    expect(all[1].messages[0].body).toBe("CDA ni nini?");
  });
});

describe("audio and assignments", () => {
  it("keys and splits text for recordings", async () => {
    const { audioKey, segments } = await import("../shared/audio-key.js");
    expect(audioKey("Karibu")).toBe(audioKey(" Karibu "));
    expect(audioKey("Karibu")).not.toBe(audioKey("Karibuni"));
    expect(segments("Ndiyo kabisa! Sawa.\n\nHakiki.")).toEqual(["Ndiyo kabisa!", "Sawa.", "Hakiki."]);
  });
  it("gives every lesson an illustration link from its card", async () => {
    const { offlineAnswer } = await import("../shared/answers.js");
    expect(offlineAnswer("mgao wa pesa", { lang: "sw", audience: "herder", intake_step: 5 }, "ask").pic).toBe("m6");
  });
  it("lets learners submit work, keeps it private, and lets admins reply", async () => {
    const a = await register(), b = await register();
    const hash = await hashSecret("another-admin-secret");
    await q("insert into users (name, phone_hash, phone_enc, secret_hash, role) values ('Admin2',$1,$2,$3,'admin')", [phoneHash("+254700000098"), encrypt("+254700000098"), hash]);
    const adm = (await post("/auth/login", { phone: "0700000098", secret: "another-admin-secret" })).headers.get("set-cookie")!.split(";")[0];
    expect((await post("/assignments", { moduleId: "nope", text: "x" }, a.cookie)).status).toBe(400);
    await post("/assignments", { moduleId: "m1", text: "Nilifanya, simu 0799111222" }, a.cookie);
    const mine = await (await get("/assignments", a.cookie)).json();
    expect(mine[0].body).not.toContain("0799111222");
    expect(await (await get("/assignments", b.cookie)).json()).toHaveLength(0);
    expect((await get("/admin/assignments", b.cookie)).status).toBe(403);
    const r = await post(`/admin/assignments/${mine[0].id}/feedback`, { text: "Vizuri" }, adm);
    expect(r.status).toBe(200);
    expect((await (await get("/assignments", a.cookie)).json())[0].feedback).toBe("Vizuri");
    await post(`/admin/assignments/${mine[0].id}/feedback`, { text: "x" }, b.cookie);
    expect((await (await get("/assignments", a.cookie)).json())[0].feedback).toBe("Vizuri");
  });
  it("answers questions during a lesson without touching intake", async () => {
    const { cookie } = await register();
    const r = await (await post("/learn/ask", { text: "ridhaa ni nini?" }, cookie)).json();
    expect(r.body).toContain("FPIC");
    expect(r.intakeStep).toBe(0);
  });
});

describe("public demo", () => {
  it("runs in the browser without a server", async () => {
    const { demoApi, demoSignIn } = await import("../src/demo.js");
    await expect(demoApi("/learn", "GET", {})).rejects.toThrow("auth");
    demoSignIn("learner", "Mgeni", "sw", "herder");
    await expect(demoApi("/admin/overview", "GET", {})).rejects.toThrow("forbidden");
    for (let i = 0; i < 5; i++) await demoApi("/chat", "POST", { text: "RUKA" });
    const r = await demoApi("/chat", "POST", { text: "mgao wa mapato ni asilimia ngapi? simu 0799888777" });
    expect(r.body).toContain("40%");
    expect(JSON.stringify(await demoApi("/chat", "GET", {}))).not.toContain("0799888777");
    expect((await demoApi("/learn", "GET", {})).plan[0].moduleId).toBe("m1");
    const { STORY } = await import("../shared/story.js");
    for (const m of MODULES) expect(STORY[m.id].ask.sw && STORY[m.id].ask.en).toBeTruthy();
    demoSignIn("admin", "", "sw", "herder");
    const report = await demoApi("/admin/report", "GET", {});
    expect(report.voices.length).toBeGreaterThan(0);
    expect((await demoApi("/admin/overview", "GET", {})).counts.learners).toBe(12);
    expect((await demoApi("/me", "GET", {})).intakeStep).toBe(5);
    await demoApi("/me", "DELETE", {});
    demoSignIn("admin", "", "sw", "herder");
    demoSignIn("learner", "Mgeni", "sw", "herder");
    expect((await demoApi("/chat", "GET", {})).messages).toHaveLength(0);
    await demoApi("/chat", "POST", { text: "CDA ni nini?" });
    await demoApi("/chat/new", "POST", {});
    await demoApi("/chat", "POST", { text: "Can we say no?" });
    expect((await demoApi("/chat/transcripts", "GET", {})).length).toBe(2);
    await demoApi("/plan", "POST", { forWhom: "me", themes: ["contracts"], level: "some", minutes: 20, note: "" });
    expect((await demoApi("/learn", "GET", {})).plan.map((p: any) => p.moduleId)).toEqual(["m7"]);
    const game = await demoApi("/tools/game", "POST", { moduleId: "m6", kind: "quiz", lang: "en" });
    await demoApi("/games", "POST", game);
    expect((await demoApi("/games", "GET", {}))[0].questions.length).toBeGreaterThan(1);
    const maa = await demoApi("/tools/game", "POST", { moduleId: "m6", kind: "match", lang: "Maa" });
    expect(maa.lang).toBe("Maa");
    expect(maa.pairs[0][0]).toContain("(");
    await expect(demoApi("/tools/game", "POST", { moduleId: "m6", kind: "quiz", lang: "Kikuyu" })).rejects.toThrow("needs_ai");
  });
});

describe("rules", () => {
  it("normalises Kenyan phones and rejects others", () => {
    expect(normalizePhone("0712 345 678")).toBe("+254712345678");
    expect(normalizePhone("+254112345678")).toBe("+254112345678");
    expect(normalizePhone("12345")).toBeNull();
  });
  it("rejects weak PINs", () => {
    expect(pinProblem("111111")).toBe("pin_weak");
    expect(pinProblem("123456")).toBe("pin_weak");
    expect(pinProblem("12a456")).toBe("pin_format");
    expect(pinProblem("482913")).toBeNull();
  });
  it("redacts identifiers", () => {
    const out = redact("nipigie 0712345678 pin 4829 kitambulisho 12345678 a@b.co");
    for (const leak of ["0712345678", "4829", "12345678", "a@b.co"]) expect(out).not.toContain(leak);
  });
  it("round-trips encryption and verifies secrets", async () => {
    expect(decrypt(encrypt("+254712345678"))).toBe("+254712345678");
    const h = await hashSecret("482913");
    expect(await checkSecret("482913", h)).toBe(true);
    expect(await checkSecret("000000", h)).toBe(false);
    expect(await checkSecret("482913", null)).toBe(false);
  });
  it("classifies Swahili and English voices", () => {
    expect(classify("Nina wasiwasi kuhusu pesa za mradi")).toMatchObject({ kind: "concern", theme: "benefits" });
    expect(classify("How is the carbon measured?").kind).toBe("question");
    expect(classify("Wazee wetu hutunza malisho kwa desturi").theme).toBe("ecology");
  });
  it("orders curriculum by gap but keeps basics first", () => {
    const plan = buildCurriculum(gapScores([{ theme: "benefits", kind: "concern" }, { theme: "benefits", kind: "question" }], [{ module_id: "m1", score: 100 }]));
    expect(plan[0].moduleId).toBe("m1");
    expect(plan[1].moduleId).toBe("m6");
  });
  it("keeps the regulation figures right everywhere", () => {
    const share = CARDS.find((c) => c.id === "share")!;
    expect(share.detail.en).toContain("less cost of doing business");
    expect(share.detail.en).toMatch(/40%.*25%/);
  });
  it("has answerable, bilingual quizzes", () => {
    for (const m of MODULES) for (const x of m.quiz) {
      expect(x.options[x.answer]).toBeTruthy();
      expect(x.q.sw && x.q.en).toBeTruthy();
    }
  });
  it("routes to the council and flags risky terms", () => {
    expect(routeExpert("mgao wa pesa ni asilimia ngapi").id).toBe("mchambuzi");
    expect(routeExpert("mkataba na haki za ardhi").id).toBe("wakili");
    expect(RED_FLAGS.find((f) => f.id === "costs")!.re.test("40% of net profit")).toBe(true);
  });
});

describe("api", () => {
  beforeAll(async () => { process.env.WA_APP_SECRET = "s3cret"; process.env.WA_VERIFY_TOKEN = "vt"; await seed(); });

  it("blocks writes without the CSRF header", async () => {
    const r = await app.request("/api/auth/login", { method: "POST", body: "{}" });
    expect(r.status).toBe(403);
  });
  it("needs consent and blocks duplicates", async () => {
    expect((await post("/auth/register", { name: "x", phone: "0712000001", pin: "482913" })).status).toBe(400);
    const { phone } = await register();
    expect((await post("/auth/register", { name: "y", phone, pin: "482913", consentTerms: true })).status).toBe(409);
  });
  it("runs intake, then answers offline with a source", async () => {
    const { cookie } = await register();
    for (let i = 0; i < 5; i++) await post("/chat", { text: i === 3 ? "Nina wasiwasi kuhusu pesa" : "RUKA" }, cookie);
    const r = await (await post("/chat", { text: "mgao wa mapato ni asilimia ngapi?" }, cookie)).json();
    expect(r.expert).toBe("jamii");
    expect(r.body).toContain("40%");
    expect(r.source).toContain("reg 29");
    expect((await q("select count(*)::int n from insights where kind = 'concern'"))[0].n).toBeGreaterThan(0);
  });
  it("never stores identifiers typed in chat", async () => {
    const { cookie } = await register();
    await post("/chat", { text: "simu yangu ni 0799888777" }, cookie);
    expect(await q("select 1 from messages where body like '%0799888777%'")).toHaveLength(0);
    expect(await q("select 1 from insights where body like '%0799888777%'")).toHaveLength(0);
  });
  it("keeps admin data from learners", async () => {
    const { cookie } = await register();
    for (const p of ["/admin/overview", "/admin/learners", "/admin/report", "/admin/report.csv"]) expect((await get(p, cookie)).status).toBe(403);
    expect((await get("/admin/overview")).status).toBe(401);
  });
  it("cannot register as admin", async () => {
    const { cookie } = await register({ role: "admin" });
    expect((await get("/admin/overview", cookie)).status).toBe(403);
  });
  it("shows admins masked phones only", async () => {
    const hash = await hashSecret("a-long-admin-secret");
    await q("insert into users (name, phone_hash, phone_enc, secret_hash, role) values ('Admin',$1,$2,$3,'admin')", [phoneHash("+254700000099"), encrypt("+254700000099"), hash]);
    const r = await post("/auth/login", { phone: "0700000099", secret: "a-long-admin-secret" });
    const cookie = r.headers.get("set-cookie")!.split(";")[0];
    const { phone } = await register();
    const text = await (await get("/admin/learners", cookie)).text();
    expect(text).not.toContain(phone.slice(1));
    expect(text).not.toContain("phone_enc");
    for (const p of ["/admin/report", "/admin/overview", "/admin/flags", "/admin/circles", "/admin/report.csv"]) expect((await get(p, cookie)).status).toBe(200);
  });
  it("hides quotes until five different people can share", async () => {
    const adminLogin = await post("/auth/login", { phone: "0700000099", secret: "a-long-admin-secret" });
    const cookie = adminLogin.headers.get("set-cookie")!.split(";")[0];
    const add = async (phone: string) => post("/auth/register", { name: "V", phone, pin: "482913", community: "Ndogo", county: "Isiolo", consentTerms: true, consentShare: true });
    const r = await add("0713000001");
    const c1 = r.headers.get("set-cookie")!.split(";")[0];
    for (let i = 0; i < 6; i++) await post("/chat", { text: `Nina wasiwasi namba ${i}` }, c1);
    const seen = async () => JSON.stringify((await (await get("/admin/report", cookie)).json()).voices);
    expect(await seen()).not.toContain("Nina wasiwasi namba");
    for (let i = 2; i <= 5; i++) {
      const u = await add(`071300000${i}`);
      await post("/chat", { text: `Sauti ya mtu ${i}` }, u.headers.get("set-cookie")!.split(";")[0]);
    }
    expect((await (await get("/admin/report", cookie)).json()).voices.length).toBeGreaterThan(0);
  });
  it("serves the learner dashboard", async () => {
    const { cookie } = await register();
    const r = await get("/learn", cookie);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.activity).toHaveLength(7);
    expect(d.plan).toHaveLength(MODULES.length);
    expect(d.circles.length).toBeGreaterThan(0);
  });
  it("grades quizzes on the server", async () => {
    const { cookie } = await register();
    const r = await (await post("/learn/quiz", { moduleId: "m1", answers: [0, 1], score: 0 }, cookie)).json();
    expect(r.score).toBe(100);
    const bad = await (await post("/learn/quiz", { moduleId: "m2", answers: [0, 1], score: 100 }, cookie)).json();
    expect(bad.score).toBe(0);
  });
  it("locks after five wrong PINs", async () => {
    const { phone } = await register();
    for (let i = 0; i < 5; i++) expect((await post("/auth/login", { phone, secret: "000000" })).status).toBe(401);
    expect((await post("/auth/login", { phone, secret: "482913" })).status).toBe(423);
  });
  it("keeps circles private to members", async () => {
    const { cookie } = await register();
    const [c] = await q("insert into circles (name, topic, community_id) values ('Binafsi','x',99999) returning id", []).catch(() => [{ id: 0 }]);
    if (c.id) expect((await get(`/circles/${c.id}/posts`, cookie)).status).toBe(403);
  });
  it("erases a user and all their data", async () => {
    const { cookie, phone } = await register();
    await post("/chat", { text: "habari" }, cookie);
    expect((await app.request("/api/me", { method: "DELETE", headers: { ...H, cookie } })).status).toBe(200);
    expect(await q("select 1 from users where phone_hash = $1", [phoneHash(normalizePhone(phone)!)])).toHaveLength(0);
    expect((await get("/me", cookie)).status).toBe(401);
  });
  it("verifies WhatsApp webhooks", async () => {
    expect((await app.request("/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=42")).status).toBe(200);
    expect((await app.request("/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=no")).status).toBe(403);
    const raw = JSON.stringify({ entry: [] });
    const bad = await app.request("/api/whatsapp/webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": "sha256=00" } });
    expect(bad.status).toBe(401);
    const sig = "sha256=" + createHmac("sha256", "s3cret").update(raw).digest("hex");
    expect((await app.request("/api/whatsapp/webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": sig } })).status).toBe(200);
  });
  it("continues a linked chat on WhatsApp and ignores replays", async () => {
    const { phone } = await register();
    const e164 = normalizePhone(phone)!;
    await q("update users set wa_opted_in = true, intake_step = 5 where phone_hash = $1", [phoneHash(e164)]);
    const raw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "wamid.1", type: "text", from: e164.slice(1), text: { body: "ridhaa ni nini?" } }] } }] }] });
    const sig = "sha256=" + createHmac("sha256", "s3cret").update(raw).digest("hex");
    for (let i = 0; i < 2; i++) await app.request("/api/whatsapp/webhook", { method: "POST", body: raw, headers: { "x-hub-signature-256": sig } });
    const rows = await q("select 1 from messages m join users u on u.id = m.user_id where u.phone_hash = $1 and m.channel = 'whatsapp' and m.role = 'user'", [phoneHash(e164)]);
    expect(rows).toHaveLength(1);
  });
});

describe("plans, groups and games", () => {
  it("builds a personal plan from choices and own words, basics first for beginners", async () => {
    const { makePlan } = await import("../shared/plan.js");
    const p = makePlan({ forWhom: "me", themes: ["benefits"], level: "new", minutes: 10, note: "Can we say no to a project?" });
    expect(p.map((x) => x.moduleId)).toEqual(["m1", "m6", "m5", "m8"]);
    expect(p[2].reason.en).toContain("own words");
    expect(p.at(-1)!.week).toBeGreaterThan(1);
    expect(p.every((x) => x.guide === null)).toBe(true);
    expect(makePlan({ forWhom: "me", themes: [], level: "some", minutes: 20, note: "" })).toHaveLength(8);
  });
  it("grows a group's needs from facilitator notes and gives a guide per session", async () => {
    const { cleanGroup, groupNeeds, groupPlan } = await import("../shared/plan.js");
    const g = cleanGroup({ name: "Wanawake", needs: ["fpic"], note: "", members: [{ name: "Amina", note: "Anauliza kuhusu mgao wa pesa" }], sessions: [{ moduleId: "nope" }] })!;
    expect(g.sessions).toHaveLength(0);
    expect(groupNeeds(g).map((n) => n.theme)).toEqual(["fpic", "benefits"]);
    const plan = groupPlan(g);
    expect(plan.map((x) => x.moduleId)).toContain("m6");
    expect(plan[0].guide?.discuss.sw).toBeTruthy();
    expect(cleanGroup({ name: "" })).toBeNull();
  });
  it("makes games from pasted content and from lessons", async () => {
    const { gameFromText, gameFromModule, cleanGame } = await import("../shared/games.js");
    const m = gameFromText("CDA: community agreement\nFPIC: free prior consent\nBaseline - what happens without the project", "match", "en", "Words")!;
    expect(m.pairs).toHaveLength(3);
    const q = gameFromText("Wanunuzi wakubwa hununua mikopo kupitia madalali wengi. Jamii lazima iulize bei halisi ya mauzo. Kamati inapaswa kupokea ripoti ya mapato kila mwaka.", "quiz", "sw", "Q")!;
    expect(q.questions).toHaveLength(3);
    for (const x of q.questions) expect(x.q).toContain("_____");
    expect(gameFromText("too short", "quiz", "en", "x")).toBeNull();
    expect(gameFromModule("m1", "match", "sw")!.pairs.length).toBeGreaterThanOrEqual(2);
    expect(cleanGame({ kind: "quiz", questions: [{ q: "a", options: ["x"], answer: 3 }] })).toBeNull();
  });
  it("uses only dictionary Maa words, with a plain spelling and a gloss", async () => {
    const { MAA, maaGame, isMaa } = await import("../shared/maa.js");
    expect(new Set(MAA.map((w) => w.maa)).size).toBe(MAA.length);
    for (const w of MAA) expect(w.plain && w.gloss.sw && w.gloss.en && w.themes.length).toBeTruthy();
    expect(isMaa("Maasai") && isMaa("ol Maa") && !isMaa("Kiswahili")).toBe(true);
    const q = maaGame("quiz", "benefits", "en", "x");
    for (const x of q.questions) { expect(new Set(x.options).size).toBe(x.options.length); expect(x.options[x.answer]).toBeTruthy(); }
    expect(q.questions[0].q).toContain("Maa word");
  });
  it("turns community knowledge into needs and tracks progress", async () => {
    const { cleanGroup, groupNeeds, groupProgress } = await import("../shared/plan.js");
    const g = cleanGroup({ name: "A", members: [{ name: "Amina" }, { name: "Sein" }], profile: { project: "yes", livelihoods: ["herding", "bogus"], worries: "Tunaogopa ardhi yetu itachukuliwa" }, sessions: [{ moduleId: "m1", attended: ["Amina"], at: 1 }] })!;
    expect(g.profile.livelihoods).toEqual(["herding"]);
    expect(groupNeeds(g).map((n) => n.theme)).toEqual(expect.arrayContaining(["fpic", "contracts", "benefits", "ecology", "land_rights"]));
    const p = groupProgress(g);
    expect(p.covered).toBe(1);
    expect(p.attendance).toBe(50);
    expect(p.reached).toBe(1);
  });
  it("saves plans, groups and games per user on the server", async () => {
    const { cookie } = await register(), other = await register();
    expect((await post("/plan", { forWhom: "nobody" }, cookie)).status).toBe(400);
    await post("/plan", { forWhom: "group", themes: ["benefits"], level: "new", minutes: 60, note: "" }, cookie);
    const learn = await (await get("/learn", cookie)).json();
    expect(learn.plan[0].moduleId).toBe("m1");
    expect(learn.plan[0].guide).toBeTruthy();
    const g = await (await post("/groups", { name: "Vijana", members: [{ name: "Leku", note: "" }], needs: ["contracts"], sessions: [] }, cookie)).json();
    expect((await (await get("/plan", cookie)).json()).groups[0].id).toBe(g.id);
    expect((await (await get("/plan", other.cookie)).json()).groups).toHaveLength(0);
    const game = await (await post("/tools/game", { text: "CDA: community agreement\nFPIC: free prior consent\nMRV: checking the carbon", kind: "match", lang: "en" }, cookie)).json();
    expect(game.by).toBe("rules");
    await post("/games", game, cookie);
    expect(await (await get("/games", cookie)).json()).toHaveLength(1);
    expect((await (await get("/me/export", cookie)).json()).saved.groups).toHaveLength(1);
  });
});

describe("choice of AI model", () => {
  it("lets a learner pick a model, uses it when set up, and falls back to prepared answers otherwise", async () => {
    const { cookie } = await register();
    await app.request("/api/me", { method: "PATCH", headers: { ...H, cookie }, body: JSON.stringify({ aiModel: "not-a-model", consentAi: true }) });
    expect((await (await get("/me", cookie)).json()).aiModel).toBe("claude");
    await app.request("/api/me", { method: "PATCH", headers: { ...H, cookie }, body: JSON.stringify({ aiModel: "chatgpt" }) });
    const me = await (await get("/me", cookie)).json();
    expect(me.aiModel).toBe("chatgpt");
    expect(me.models.find((m: any) => m.id === "chatgpt").ready).toBe(false);
    // Not set up: the sourced answer, with no model named.
    let r = await (await post("/chat", { text: "CDA ni nini?" }, cookie)).json();
    expect(r.replies[0].model ?? null).toBeNull();
    expect(r.source).toContain("reg 28");
    // Set up: the model's reply replaces the prepared text and is labelled.
    process.env.OPENAI_API_KEY = "test"; process.env.OPENAI_MODEL = "test-model";
    const real = globalThis.fetch; let sent: any = null;
    globalThis.fetch = (async (url: any, init: any) => {
      if (String(url).startsWith("https://api.openai.com/v1/chat/completions")) { sent = JSON.parse(init.body); return new Response(JSON.stringify({ choices: [{ message: { content: "Jibu kutoka modeli" } }] }), { status: 200 }); }
      return real(url, init);
    }) as typeof fetch;
    try { r = await (await post("/chat", { text: "Mgao wa mapato ni asilimia ngapi?" }, cookie)).json(); }
    finally { globalThis.fetch = real; delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL; }
    expect(r.replies[0].model).toBe("chatgpt");
    expect(r.replies[0].body).toBe("Jibu kutoka modeli");
    expect(sent.model).toBe("test-model");
    expect(sent.messages[0].content).toContain("Never tell anyone to sign"); // same rules for every model
    expect(sent.messages[0].content).toContain("reg 29"); // same sourced notes
    expect((await (await get("/chat", cookie)).json()).messages.at(-1).model).toBe("chatgpt");
  });
});
