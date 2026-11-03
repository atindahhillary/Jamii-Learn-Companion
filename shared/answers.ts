import { GLOSSARY, INTAKE, MUST_HAVES, RED_FLAGS, type Audience, type Lang } from "./content.js";
import { findCard } from "./council.js";
import { MODULES } from "./curriculum.js";

export type Mode = "ask" | "analogy" | "game";
export type Learner = { lang: Lang; audience: Audience; intake_step: number };

const levelFor = (a: Audience) => (a === "leader" || a === "trainer" ? "detail" : "simple") as "detail" | "simple";

const FOOT = { sw: "Hakiki na mtu unayemwamini kabla ya kuamua.", en: "Check with someone you trust before deciding." };
const NO_CARD = {
  sw: "Sina uhakika kuhusu hilo bado. Jaribu kuuliza kuhusu mikopo ya kaboni, mgao wa mapato, ridhaa (FPIC), mkataba (CDA), ardhi au malisho.",
  en: "I am not sure about that yet. Try asking about carbon credits, benefit sharing, consent (FPIC), the agreement (CDA), land or grazing.",
};

export function offlineAnswer(text: string, u: Learner, mode: Mode) {
  const c = findCard(text);
  if (!c) return { body: NO_CARD[u.lang], source: null as string | null, pic: null as string | null };
  const main = mode === "ask" ? c[levelFor(u.audience)][u.lang] : c.analogy[u.lang];
  const game = mode === "game"
    ? (u.lang === "sw" ? "\n\nMchezo: gawanyeni vikundi viwili, kimoja kitetee hoja hii na kingine kiulize maswali matatu magumu." : "\n\nGame: split into two groups. One defends this idea, the other asks three hard questions.")
    : "";
  return { body: `${main}${game}\n\n${FOOT[u.lang]}`, source: c.source, pic: MODULES.find((m) => m.theme === c.theme)?.id ?? null };
}

export const intakeQuestion = (u: Learner) => INTAKE[u.intake_step]?.q[u.lang] ?? null;

export const intakeDone = {
  sw: "Asante sana kwa kushiriki. Sauti yako sasa ni sehemu ya mpango wa mafunzo ya jamii yako. Unaweza kuniuliza chochote, au uanze somo la kwanza.",
  en: "Thank you for sharing. Your voice now shapes your community's training plan. Ask me anything, or start the first lesson.",
};

export const reviewRules = (text: string, lang: Lang) => ({
  flags: RED_FLAGS.filter((f) => f.re.test(text)).map((f) => ({ id: f.id, title: f.title[lang], ask: f.ask[lang] })),
  missing: MUST_HAVES.filter((m) => !m.re.test(text)).map((m) => m.title[lang]),
});

export const glossaryFor = (text: string) =>
  GLOSSARY.filter(([en, sw]) => text.toLowerCase().includes(en) || text.toLowerCase().includes(sw)).map(([en, sw]) => ({ en, sw }));
