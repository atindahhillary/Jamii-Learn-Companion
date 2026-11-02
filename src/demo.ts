// Public demo: answers every /api path in the browser, so nothing leaves the visitor's device.
import { AUDIENCES, INTAKE, THEMES, routeExpert, expertById, type Audience, type Lang, type Theme } from "../shared/content";
import { MODULES } from "../shared/curriculum";
import { glossaryFor, intakeDone, intakeQuestion, offlineAnswer, reviewRules, type Mode } from "../shared/answers";
import { BOT_POST, CIRCLES, FIRST_POST, NAMES, SAYINGS } from "../shared/demo-data";
import { MIN_GROUP, buildCurriculum, classify, gapScores, type Kind } from "../server/analyze";

type Msg = { id: number; role: string; expert?: string; body: string; source?: string | null; flagged?: boolean; resolved?: boolean; at: number };
type Insight = { body: string; theme: Theme; kind: Kind; sentiment: number; at: number };
type Post = { id: number; circle: number; author: string; is_bot: boolean; body: string; hidden?: boolean };
type State = {
  role: "learner" | "admin" | null; name: string; lang: Lang; audience: Audience; consentShare: boolean; intakeStep: number;
  messages: Msg[]; insights: Insight[]; progress: Record<string, { score: number; at: number }>; posts: Post[]; nextId: number;
};

const KEY = "jlc-demo", DAY = 86400_000;
const fresh = (): State => ({
  role: null, name: "", lang: "sw", audience: "herder", consentShare: true, intakeStep: 0, messages: [], insights: [], progress: {}, nextId: 1000,
  posts: [{ id: 1, circle: 1, author: "Nasieku L.", is_bot: false, body: FIRST_POST }, { id: 2, circle: 1, author: "Msaidizi", is_bot: true, body: BOT_POST }],
});
let memory: State | null = null;
function load(): State {
  if (memory) return memory;
  try { memory = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { memory = fresh(); }
  return memory!;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* blocked storage: this visit still works from memory */ } }

// Admins skip the listening questions, without using up the learner's on the same device.
const stepOf = (s: State) => (s.role === "admin" ? INTAKE.length : s.intakeStep);

export function demoSignIn(role: "learner" | "admin", name: string, lang: Lang, audience: Audience) {
  const s = load();
  Object.assign(s, { role, lang, audience, name: name || (role === "admin" ? "Msimamizi" : "Mgeni") });
  save();
}

// Twelve fictional learners, derived from the index so the demo stays stable between visits.
function cohort(now: number) {
  return NAMES.map((name, i) => {
    const community = i % 3 === 2 ? "Jamii ya Mfano B" : "Jamii ya Mfano A";
    const said = [0, 1, 2].map((j) => ({ ...classify(SAYINGS[(i * 3 + j) % SAYINGS.length]), body: SAYINGS[(i * 3 + j) % SAYINGS.length], at: now - ((i + j * 3) % 14) * DAY, wa: i % 3 === 0 }));
    const lessons = MODULES.slice(0, (i * 5) % 9).map((m, k) => ({ module_id: m.id, score: [50, 100, 100, 50][(i + k) % 4], at: now - ((i * 2 + k) % 12) * DAY }));
    return { id: `f${i}`, name, community, county: i % 3 === 2 ? "Samburu" : "Kajiado", village: `Kijiji ${1 + (i % 4)}`, audience: (["herder", "leader", "student", "elder", "trainer"] as Audience[])[i % 5], step: i === 11 ? 2 : 5, share: i % 4 !== 3, said, lessons };
  });
}

function learnerView(s: State) {
  const now = Date.now(), team = cohort(now).filter((c) => c.community === "Jamii ya Mfano A");
  const ins = [...team.flatMap((c) => c.said), ...s.insights];
  const prog = [...team.flatMap((c) => c.lessons), ...Object.entries(s.progress).map(([module_id, p]) => ({ module_id, score: p.score }))];
  const day = (t: number) => new Date(t).toISOString().slice(0, 10);
  const activity = Array.from({ length: 7 }, (_, i) => {
    const d = day(now - (6 - i) * DAY);
    return { day: d, n: s.messages.filter((m) => m.role === "user" && day(m.at) === d).length + Object.values(s.progress).filter((p) => day(p.at) === d).length };
  });
  return {
    progress: Object.entries(s.progress).map(([module_id, p]) => ({ module_id, score: p.score })),
    circles: CIRCLES.map(([name, topic], i) => ({ id: i + 1, name, topic, members: NAMES.length + 1 })),
    activity, plan: buildCurriculum(gapScores(ins, prog)),
  };
}

