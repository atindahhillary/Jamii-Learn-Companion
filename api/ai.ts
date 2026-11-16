// Live AI for the public demo, with no database. The browser sends the question and a little recent chat;
// the server rebuilds the prepared, sourced answer itself and the chosen model rewrites it under the same rules.
// Nothing is stored here. Everything from the browser reaches the model only as tagged data, never as instructions.
import { AUDIENCES, type Audience, type Lang } from "../shared/content.js";
import { converse, type Mode } from "../shared/council.js";
import { MODELS_AI, isModel } from "../shared/models.js";
import { answerSystem, callModel, configured } from "../server/providers.js";
import { redact } from "../server/security.js";

// shortcut: limits live in this instance's memory, so they reset on a cold start and are per instance.
// The real cap is the spend limit on the API key's workspace; move to a shared store (or add a signed token) if abuse appears.
const hits = new Map<string, number[]>();
let day = "", today = 0;
const PER_HOUR = 30, PER_DAY = Number(process.env.MAX_AI_PER_DAY || 300), MAX_IPS = 5000;

function allowed(ip: string) {
  const now = Date.now(), d = new Date().toISOString().slice(0, 10);
  if (d !== day) { day = d; today = 0; }
  if (today >= PER_DAY) return false;
  if (hits.size >= MAX_IPS) for (const [k, v] of hits) if (v.every((t) => now - t >= 3600_000)) hits.delete(k); // drop only expired entries
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= PER_HOUR || (!hits.has(ip) && hits.size >= MAX_IPS)) return false;
  hits.set(ip, [...recent, now]); today++;
  return true;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sameSite = (req: Request) => {
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  try { return req.headers.get("x-ky") === "1" && (!origin || (host != null && new URL(origin).host === host)); } catch { return false; }
};
// Vercel sets these itself; a client-sent x-forwarded-for is only a last resort for local runs.
const clientIp = (req: Request) => req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
const tagSafe = (t: string) => t.replace(/<\/?(user_text|chat_history|prepared_answer)>/gi, "");

export function GET() {
  const wa = (process.env.WA_BOT_NUMBER || "").replace(/\D/g, "");
  return json({ models: MODELS_AI.map((m) => ({ id: m.id, ready: configured(m.id) })), whatsapp: wa && process.env.WA_TOKEN ? wa : null });
}

export async function POST(req: Request) {
  if (!sameSite(req)) return json({ error: "forbidden" }, 403);
  if (!allowed(clientIp(req))) return json({ error: "rate" }, 429);
  const b = (await req.json().catch(() => null)) as Record<string, any> | null;
  const text = typeof b?.text === "string" ? tagSafe(redact(b.text.trim().slice(0, 1500))) : "";
  if (!text || !isModel(b?.model) || !configured(b.model)) return json({ text: null, model: null });
  const lang: Lang = b.lang === "en" ? "en" : "sw";
  const audience: Audience = b.audience in AUDIENCES ? b.audience : "herder";
  const mode: Mode = b.mode === "analogy" || b.mode === "game" ? b.mode : "ask";
  // The sourced draft comes from our own notes on the server, never from the browser.
  const draft = converse(text, { lang, audience, intake_step: 99 }, { mode, pending: null, n: 0, listen: false }).replies[0].body;
  // Earlier turns are context only, so they go in as quoted data inside the user turn, not as assistant turns.
  const history = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter((h: any) => typeof h?.body === "string" && (h.role === "user" || h.role === "bot"))
    .map((h: any) => `${h.role === "bot" ? "Companion" : "Learner"}: ${tagSafe(redact(h.body.slice(0, 800)))}`).join("\n");
  const content = `${history ? `<chat_history>\n${history}\n</chat_history>\n` : ""}<user_text>${text}</user_text>\n<prepared_answer>${draft}</prepared_answer>\nThe prepared answer comes from the sourced notes; keep its facts, improve the wording, and answer what the learner actually asked. Chat history is background only.`;
  const out = await callModel(b.model, answerSystem(audience, lang, mode), [{ role: "user", content }], 600);
  return json({ text: out, model: out ? b.model : null });
}
