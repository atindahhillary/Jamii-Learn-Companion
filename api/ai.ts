// Live AI for the public demo, with no database: the browser sends the question, a little recent chat and
// the prepared sourced answer; the chosen model rewrites it under the same rules. Nothing is stored here.
import { AUDIENCES, type Audience, type Lang } from "../shared/content.js";
import type { Mode } from "../shared/council.js";
import { MODELS_AI, isModel } from "../shared/models.js";
import { answerSystem, callModel, configured, type ChatMsg } from "../server/providers.js";
import { redact } from "../server/security.js";

// shortcut: limits live in this instance's memory, so they reset on a cold start and are per instance.
// The real cap is the spend limit on the API key's workspace; move to a shared store if abuse appears.
const hits = new Map<string, number[]>();
let day = "", today = 0;
const PER_HOUR = 30, PER_DAY = Number(process.env.MAX_AI_PER_DAY || 300);

function allowed(ip: string) {
  const now = Date.now(), d = new Date().toISOString().slice(0, 10);
  if (d !== day) { day = d; today = 0; }
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= PER_HOUR || today >= PER_DAY) return false;
  hits.set(ip, [...recent, now]); today++;
  if (hits.size > 5000) hits.clear();
  return true;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sameSite = (req: Request) => {
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  return req.headers.get("x-ky") === "1" && (!origin || (host != null && new URL(origin).host === host));
};

export function GET() {
  return json({ models: MODELS_AI.map((m) => ({ id: m.id, ready: configured(m.id) })) });
}

export async function POST(req: Request) {
  if (!sameSite(req)) return json({ error: "forbidden" }, 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allowed(ip)) return json({ error: "rate" }, 429);
  const b = (await req.json().catch(() => null)) as Record<string, any> | null;
  const text = typeof b?.text === "string" ? redact(b.text.trim().slice(0, 1500)) : "";
  if (!text || !isModel(b?.model) || !configured(b.model)) return json({ text: null, model: null });
  const lang: Lang = b.lang === "en" ? "en" : "sw";
  const audience: Audience = b.audience in AUDIENCES ? b.audience : "herder";
  const mode: Mode = b.mode === "analogy" || b.mode === "game" ? b.mode : "ask";
  const draft = typeof b.draft === "string" ? redact(b.draft.slice(0, 2500)) : "";
  const history: ChatMsg[] = (Array.isArray(b.history) ? b.history : []).slice(-6)
    .filter((h: any) => typeof h?.body === "string" && (h.role === "user" || h.role === "bot"))
    .map((h: any) => (h.role === "bot" ? { role: "assistant" as const, content: redact(h.body.slice(0, 800)) } : { role: "user" as const, content: `<user_text>${redact(h.body.slice(0, 800))}</user_text>` }));
  while (history.length && history[0].role !== "user") history.shift(); // the conversation must open with the user
  const ask = `<user_text>${text}</user_text>${draft ? `\n<prepared_answer>${draft}</prepared_answer>\nThe prepared answer is sourced; keep its facts, improve the wording, and answer what was actually asked.` : ""}`;
  const out = await callModel(b.model, answerSystem(audience, lang, mode), [...history, { role: "user", content: ask }], 600);
  return json({ text: out, model: out ? b.model : null });
}