function report(s: State) {
  const everyone = cohort(Date.now());
  const ins = [...everyone.flatMap((c) => c.said), ...s.insights];
  const prog = [...everyone.flatMap((c) => c.lessons), ...Object.entries(s.progress).map(([module_id, p]) => ({ module_id, score: p.score }))];
  const gaps = gapScores(ins, prog);
  const kinds = Object.fromEntries(["idea", "knowledge", "concern", "question"].map((k) => [k, ins.filter((i) => i.kind === k).length]));
  const groups = new Map<string, typeof everyone>();
  for (const c of everyone.filter((x) => x.share)) groups.set(c.community, [...(groups.get(c.community) ?? []), c]);
  const voices = [...groups.entries()].filter(([, g]) => g.length >= MIN_GROUP).flatMap(([community, g]) => g.flatMap((c) => c.said.filter((x) => x.kind !== "knowledge").map((x) => ({ body: x.body, theme: x.theme, kind: x.kind, community }))));
  const unique = [...new Map(voices.map((v) => [v.body, v])).values()].slice(0, 12);
  const communities = ["Jamii ya Mfano A", "Jamii ya Mfano B"].map((name) => ({ name, county: name.endsWith("A") ? "Kajiado" : "Samburu", n: everyone.filter((c) => c.community === name).length }));
  return { gaps, curriculum: buildCurriculum(gaps), kinds, voices: unique, communities, sentiment: { pos: ins.filter((i) => i.sentiment > 0).length, neg: ins.filter((i) => i.sentiment < 0).length, total: ins.length }, generatedAt: new Date().toISOString() };
}

function overview(s: State) {
  const now = Date.now(), everyone = cohort(now);
  const day = (t: number) => new Date(t).toISOString().slice(5, 10);
  const said = everyone.flatMap((c) => c.said);
  const lessons = everyone.flatMap((c) => c.lessons);
  const mine = s.messages.filter((m) => m.role === "user");
  const stage = (c: (typeof everyone)[number]) => c.step < INTAKE.length ? "listening" : !c.lessons.length ? "started" : c.lessons.length < MODULES.length ? "learning" : "completed";
  return {
    counts: {
      learners: everyone.length, active: everyone.filter((c) => c.said.some((x) => x.at > now - 7 * DAY)).length, insights: said.length + s.insights.length,
      passed: lessons.filter((l) => l.score >= 50).length, wa: said.filter((x) => x.wa).length, web: said.filter((x) => !x.wa).length + mine.length,
      flags: s.messages.filter((m) => m.flagged && !m.resolved).length,
    },
    activity: Array.from({ length: 14 }, (_, i) => {
      const d = day(now - (13 - i) * DAY);
      return { day: d, messages: said.filter((x) => day(x.at) === d).length + mine.filter((m) => day(m.at) === d).length, lessons: lessons.filter((l) => day(l.at) === d).length };
    }),
    stages: ["listening", "started", "learning", "completed"].map((st) => ({ stage: st, n: everyone.filter((c) => stage(c) === st).length })),
    recent: [],
  };
}

const scrub = (t: string) => t.replace(/(?:\+?254|\b0)[17]\d{8}\b/g, "[nambari ya simu]").replace(/\b(?:id|kitambulisho|pin)\D{0,15}\d{4,9}\b/gi, "[siri]");

function chat(s: State, text: string, mode: Mode, expertId: string) {
  const u = { lang: s.lang, audience: s.audience, intake_step: stepOf(s) };
  const add = (m: Omit<Msg, "id" | "at">) => { const x = { ...m, id: s.nextId++, at: Date.now() }; s.messages.push(x); return x; };
  const keep = (t: string, hint?: Theme) => s.insights.push({ ...classify(t, hint), body: t, at: Date.now() });
  const clean = scrub(text);
  add({ role: "user", body: clean });
  if (stepOf(s) < INTAKE.length) {
    const cur = INTAKE[s.intakeStep];
    if (!/^(ruka|skip)$/i.test(clean.trim())) keep(clean, cur.theme);
    s.intakeStep += 1;
    const body = intakeQuestion({ ...u, intake_step: s.intakeStep }) ?? intakeDone[s.lang];
    const m = add({ role: "bot", expert: "mwalimu", body });
    return { id: m.id, body, expert: "mwalimu", source: null, intakeStep: s.intakeStep };
  }
  keep(clean);
  const expert = expertId ? expertById(expertId) : mode === "ask" ? routeExpert(clean) : expertById("mwalimu");
  const a = offlineAnswer(clean, u, mode);
  const m = add({ role: "bot", expert: expert.id, body: a.body, source: a.source });
  return { id: m.id, body: a.body, expert: expert.id, source: a.source, intakeStep: stepOf(s) };
}

