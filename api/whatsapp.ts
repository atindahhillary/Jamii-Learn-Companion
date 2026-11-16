// WhatsApp for the public demo, with no database. Meta delivers each message here; the bot replies with the
// same prepared, sourced answers as the Assistant. It never messages anyone first and remembers nothing,
// so every reply is free (inside WhatsApp's 24-hour service window) and no chat is stored by this app.
import { o, type Lang } from "../shared/content.js";
import { converse } from "../shared/council.js";
import { MODULES } from "../shared/curriculum.js";
import { MAA } from "../shared/maa.js";
import { redact, verifyMetaSignature } from "../server/security.js";
import { sendText } from "../server/whatsapp.js";

// shortcut: duplicate and rate checks live in this instance's memory, so they reset on a cold start.
// Meta retries a delivery until it gets a 200, so a lost entry at worst means one repeated reply.
const seen = new Set<string>();
const hits = new Map<string, number[]>();
const PER_HOUR = 40;
function allowed(from: string) {
  const now = Date.now(), recent = (hits.get(from) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= PER_HOUR) return false;
  hits.set(from, [...recent, now]);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= 3600_000)) hits.delete(k);
  return true;
}

// No stored profile, so the language is read from each message. Kiswahili unless it reads as English.
const SW = ["ni", "na", "ya", "wa", "kwa", "nini", "je", "vipi", "gani", "habari", "jamii", "ardhi", "pesa", "mkataba", "mradi", "tunaweza", "kuhusu", "asante", "ndiyo", "hapana", "somo", "michezo", "msaada", "menyu"];
const EN = ["the", "is", "are", "what", "how", "why", "who", "can", "we", "do", "of", "and", "to", "about", "my", "our", "lesson", "games", "help", "menu", "hello", "hi", "thanks", "start"];
export function langOf(text: string): Lang {
  const w = ` ${text.toLowerCase().replace(/[^\p{L}\s]+/gu, " ")} `;
  const n = (list: string[]) => list.filter((x) => w.includes(` ${x} `)).length;
  return n(EN) > n(SW) ? "en" : "sw";
}

const site = () => (process.env.SITE_URL || "https://jamii-learn-companion.vercel.app").replace(/\/$/, "");
const MENU = (L: Lang) => o(
  `*Msaidizi wa Jamii* (AI, inaweza kukosea)\n\nNiulize chochote kuhusu kaboni, ardhi, ridhaa, mikataba au mgao wa pesa.\n\nAmri:\n• *somo* : orodha ya masomo\n• *somo 3* : somo la tatu\n• *michezo* : michezo ya kujifunza\n• *maa* : maneno ya Maa\n• *menyu* : ujumbe huu\n\nUsitume PIN, nambari ya kitambulisho wala siri za jamii. Ujumbe unapita kupitia WhatsApp (Meta).`,
  `*Jamii Companion* (AI, it can be wrong)\n\nAsk me anything about carbon, land, consent, contracts or the money share.\n\nCommands:\n• *lesson* : list of lessons\n• *lesson 3* : the third lesson\n• *games* : learning games\n• *maa* : Maa words\n• *menu* : this message\n\nDo not send PINs, ID numbers or community secrets. Messages pass through WhatsApp (Meta).`,
)[L];

