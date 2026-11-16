// WhatsApp for the public demo, with no database. Meta delivers each message here; the bot replies with the
// same prepared, sourced answers as the Assistant. It never messages anyone first and remembers nothing,
// so every reply is free (inside WhatsApp's 24-hour service window) and no chat is stored by this app.
// Replies are short and come with tap buttons and lists, so people can keep going without typing.
import { type Lang } from "../shared/content.js";
import { FOLLOW, STARTERS, converse } from "../shared/council.js";
import { MODULES } from "../shared/curriculum.js";
import { MAA } from "../shared/maa.js";
import { redact, verifyMetaSignature } from "../server/security.js";
import { markRead, sendOut, type Out } from "../server/whatsapp.js";

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

// No stored profile, so the language is read from each message (or carried in a tapped button's id).
const SW = ["ni", "na", "ya", "wa", "kwa", "nini", "je", "vipi", "gani", "habari", "jamii", "ardhi", "pesa", "mkataba", "mradi", "tunaweza", "kuhusu", "asante", "ndiyo", "hapana", "somo", "michezo", "msaada", "menyu", "sopa", "mambo"];
const EN = ["the", "is", "are", "what", "how", "why", "who", "can", "we", "do", "of", "and", "to", "about", "my", "our", "lesson", "games", "help", "menu", "hello", "hi", "thanks", "start"];
export function langOf(text: string): Lang {
  const w = ` ${text.toLowerCase().replace(/[^\p{L}\s]+/gu, " ")} `;
  const n = (list: string[]) => list.filter((x) => w.includes(` ${x} `)).length;
  return n(EN) > n(SW) ? "en" : "sw";
}

const site = () => (process.env.SITE_URL || "https://jamii-learn-companion.vercel.app").replace(/\/$/, "");
const t2 = (L: Lang, sw: string, en: string) => (L === "sw" ? sw : en);
const NAME = "Jamii Learn Companion";

// Tapped buttons send back an id like "sw|lesson|3", so the bot knows what was chosen and in which language.
const id = (L: Lang, ...parts: (string | number)[]) => [L, ...parts].join("|");
const menuButtons = (L: Lang) => [
  { id: id(L, "lessons"), title: t2(L, "📚 Masomo", "📚 Lessons") },
  { id: id(L, "faq"), title: t2(L, "❓ Maswali", "❓ Questions") },
  { id: id(L, "games"), title: t2(L, "🎮 Michezo", "🎮 Games") },
];
const askRows = (L: Lang, qs: string[]) => qs.slice(0, 10).map((q, i) => ({ id: id(L, "ask", q).slice(0, 200), title: q.length > 24 ? `${i + 1}. ${q}` : q, description: q.length > 24 ? q : undefined }));

export function menu(L: Lang): Out {
  return {
    text: t2(L,
      `👋 *Karibu ${NAME}!*\nMimi ni AI inayokusaidia kuelewa biashara ya kaboni, ardhi, ridhaa na mgao wa pesa. 🌍🌱\n\nUliza swali lolote kwa maneno yako, au gusa kitufe hapa chini. 👇\n\n_Usitume PIN wala nambari ya kitambulisho._`,
      `👋 *Welcome to ${NAME}!*\nI am an AI that helps you understand carbon markets, land, consent and the money share. 🌍🌱\n\nAsk anything in your own words, or tap a button below. 👇\n\n_Never send PINs or ID numbers._`),
    buttons: menuButtons(L),
  };
}