export async function demoApi(path: string, method: string, b: any): Promise<any> {
  const s = load(), fail = (error: string, status: number) => Object.assign(new Error(error), { status });
  const done = <R,>(r: R) => { save(); return r; };
  if (path === "/auth/logout") return done((s.role = null, { ok: true }));
  if (!s.role) throw fail("auth", 401);
  const admin = s.role === "admin";

  if (path === "/me" && method === "GET") return { id: "demo", name: s.name, role: s.role, lang: s.lang, audience: s.audience, village: null, consentAi: false, consentShare: s.consentShare, intakeStep: stepOf(s), intakeTotal: INTAKE.length, phone: "", community: admin ? null : { name: "Jamii ya Mfano A", county: "Kajiado" }, whatsapp: false };
  if (path === "/me" && method === "PATCH") {
    if (b.lang) s.lang = b.lang;
    if (b.audience in AUDIENCES) s.audience = b.audience;
    if (typeof b.consentShare === "boolean") s.consentShare = b.consentShare;
    return done({ ok: true });
  }
  if (path === "/me/export") return { profile: { name: s.name, lang: s.lang, audience: s.audience }, messages: s.messages, insights: s.insights, progress: s.progress };
  if (path === "/me" && method === "DELETE") { memory = fresh(); try { localStorage.removeItem(KEY); } catch { /* nothing stored */ } return { ok: true }; }
  if (path === "/chat" && method === "GET") return { messages: s.messages.slice(-60).map((m) => ({ ...m })), intakeQuestion: s.messages.length ? null : intakeQuestion({ lang: s.lang, audience: s.audience, intake_step: stepOf(s) }) };
  if (path === "/chat") return done(chat(s, String(b.text).slice(0, 1500), b.mode ?? "ask", b.expert ?? ""));
  if (path === "/chat/flag") { const m = s.messages.find((x) => x.id === Number(b.id)); if (m) m.flagged = true; return done({ ok: true }); }
  if (path === "/learn") return learnerView(s);
  if (path === "/learn/quiz") {
    const m = MODULES.find((x) => x.id === b.moduleId)!;
    const right = m.quiz.filter((q, i) => b.answers[i] === q.answer).length, score = Math.round((right / m.quiz.length) * 100);
    s.progress[m.id] = { score: Math.max(score, s.progress[m.id]?.score ?? 0), at: Date.now() };
    return done({ score, right, total: m.quiz.length });
  }
  if (path === "/learn/reflect") {
    const m = MODULES.find((x) => x.id === b.moduleId), text = scrub(String(b.text).slice(0, 600));
    if (m && text) s.insights.push({ ...classify(text, m.theme), body: text, at: Date.now() });
    return done({ ok: true });
  }
  if (path === "/learn/practice") { s.progress.roleplay = { score: b.score, at: Date.now() }; return done({ ok: true }); }
  if (path === "/tools/review") return { ...reviewRules(b.text, s.lang), summary: null };
  if (path === "/tools/translate") return { text: null, glossary: glossaryFor(b.text) };
  if (path === "/whatsapp/link") throw fail("not_configured", 503);

  const posts = path.match(/^\/circles\/(\d+)\/posts$/);
  if (posts && method === "GET") return s.posts.filter((p) => p.circle === +posts[1] && !p.hidden).reverse().map((p) => ({ ...p }));
  if (posts) {
    s.posts.push({ id: s.nextId++, circle: +posts[1], author: s.name, is_bot: false, body: b.text });
    if (/@msaidizi|@bot/i.test(b.text)) s.posts.push({ id: s.nextId++, circle: +posts[1], author: "Msaidizi", is_bot: true, body: offlineAnswer(b.text, { lang: s.lang, audience: s.audience, intake_step: 5 }, "ask").body });
    return done({ ok: true });
  }

  if (path.startsWith("/admin")) {
    if (!admin) throw fail("forbidden", 403);
    if (path === "/admin/overview") return overview(s);
    if (path === "/admin/report") return report(s);
    if (path === "/admin/flags") return s.messages.filter((m) => m.flagged && !m.resolved).map((m) => ({ id: m.id, body: m.body }));
    if (path === "/admin/circles") return CIRCLES.map(([name, topic], i) => ({ id: i + 1, name, topic, members: NAMES.length + 1 }));
    if (path === "/admin/learners") return cohort(Date.now()).map((c, i) => ({
      id: c.id, name: c.name, village: c.village, audience: c.audience, community: c.community, modules: c.lessons.length, phone: `+254701***${String(i).padStart(2, "0")}`,
      avg_score: c.lessons.length ? Math.round(c.lessons.reduce((a, l) => a + l.score, 0) / c.lessons.length) : null, last_seen: Math.max(...c.said.map((x) => x.at)),
    }));
    const flag = path.match(/^\/admin\/flags\/(\d+)\/resolve$/);
    if (flag) { const m = s.messages.find((x) => x.id === +flag[1]); if (m) m.resolved = true; return done({ ok: true }); }
    const hide = path.match(/^\/admin\/posts\/(\d+)\/hide$/);
    if (hide) { const p = s.posts.find((x) => x.id === +hide[1]); if (p) p.hidden = true; return done({ ok: true }); }
  }
  throw fail("server", 404);
}

export const demoCsv = () => {
  const r = report(load());
  return [["order", "theme", "gap", "mastery_percent", "learners_tested", "voices", "start_day"], ...r.curriculum.map((g) => [g.order, THEMES[g.theme as Theme].en, g.gap, g.mastery, g.learners, g.voice, g.day])].map((x) => x.join(",")).join("\n");
};