// Commands first; anything else gets the Assistant's prepared answer.
export function reply(raw: string): string {
  const text = redact(raw.trim().slice(0, 1500)), t = text.toLowerCase().replace(/[*_.!?]/g, "").trim(), L = langOf(text);
  if (/^(menu|menyu|msaada|help|anza|start|hi|hello|habari|jambo|sopa)$/.test(t)) return MENU(L);
  if (/^(acha|stop)$/.test(t)) return L === "sw" ? "Sawa. Sitakutumia ujumbe. Ukitaka kuendelea, andika *menyu* wakati wowote." : "Fine. I will not message you. To carry on, send *menu* any time.";
  const lesson = t.match(/^(somo|lesson|masomo|lessons)\s*(\d)?$/);
  if (lesson) {
    const m = lesson[2] ? MODULES[Number(lesson[2]) - 1] : null;
    if (!m) return `${L === "sw" ? "*Masomo*" : "*Lessons*"}\n${MODULES.map((x, i) => `${i + 1}. ${x.title[L]}`).join("\n")}\n\n${L === "sw" ? "Andika mfano *somo 1*." : "Send for example *lesson 1*."}`;
    return `*${m.title[L]}*\n\n${m.points.map((p) => `• ${p[L]}`).join("\n")}\n\n${L === "sw" ? "*Shughuli*" : "*Activity*"}: ${m.activity[L]}\n\n${L === "sw" ? "Maswali na michezo zaidi" : "More questions and games"}: ${site()}`;
  }
  if (/^(michezo|mchezo|games|game)$/.test(t)) return L === "sw"
    ? `*Michezo*\nLinganisha maneno, Hesabu ya mgao, Bendera nyekundu, na michezo unayotengeneza mwenyewe kwa Kiswahili, Kiingereza au Maa:\n${site()}/#tools`
    : `*Games*\nMatch the words, Work out the share, Red flags, and games you make yourself in Kiswahili, English or Maa:\n${site()}/#tools`;
  if (/^(maa|maasai|kimaasai)$/.test(t)) return `*${L === "sw" ? "Maneno ya Maa (kamusi)" : "Maa words (dictionary)"}*\n${MAA.slice(0, 15).map((w) => `${w.maa} (${w.plain}): ${w.gloss[L]}`).join("\n")}\n\n${L === "sw" ? "Mzungumzaji wa Maa ahakiki." : "Have a Maa speaker check."}`;
  const turn = converse(text, { lang: L, audience: "herder", intake_step: 99 }, { pending: null, n: Date.now() % 997, listen: false });
  const r = turn.replies[0];
  return `${r.body}${r.source ? `\n\n_${L === "sw" ? "Chanzo" : "Source"}: ${r.source}_` : ""}\n\n${L === "sw" ? "Andika *menyu* kwa amri." : "Send *menu* for commands."}`;
}

// Meta's one-time check when the webhook address is saved in the app dashboard.
export function GET(req: Request) {
  const u = new URL(req.url), token = process.env.WA_VERIFY_TOKEN;
  if (token && u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === token) return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  return new Response("forbidden", { status: 403 });
}

type Incoming = { id: string; from: string; type: string; text?: { body: string } };
export async function POST(req: Request) {
  const raw = await req.text(), secret = process.env.WA_APP_SECRET;
  // Only Meta knows the app secret, so a valid signature proves the message came from WhatsApp.
  if (!secret || !verifyMetaSignature(raw, req.headers.get("x-hub-signature-256") ?? undefined, secret)) return new Response("no", { status: 401 });
  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response("ok"); }
  const messages: Incoming[] = (body?.entry ?? []).flatMap((e: any) => e?.changes ?? []).flatMap((c: any) => c?.value?.messages ?? []);
  for (const m of messages) {
    if (!m?.id || !m.from || seen.has(m.id)) continue;
    seen.add(m.id);
    if (seen.size > 10000) seen.clear();
    if (!allowed(m.from)) continue;
    const text = m.type === "text" ? m.text?.body ?? "" : "";
    // Voice notes, photos and stickers get a bilingual note, since there is no text to read the language from.
    const answer = text ? reply(text) : "Kwa sasa ninaelewa ujumbe wa maandishi tu. Andika swali lako, au *menyu*.\n\nFor now I only understand text messages. Type your question, or *menu*.";
    try { await sendText(m.from, answer); } catch { console.error("whatsapp send failed"); }
  }
  return new Response("ok"); // always 200 to a signed delivery, so Meta does not keep retrying
}
