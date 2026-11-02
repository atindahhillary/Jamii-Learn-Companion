import { GLOSSARY, INTAKE, MUST_HAVES, RED_FLAGS, type Audience, type Lang } from "./content.js";
import { CARDS, type Card } from "./curriculum.js";

export type Mode = "ask" | "analogy" | "game";
export type Learner = { lang: Lang; audience: Audience; intake_step: number };

const levelFor = (a: Audience) => (a === "leader" || a === "trainer" ? "detail" : "simple") as "detail" | "simple";

function findCard(text: string): Card | null {
  const t = text.toLowerCase();
  let best: Card | null = null, top = 0;
  for (const c of CARDS) {
    const score = c.words.filter((w) => t.includes(w)).length;
    if (score > top) { best = c; top = score; }
  }
  return best;
}

const FOOT = { sw: "Hakiki na mtu unayemwamini kabla ya kuamua.", en: "Check with someone you trust before deciding." };
const NO_CARD = {
  sw: "Sina uhakika kuhusu hilo bado. Jaribu kuuliza kuhusu mikopo ya kaboni, mgao wa mapato, ridhaa (FPIC), mkataba (CDA), ardhi au malisho.",
  en: "I am not sure about that yet. Try asking about carbon credits, benefit sharing, consent (FPIC), the agreement (CDA), land or grazing.",
};

export function offlineAnswer(text: string, u: Learner, mode: Mode) {
  const c = findCard(text);
  if (!c) return { body: NO_CARD[u.lang], source: null as string | null };
  const main = mode === "ask" ? c[levelFor(u.audience)][u.lang] : c.analogy[u.lang];
  const game = mode === "game"
    ? (u.lang === "sw" ? "\n\nMchezo: gawanyeni vikundi viwili, kimoja kitetee hoja hii na kingine kiulize maswali matatu magumu." : "\n\nGame: split into two groups. One defends this idea, the other asks three hard questions.")
    : "";
  return { body: `${main}${game}\n\n${FOOT[u.lang]}`, source: c.source };
}

export const intakeQuestion = (u: Learner) => {
  const i = INTAKE[u.intake_step];
  if (!i) return null;
  const hint = u.lang === "sw" ? `(Swali ${u.intake_step + 1} kati ya ${INTAKE.length}. Andika RUKA kuruka.)` : `(Question ${u.intake_step + 1} of ${INTAKE.length}. Type SKIP to skip.)`;
  return `${i.q[u.lang]}\n\n${hint}`;
};

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
