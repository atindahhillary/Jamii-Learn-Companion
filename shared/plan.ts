// Personal and group learning plans, built from what a learner or facilitator tells us.
// Rule-based so it runs offline in the demo and gives the same plan on the server.
import { THEMES, o, type T, type Theme } from "./content.js";
import { findCard } from "./council.js";
import { MODULES } from "./curriculum.js";
import { STORY } from "./story.js";

export type Level = "new" | "some" | "deep";
export type Goal = { forWhom: "me" | "group"; themes: Theme[]; level: Level; minutes: number; note: string };
export type Member = { name: string; note: string };
export type Session = { moduleId: string; at: number; attended: string[]; feedback: string };
export type Group = { id: string; name: string; members: Member[]; needs: Theme[]; note: string; sessions: Session[] };
export type Step = { moduleId: string; theme: Theme; order: number; week: number; minutes: number; reason: T; guide: { activity: T; discuss: T } | null };

const ALL = Object.keys(THEMES) as Theme[];
export const isTheme = (x: unknown): x is Theme => typeof x === "string" && ALL.includes(x as Theme);

// Themes named in someone's own words, one sentence or comma piece at a time.
export function themesFromText(text: string): Theme[] {
  const found = text.split(/[.,;!?\n]+/).map((s) => findCard(s)?.theme).filter(isTheme);
  return [...new Set(found)];
}

const R = {
  basics: o("Tunaanza na msingi, kwa sababu masomo mengine yanautegemea.", "We start with the basics, because the other lessons lean on them."),
  chose: o("Ulichagua hili.", "You chose this."),
  said: o("Uliandika kuhusu hili kwa maneno yako.", "You wrote about this in your own words."),
  group: o("Kundi lako limeonyesha hitaji hili.", "Your group has shown this need."),
  community: o("Jamii yako inauliza zaidi kuhusu hili.", "Your community asks most about this."),
  safety: o("Kila mtumiaji wa AI anahitaji hili.", "Everyone using AI needs this."),
};

// Order: basics for beginners, then what they picked or wrote (most-needed first by community gap),
// then AI safety for beginners. Nothing picked means the community plan, so nobody gets an empty path.
export function makePlan(goal: Goal, gaps: { moduleId: string; gap: number }[] = [], extra: { themes: Theme[]; why: "group" } | null = null): Step[] {
  const gapOf = (t: Theme) => gaps.find((g) => MODULES.find((m) => m.id === g.moduleId)?.theme === t)?.gap ?? 0;
  const said = themesFromText(goal.note);
  const reasons = new Map<Theme, T>();
  if (goal.level === "new") reasons.set("carbon_basics", R.basics);
  const wanted = [...goal.themes.map((t) => [t, R.chose] as const), ...said.map((t) => [t, R.said] as const), ...(extra?.themes ?? []).map((t) => [t, R.group] as const)];
  for (const [t, r] of [...wanted].sort((a, b) => gapOf(b[0]) - gapOf(a[0]))) if (!reasons.has(t)) reasons.set(t, r);
  if (reasons.size <= (goal.level === "new" ? 1 : 0)) for (const t of [...ALL].sort((a, b) => gapOf(b) - gapOf(a))) if (!reasons.has(t)) reasons.set(t, R.community);
  if (goal.level === "new" && !reasons.has("ai_trust")) reasons.set("ai_trust", R.safety);

  const weekly = Math.max(10, goal.minutes || 20);
  let used = 0;
  return [...reasons.entries()].map(([theme, reason], i) => {
    const m = MODULES.find((x) => x.theme === theme)!;
    // A group needs time to talk, and deeper learners get the detailed reading.
    const minutes = m.minutes + (goal.forWhom === "group" ? 15 : 0) + (goal.level === "deep" ? 5 : 0);
    const week = Math.floor(used / weekly) + 1;
    used += minutes;
    return { moduleId: m.id, theme, order: i + 1, week, minutes, reason, guide: goal.forWhom === "group" ? { activity: m.activity, discuss: STORY[m.id].ask } : null };
  });
}

// A group's needs grow from what the facilitator records: picked needs, notes, member notes and session feedback.
export function groupNeeds(g: Group): { theme: Theme; from: "picked" | "notes" }[] {
  const picked = g.needs.map((theme) => ({ theme, from: "picked" as const }));
  const heard = themesFromText([g.note, ...g.members.map((m) => m.note), ...g.sessions.map((s) => s.feedback)].join("\n"))
    .filter((t) => !g.needs.includes(t)).map((theme) => ({ theme, from: "notes" as const }));
  return [...picked, ...heard];
}

export const groupPlan = (g: Group, gaps: { moduleId: string; gap: number }[] = []) =>
  makePlan({ forWhom: "group", themes: [], level: "new", minutes: 60, note: "" }, gaps, { themes: groupNeeds(g).map((n) => n.theme), why: "group" });

// Untrusted input from a browser or the API, clamped to safe shapes and sizes.
const str = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
export function cleanGoal(b: any): Goal | null {
  if (!b || (b.forWhom !== "me" && b.forWhom !== "group")) return null;
  return {
    forWhom: b.forWhom, themes: (Array.isArray(b.themes) ? b.themes : []).filter(isTheme).slice(0, 8),
    level: ["new", "some", "deep"].includes(b.level) ? b.level : "new",
    minutes: Math.min(300, Math.max(10, Number(b.minutes) || 20)), note: str(b.note, 600),
  };
}
export function cleanGroup(b: any): Group | null {
  const name = str(b?.name, 60);
  if (!name) return null;
  return {
    id: str(b.id, 40) || `g${Date.now().toString(36)}`, name, note: str(b.note, 800),
    needs: (Array.isArray(b.needs) ? b.needs : []).filter(isTheme).slice(0, 8),
    members: (Array.isArray(b.members) ? b.members : []).slice(0, 60).map((m: any) => ({ name: str(m?.name, 40), note: str(m?.note, 400) })).filter((m: Member) => m.name),
    sessions: (Array.isArray(b.sessions) ? b.sessions : []).slice(-100).filter((s: any) => MODULES.some((m) => m.id === s?.moduleId))
      .map((s: any) => ({ moduleId: s.moduleId, at: Number(s.at) || Date.now(), attended: (Array.isArray(s.attended) ? s.attended : []).map((a: unknown) => str(a, 40)).filter(Boolean).slice(0, 60), feedback: str(s.feedback, 800) })),
  };
}
