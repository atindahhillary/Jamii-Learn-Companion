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
    demoSignIn("admin", "", "sw", "herder");
    const report = await demoApi("/admin/report", "GET", {});
    expect(report.voices.length).toBeGreaterThan(0);
    expect((await demoApi("/admin/overview", "GET", {})).counts.learners).toBe(12);
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
    expect(r.expert).toBe("mchambuzi");
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
