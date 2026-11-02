import { THEMES, type Theme } from "../shared/content.js";
import { MODULES } from "../shared/curriculum.js";

export type Kind = "idea" | "knowledge" | "concern" | "question";
const THEME_WORDS: Record<Theme, string[]> = {
  carbon_basics: ["kaboni", "carbon", "credit", "mkopo", "mikopo", "soko", "market", "tani"],
  ecology: ["malisho", "graz", "mifugo", "livestock", "ukame", "drought", "maji", "water", "msitu", "forest", "jadi", "tradition", "wazee", "elder"],
  measurement: ["kupima", "measure", "baseline", "mkaguzi", "audit", "verra", "takwimu"],
  land_rights: ["ardhi", "land", "hati", "title", "mahakama", "court", "kufukuzwa", "eviction", "kuhama"],
  fpic: ["ridhaa", "consent", "fpic", "kushirikishwa", "mkutano", "meeting", "kuulizwa", "wanawake", "women", "vijana", "youth"],
  benefits: ["pesa", "money", "mapato", "earning", "mgao", "share", "faida", "malipo", "payment", "asilimia"],
  contracts: ["mkataba", "contract", "kusaini", "sign", "sheria", "law", "wakili", "lawyer", "kiingereza"],
  ai_trust: [" ai ", "akili bandia", "chatbot", "roboti", "faragha", "privacy"],
};
const CONCERN = ["wasiwasi", "hofu", "ogopa", "worry", "afraid", "fear", "dhuluma", "tapeli", "cheat", "kuibiwa", "kufukuzwa", "evict", "hatuelewi", "sielewi", "don't understand", "uongo"];
const KNOWLEDGE = ["jadi", "tradition", "wazee", "elders", "zamani", "desturi", "custom", "tunajua", "we know", "mababu"];
const NEG = [...CONCERN, "mbaya", "bad"];
const POS = ["nzuri", "good", "fursa", "opportunity", "tumaini", "hope", "asante", "thank", "maendeleo"];

export function classify(text: string, hint?: Theme) {
  const t = ` ${text.toLowerCase()} `;
  const has = (l: string[]) => l.some((w) => t.includes(w));
  const count = (l: string[]) => l.filter((w) => t.includes(w)).length;
  let theme: Theme = hint ?? "carbon_basics", top = 0;
  for (const k of Object.keys(THEME_WORDS) as Theme[]) {
    const c = count(THEME_WORDS[k]);
    if (c > top) { theme = k; top = c; }
  }
  const kind: Kind = has(CONCERN) ? "concern" : t.includes("?") || /\b(nini|vipi|what|how|why)\b/.test(t) ? "question" : has(KNOWLEDGE) ? "knowledge" : "idea";
  return { theme, kind, sentiment: Math.sign(count(POS) - count(NEG)) };
}

export type InsightRow = { theme: Theme; kind: Kind };
export type ProgressRow = { module_id: string; score: number | null };

// Gap blends what people ask or fear (voice) with what quizzes show (mastery), so it stays auditable.
export function gapScores(insights: InsightRow[], progress: ProgressRow[]) {
  const voice = Object.fromEntries(Object.keys(THEMES).map((k) => [k, 0])) as Record<Theme, number>;
  for (const i of insights) if (i.kind === "concern" || i.kind === "question") voice[i.theme] += 1;
  const maxVoice = Math.max(1, ...Object.values(voice));
  return MODULES.map((m) => {
    const scores = progress.filter((p) => p.module_id === m.id && p.score != null).map((p) => p.score as number);
    const mastery = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length / 100 : 0;
    return {
      theme: m.theme, moduleId: m.id, voice: voice[m.theme], learners: scores.length,
      mastery: Math.round(mastery * 100),
      gap: Math.round(100 * (0.6 * (1 - mastery) + (0.4 * voice[m.theme]) / maxVoice)),
    };
  });
}

// Basics stay first because every other module leans on them; the rest follow the community's gaps.
export function buildCurriculum(gaps: ReturnType<typeof gapScores>) {
  const sorted = [...gaps].sort((a, b) => (a.moduleId === "m1" ? -1 : b.moduleId === "m1" ? 1 : b.gap - a.gap));
  return sorted.map((g, i) => ({ ...g, order: i + 1, day: i * 2 + 1 }));
}

export const MIN_GROUP = 5; // a smaller group can identify a person, so the report hides it
