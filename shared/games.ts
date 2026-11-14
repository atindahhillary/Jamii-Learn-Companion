// Turn any content into a playable game. The rules below work offline in any language that uses
// spaces between words; the server can ask an AI model instead, for languages and content the rules cannot read.
import { GLOSSARY, type Lang } from "./content.js";
import { MODULES } from "./curriculum.js";
import { isMaa, maaGame } from "./maa.js";

export type Kind = "match" | "quiz";
export type Question = { q: string; options: string[]; answer: number };
export type Game = { id: string; title: string; lang: string; kind: Kind; pairs: [string, string][]; questions: Question[]; by: "rules" | "ai" };

const shuffleBy = <X,>(a: X[], seed: number) => a.map((v, i) => [Math.sin(seed + i * 7.1), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const STOP = new Set("the and that with this from have will they their which there about would could should into your what when where kwa na ya wa za la cha vya katika kuhusu hiyo hii huo hilo kama lakini pia sana tena hata ambayo ambao ndiyo".split(" "));
const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 5);

// "Term: meaning", "Term - meaning", "Term is/ni/means meaning", one per line or sentence.
export function pairsFromText(text: string): [string, string][] {
  const out: [string, string][] = [];
  for (const line of text.split(/\n+|(?<=[.!?])\s+/)) {
    const m = line.trim().match(/^(.{2,40}?)\s*(?::|=|\s[-–]\s|\sis\s|\sni\s|\smeans\s|\smaana yake ni\s)\s*(.{3,90}?)[.!?]?$/i);
    if (m && m[1].toLowerCase() !== m[2].toLowerCase()) out.push([m[1].trim(), m[2].trim()]);
  }
  return [...new Map(out.map((p) => [p[0].toLowerCase(), p])).values()].slice(0, 8);
}

// Fill the blank: hide the most telling word in each sentence, with other hidden words as wrong options.
export function blanksFromText(text: string, seed = 1): Question[] {
  const rows = sentences(text).slice(0, 12).map((s) => {
    const words = s.match(/[\p{L}\p{N}%']+/gu) ?? [];
    const key = [...words].filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase())).sort((a, b) => b.length - a.length)[0];
    return key ? { s, key } : null;
  }).filter((r): r is { s: string; key: string } => !!r);
  const keys = [...new Set(rows.map((r) => r.key))];
  if (keys.length < 3) return [];
  return rows.slice(0, 8).map((r, i) => {
    const wrong = shuffleBy(keys.filter((k) => k.toLowerCase() !== r.key.toLowerCase()), seed + i).slice(0, 2);
    const options = shuffleBy([r.key, ...wrong], seed * 3 + i);
    return { q: r.s.replace(r.key, "_____"), options, answer: options.indexOf(r.key) };
  });
}

export function gameFromText(text: string, kind: Kind, lang: string, title: string): Game | null {
  const id = `u${Date.now().toString(36)}`;
  if (kind === "match") {
    const glossary = GLOSSARY.filter(([en, sw]) => text.toLowerCase().includes(en) || text.toLowerCase().includes(sw)).map(([en, sw]) => [en, sw] as [string, string]);
    // Kiswahili-English glossary pairs only top up a game that is short of pairs from the text itself.
    const found = pairsFromText(text), pairs = found.length >= 3 ? found : [...found, ...glossary].slice(0, 8);
    return pairs.length >= 3 ? { id, title, lang, kind, pairs, questions: [], by: "rules" } : null;
  }
  const questions = blanksFromText(text, text.length);
  return questions.length >= 3 ? { id, title, lang, kind, pairs: [], questions, by: "rules" } : null;
}

// Lessons already exist in Kiswahili and English, so games from them are exact, not guessed.
export function gameFromModule(moduleId: string, kind: Kind, lang: Lang): Game | null {
  const m = MODULES.find((x) => x.id === moduleId);
  if (!m) return null;
  const id = `m${Date.now().toString(36)}`, title = m.title[lang];
  if (kind === "quiz") {
    const fromPoints = blanksFromText(m.points.map((p) => p[lang]).join(" "), m.id.length);
    return { id, title, lang, kind, pairs: [], by: "rules", questions: [...m.quiz.map((q) => ({ q: q.q[lang], options: q.options.map((x) => x[lang]), answer: q.answer })), ...fromPoints].slice(0, 8) };
  }
  const pairs: [string, string][] = m.quiz.map((q) => [q.q[lang], q.options[q.answer][lang]]);
  return { id, title, lang, kind, pairs, questions: [], by: "rules" };
}

// Shape check for games coming from an AI model or a browser.
export function cleanGame(g: any): Game | null {
  const s = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  if (!g || (g.kind !== "match" && g.kind !== "quiz")) return null;
  const pairs = (Array.isArray(g.pairs) ? g.pairs : []).map((p: any) => [s(p?.[0], 120), s(p?.[1], 160)] as [string, string]).filter((p: [string, string]) => p[0] && p[1]).slice(0, 10);
  const questions = (Array.isArray(g.questions) ? g.questions : []).map((q: any) => ({ q: s(q?.q, 300), options: (Array.isArray(q?.options) ? q.options : []).map((o: unknown) => s(o, 120)).filter(Boolean).slice(0, 4), answer: Number(q?.answer) }))
    .filter((q: Question) => q.q && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length).slice(0, 10);
  if (g.kind === "match" ? pairs.length < 3 : questions.length < 2) return null;
  return { id: s(g.id, 40) || `g${Date.now().toString(36)}`, title: s(g.title, 80) || "Game", lang: s(g.lang, 30) || "sw", kind: g.kind, pairs: g.kind === "match" ? pairs : [], questions: g.kind === "quiz" ? questions : [], by: g.by === "ai" ? "ai" : "rules" };
}

// A lesson as a game: Kiswahili and English from the lesson itself, Maa from the checked word list.
export function gameFromLesson(moduleId: string, kind: Kind, lang: string, uiLang: Lang): Game | null {
  if (lang === "sw" || lang === "en") return gameFromModule(moduleId, kind, lang);
  const m = MODULES.find((x) => x.id === moduleId);
  return m && isMaa(lang) ? maaGame(kind, m.theme, uiLang, `${m.title[uiLang]} · Maa`) : null;
}
