import { glossaryFor, intakeQuestion, offlineAnswer, reviewRules } from "../shared/answers.js";
import { converse, type Mode } from "../shared/council.js";
import { AUDIENCES, COUNCIL, INTAKE, type Audience, type Lang, type Theme } from "../shared/content.js";
import { cleanGame, gameFromText, type Game, type Kind } from "../shared/games.js";
import { isMaa, maaPromptNotes } from "../shared/maa.js";
import { CARDS, MODULES } from "../shared/curriculum.js";
import { classify } from "./analyze.js";
import { q } from "./db.js";
import { limited, redact } from "./security.js";
import { DEFAULT_MODEL, isModel, type ModelId } from "../shared/models.js";
import { answerSystem, callModel, type ChatMsg, type Task } from "./providers.js";

export type BotUser = { id: string; lang: Lang; audience: Audience; consent_ai: boolean; consent_share: boolean; community_id: number | null; intake_step: number; ai_model?: string };
export { intakeQuestion };
export type { Mode };

// The learner picks the model. Every model gets the same rules and notes, shares one daily budget,
// and any failure falls back to the prepared, sourced answer.
async function askAI(u: BotUser, system: string, messages: ChatMsg[], maxTokens = 700, task: Task = "answer"): Promise<{ text: string; model: ModelId } | null> {
  const model: ModelId = isModel(u.ai_model) ? u.ai_model : DEFAULT_MODEL;
  if (model === "prepared") return null;
  const budget = Number(process.env.MAX_AI_PER_DAY || 2000);
  if (await limited(`ai:${new Date().toISOString().slice(0, 10)}`, budget, 86400)) return null;
  const text = await callModel(model, system, messages, maxTokens, task);
  return text ? { text, model } : null;
}
const aiText = async (...a: Parameters<typeof askAI>) => (await askAI(...a))?.text ?? null;

export async function saveInsight(u: BotUser, text: string, hint?: Theme) {
  const { theme, kind, sentiment } = classify(text, hint);
  await q("insert into insights (user_id, community_id, body, theme, kind, sentiment, shareable) values ($1,$2,$3,$4,$5,$6,$7)",
    [u.id, u.community_id, text, theme, kind, sentiment, u.consent_share]);
}

// Every message is kept, grouped into conversations, so full transcripts can be read back and exported.
export async function currentSession(userId: string) {
  const [r] = await q<{ data: number }>("select data from user_store where user_id = $1 and key = 'session'", [userId]);
  return Number(r?.data) || 0;
}

// The council answers; a pending listening question is whatever the last specialist asked.
export async function respond(u: BotUser, raw: string, channel: "web" | "whatsapp", mode: Mode = "ask", skipIntake = false) {
  const text = redact(raw), session = await currentSession(u.id);
  const [last] = await q<{ asks: number | null }>("select asks from messages where user_id = $1 and role = 'bot' order by id desc limit 1", [u.id]);
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from messages where user_id = $1", [u.id]);
  const pending = skipIntake ? null : last ? last.asks : u.intake_step < INTAKE.length ? u.intake_step : null;
  await q("insert into messages (user_id, channel, role, body, session) values ($1,$2,'user',$3,$4)", [u.id, channel, text, session]);
  const turn = converse(text, u, { mode, pending, n, listen: !skipIntake });
  if (turn.answered != null) {
    await saveInsight(u, text, INTAKE[turn.answered].theme);
    u.intake_step = Math.max(u.intake_step, turn.answered + 1);
    await q("update users set intake_step = $1 where id = $2", [u.intake_step, u.id]);
  } else await saveInsight(u, text);

  const lead = turn.replies.find((r) => r.source) ?? (turn.answered == null ? turn.replies[0] : undefined);
  if (u.consent_ai && lead) {
    const history = (await q<{ role: string; body: string }>("select role, body from messages where user_id = $1 order by id desc limit 7", [u.id])).reverse();
    const first = history.findIndex((h) => h.role === "user"); // the API needs a user turn first
    const msgs: ChatMsg[] = history.slice(first).map((h) => ({ role: h.role === "bot" ? "assistant" as const : "user" as const, content: h.role === "bot" ? h.body : `<user_text>${h.body}</user_text>` }));
    const ai = await askAI(u, answerSystem(u.audience, u.lang, mode), msgs);
    if (ai) { lead.body = ai.text; lead.model = ai.model; }
  }
  const saved = [];
  for (const r of turn.replies) {
    const [m] = await q<{ id: string }>("insert into messages (user_id, channel, role, expert, body, source, asks, session, model) values ($1,$2,'bot',$3,$4,$5,$6,$7,$8) returning id", [u.id, channel, r.expert, r.body, r.source, r.asks, session, r.model ?? null]);
    saved.push({ ...r, id: m.id });
  }
  const main = saved.find((r) => r.source) ?? saved[0];
  return { replies: saved, followups: turn.followups, intakeStep: u.intake_step, id: main?.id, body: saved.map((r) => r.body).join("\n\n"), expert: main?.expert, source: main?.source ?? null, pic: saved.find((r) => r.pic)?.pic ?? null };
}