function lesson(L: Lang, n: number): Out {
  const m = MODULES[n - 1];
  if (!m) return lessonList(L);
  const next = MODULES[n] ? [{ id: id(L, "lesson", n + 1), title: t2(L, "Somo lijalo ▶", "Next lesson ▶") }] : [];
  return {
    text: `📚 *${t2(L, "Somo", "Lesson")} ${n}: ${m.title[L]}*\n_${m.minutes} ${t2(L, "dakika", "min")}_\n\n${m.points.map((p) => `✅ ${p[L]}`).join("\n\n")}\n\n🎯 *${t2(L, "Jaribu leo", "Try today")}:* ${m.activity[L]}`,
    buttons: [...next, { id: id(L, "faq"), title: t2(L, "❓ Uliza swali", "❓ Ask a question") }, { id: id(L, "menu"), title: t2(L, "🏠 Menyu", "🏠 Menu") }],
  };
}
const lessonList = (L: Lang): Out => ({
  text: t2(L, "📚 *Masomo 8 mafupi* (dakika 5 hadi 7 kila moja). Chagua moja:", "📚 *8 short lessons* (5 to 7 minutes each). Pick one:"),
  list: { button: t2(L, "Chagua somo", "Choose a lesson"), rows: MODULES.map((m, i) => ({ id: id(L, "lesson", i + 1), title: `${i + 1}. ${m.title[L]}`, description: `${m.minutes} ${t2(L, "dakika", "min")}` })) },
});
const faq = (L: Lang): Out => ({
  text: t2(L, "❓ *Maswali ambayo jamii huuliza zaidi.* Gusa moja, au andika lako:", "❓ *What communities ask most.* Tap one, or type your own:"),
  list: { button: t2(L, "Maswali", "Questions"), rows: askRows(L, [...new Set([...STARTERS, ...Object.values(FOLLOW).flat()].map((q) => q[L]))]) },
});
const games = (L: Lang): Out => ({
  text: t2(L,
    `🎮 *Michezo ya kujifunza*\n🃏 Linganisha maneno\n🧮 Hesabu ya mgao: 40% ya nini?\n🚩 Bendera nyekundu kwenye mkataba\n✨ Tengeneza mchezo wako kwa Kiswahili, Kiingereza au Maa\n\nCheza hapa: ${site()}/#tools`,
    `🎮 *Learning games*\n🃏 Match the words\n🧮 Work out the share: 40% of what?\n🚩 Red flags in a contract\n✨ Make your own game in Kiswahili, English or Maa\n\nPlay here: ${site()}/#tools`),
  buttons: [{ id: id(L, "lessons"), title: t2(L, "📚 Masomo", "📚 Lessons") }, { id: id(L, "menu"), title: t2(L, "🏠 Menyu", "🏠 Menu") }],
});
const maa = (L: Lang): Out => ({
  text: `🌿 *${t2(L, "Maneno ya Maa (kamusi)", "Maa words (dictionary)")}*\n\n${MAA.slice(0, 12).map((w) => `• *${w.maa}* (${w.plain}): ${w.gloss[L]}`).join("\n")}\n\n_${t2(L, "Mzungumzaji wa Maa ahakiki.", "Have a Maa speaker check.")}_`,
  buttons: [{ id: id(L, "menu"), title: t2(L, "🏠 Menyu", "🏠 Menu") }],
});

// The Assistant's prepared answer, trimmed for a phone screen: the answer itself, one extra point and the source.
function answer(L: Lang, text: string): Out {
  const turn = converse(text, { lang: L, audience: "herder", intake_step: 99 }, { pending: null, n: Date.now() % 997, listen: false });
  const r = turn.replies[0], parts = r.body.split("\n\n").filter(Boolean);
  const also = parts.findIndex((p) => /^(Pia kumbuka|Also keep in mind):/.test(p));
  const core = also > 0 ? [...parts.slice(0, also), parts[also].split("\n").slice(0, 2).join("\n")] : parts.slice(0, 3);
  const foot = r.source ? `\n\n📖 _${t2(L, "Chanzo", "Source")}: ${r.source}_` : "";
  return {
    text: `💬 ${core.join("\n\n")}${foot}\n\n🤝 _${t2(L, "Hakiki na mtu unayemwamini kabla ya kuamua.", "Check with someone you trust before deciding.")}_`,
    list: { button: t2(L, "Uliza zaidi", "Ask more"), rows: [...askRows(L, turn.followups), { id: id(L, "lessons"), title: t2(L, "📚 Masomo", "📚 Lessons") }, { id: id(L, "menu"), title: t2(L, "🏠 Menyu", "🏠 Menu") }] },
  };
}

// Typed words and tapped buttons both end up here.
export function reply(raw: string): Out {
  const tap = raw.match(/^(sw|en)\|(\w+)(?:\|([\s\S]*))?$/);
  if (tap) {
    const L = tap[1] as Lang, what = tap[2], arg = tap[3] ?? "";
    if (what === "lesson") return lesson(L, Number(arg));
    if (what === "lessons") return lessonList(L);
    if (what === "faq") return faq(L);
    if (what === "games") return games(L);
    if (what === "ask") return answer(L, arg);
    return menu(L);
  }
  const text = redact(raw.trim().slice(0, 1500)), t = text.toLowerCase().replace(/[*_.!?]/g, "").trim(), L = langOf(text);
  if (/^(menu|menyu|msaada|help|anza|start|hi|hello|hey|habari|jambo|sopa|mambo|niaje|salaam)$/.test(t)) return menu(L);
  if (/^(acha|stop)$/.test(t)) return { text: t2(L, "Sawa 👍 Sitakutumia ujumbe. Ukitaka kuendelea, andika *menyu* wakati wowote.", "Okay 👍 I will not message you. To carry on, send *menu* any time.") };
  if (/^(asante|thanks|thank you|ashe)$/.test(t)) return { text: t2(L, "Karibu sana! 🙏 Niko hapa ukiwa na swali jingine.", "You are very welcome! 🙏 I am here for your next question."), buttons: menuButtons(L) };
  const l = t.match(/^(somo|lesson|masomo|lessons)\s*(\d)?$/);
  if (l) return l[2] ? lesson(L, Number(l[2])) : lessonList(L);
  if (/^(michezo|mchezo|games|game)$/.test(t)) return games(L);
  if (/^(maa|maasai|kimaasai)$/.test(t)) return maa(L);
  return answer(L, text);
}

// Meta's one-time check when the webhook address is saved in the app dashboard.
// The phrase is not what protects the bot: every message must carry Meta's signature made with WA_APP_SECRET (see POST),
// so another app pointed at this address can never get a reply. Any non-empty phrase is accepted to keep setup simple;
// whether it matched WA_VERIFY_TOKEN is only logged (without the phrase).
export function GET(req: Request) {
  const u = new URL(req.url), given = u.searchParams.get("hub.verify_token")?.trim(), challenge = u.searchParams.get("hub.challenge");
  // Meta's challenge is always a number; anything else is refused, so nothing else can be echoed back.
  if (u.searchParams.get("hub.mode") !== "subscribe" || !given || !challenge || !/^\d{1,20}$/.test(challenge)) return new Response("forbidden", { status: 403 });
  console.log("whatsapp verify: ok", given === process.env.WA_VERIFY_TOKEN?.trim() ? "(phrase matched)" : "(phrase differs, accepted)");
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain", "x-content-type-options": "nosniff" } });
}

type Incoming = { id: string; from: string; type: string; text?: { body: string }; interactive?: { button_reply?: { id: string }; list_reply?: { id: string } } };
export async function POST(req: Request) {
  const raw = await req.text(), secret = process.env.WA_APP_SECRET;
  // Only Meta knows the app secret, so a valid signature proves the message came from WhatsApp.
  if (!secret || !verifyMetaSignature(raw, req.headers.get("x-hub-signature-256") ?? undefined, secret)) { console.log("whatsapp delivery: bad signature", !secret ? "(WA_APP_SECRET not set)" : ""); return new Response("no", { status: 401 }); }
  let body: any;
  try { body = JSON.parse(raw); } catch { return new Response("ok"); }
  const messages: Incoming[] = (body?.entry ?? []).flatMap((e: any) => e?.changes ?? []).flatMap((c: any) => c?.value?.messages ?? []);
  for (const m of messages) {
    if (!m?.id || !m.from || seen.has(m.id)) continue;
    seen.add(m.id);
    if (seen.size > 10000) seen.clear();
    if (!allowed(m.from)) continue;
    console.log("whatsapp message:", m.type);
    await markRead(m.id);
    const said = m.type === "text" ? m.text?.body ?? "" : m.type === "interactive" ? m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id ?? "" : "";
    // Voice notes, photos and stickers get a bilingual note, since there is no text to read the language from.
    const out: Out = said ? reply(said) : { text: "🎙️ Kwa sasa ninaelewa ujumbe wa maandishi tu. Andika swali lako, au *menyu*.\n\nFor now I only understand text messages. Type your question, or *menu*." };
    try { await sendOut(m.from, out); console.log("whatsapp reply: sent"); } catch (e) { console.error("whatsapp send failed", (e as Error).message); }
  }
  return new Response("ok"); // always 200 to a signed delivery, so Meta does not keep retrying
}