export async function reviewDocument(u: BotUser, raw: string) {
  const text = redact(raw);
  const { flags, missing } = reviewRules(text, u.lang);
  const summary = u.consent_ai
    ? await aiText(u, `Explain this agreement to a community member in ${u.lang === "sw" ? "Kiswahili" : "English"}: what the community gives, what it gets, and three questions to ask. Never say whether it is safe or whether to sign.`, [{ role: "user", content: `<document>${text}</document>` }], 900)
    : null;
  return { flags, missing, summary };
}

export async function translate(u: BotUser, raw: string, to: Lang) {
  const text = redact(raw);
  const ai = u.consent_ai ? await aiText(u, `Translate the text inside <user_text> into ${to === "sw" ? "Kiswahili" : "English"}. Keep it natural and plain. Output only the translation.`, [{ role: "user", content: `<user_text>${text}</user_text>` }], 900, "quick") : null;
  return { text: ai, glossary: glossaryFor(text) };
}

// Circles: the bot speaks only when called, so people stay at the centre of the group.
export async function circleReply(u: BotUser, text: string) {
  const { body } = offlineAnswer(text, u, "ask");
  const ai = u.consent_ai ? await aiText(u, `Reply briefly in a community of practice group. Add one question that invites others to share. Reply in ${u.lang === "sw" ? "Kiswahili" : "English"}.`, [{ role: "user", content: `<user_text>${redact(text)}</user_text>` }], 300, "quick") : null;
  return ai ?? body;
}

export const nextLesson = (done: string[], lang: Lang) => {
  const m = MODULES.find((x) => !done.includes(x.id));
  return m ? `${m.title[lang]}\n\n${m.points.map((p) => `- ${p[lang]}`).join("\n")}\n\n${m.activity[lang]}` : null;
};

// Games from any content. The fast model can write them in any language; the rules are the offline fallback.
export async function makeGame(u: BotUser, raw: string, kind: Kind, lang: string, title: string): Promise<Game | null> {
  const text = redact(raw);
  if (u.consent_ai) {
    const shape = kind === "match" ? '{"pairs":[["term","meaning"]]} with 4 to 8 pairs' : '{"questions":[{"q":"question","options":["a","b","c"],"answer":0}]} with 4 to 8 questions, answer = index of the right option';
    const out = await aiText(u, `Make a learning game from the content inside <user_text>, written in ${lang}. Use only facts in the content. Reply with JSON only, shaped ${shape}.${isMaa(lang) ? ` ${maaPromptNotes()}` : ""}`, [{ role: "user", content: `<user_text>${text}</user_text>` }], 1500, "quick");
    try {
      const g = cleanGame({ ...JSON.parse((out ?? "").replace(/^```(json)?|```$/g, "")), kind, lang, title, by: "ai" });
      if (g) return g;
    } catch { /* no usable JSON from the model: the rules below take over */ }
  }
  return gameFromText(text, kind, lang, title);
}
