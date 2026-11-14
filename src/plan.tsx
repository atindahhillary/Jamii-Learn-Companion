import { Check } from "lucide-react";
import { useState } from "react";
import { THEMES, type Theme } from "../shared/content";
import type { Goal, Level } from "../shared/plan";
import { Mascot, api, useL, useT } from "./core";

// "Help me get started": a few tap-to-answer questions, then a plan made from the answers.
export function PlanBuilder({ start, onDone, onCancel }: { start?: Goal | null; onDone: (g: Goal, groupName: string) => void; onCancel?: () => void }) {
  const L = useL(), T = useT();
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState(false);
  const [g, setG] = useState<Goal>(start ?? { forWhom: "me", themes: [], level: "new", minutes: 20, note: "" });
  const [group, setGroup] = useState({ name: "", members: "" });
  const set = (x: Partial<Goal>) => setG({ ...g, ...x });
  const toggle = (t: Theme) => set({ themes: g.themes.includes(t) ? g.themes.filter((x) => x !== t) : [...g.themes, t] });
  const asks = [
    L("Unajifunza kwa ajili ya nani?", "Who are you learning for?"),
    L("Ungependa kujifunza nini? Chagua yoyote, au andika kwa maneno yako.", "What would you like to learn? Pick any, or write it in your own words."),
    L("Unajua kiasi gani tayari?", "How much do you know already?"),
    g.forWhom === "group" ? L("Kundi lako: jina na wanachama", "Your group: name and members") : L("Una muda gani kila wiki?", "How much time do you have each week?"),
  ];
  const last = asks.length - 1;
  const finish = async () => {
    setBusy(true); setErr(false);
    try {
      await api("/plan", { body: g });
      if (g.forWhom === "group" && group.name.trim()) {
        await api("/groups", { body: { name: group.name, needs: g.themes, note: g.note, members: group.members.split(/[,\n]/).map((n) => ({ name: n.trim(), note: "" })).filter((m) => m.name), sessions: [] } });
      }
      onDone(g, group.name.trim());
    } catch { setErr(true); }
    setBusy(false);
  };
  const pick = (on: boolean, label: string, click: () => void, key?: string) => <button key={key ?? label} type="button" className="choice" aria-pressed={on} onClick={click}>{on && <Check size={15} aria-hidden />} {label}</button>;
  return (
    <section className="card stack planner" aria-label={L("Mpango wangu wa kujifunza", "My learning plan")}>
      <div className="line-row guide"><Mascot size={44} /><div className="bubble"><small className="muted">{step + 1}/{asks.length}</small><p>{asks[step]}</p></div></div>
      {step === 0 && <div className="stack">
        {pick(g.forWhom === "me", L("Mimi mwenyewe", "Myself"), () => set({ forWhom: "me" }))}
        {pick(g.forWhom === "group", L("Kundi au jamii ninayoifundisha (mkufunzi)", "A group or community I teach (facilitator)"), () => set({ forWhom: "group", minutes: 60 }))}
      </div>}
      {step === 1 && <>
        <div className="chips wrap">{(Object.keys(THEMES) as Theme[]).map((t) => pick(g.themes.includes(t), T(THEMES[t]), () => toggle(t), t))}</div>
        <label>{L("Kwa maneno yako (si lazima)", "In your own words (optional)")}<textarea rows={3} maxLength={600} value={g.note} onChange={(e) => set({ note: e.target.value })} placeholder={L("Mfano: tunataka kujua mgao wa pesa na kama tunaweza kukataa mradi", "For example: we want to understand the money share and whether we can refuse a project")} /></label>
      </>}
      {step === 2 && <div className="stack">
        {([["new", L("Mpya kabisa", "Completely new")], ["some", L("Nimesikia kidogo", "I have heard a little")], ["deep", L("Najua, nataka undani", "I know it, I want depth")]] as [Level, string][]).map(([v, n]) => pick(g.level === v, n, () => set({ level: v }), v))}
      </div>}
      {step === 3 && g.forWhom === "me" && <div className="chips wrap">
        {[10, 20, 40, 60].map((m) => pick(g.minutes === m, L(`Dakika ${m}`, `${m} minutes`), () => set({ minutes: m }), String(m)))}
      </div>}
      {step === 3 && g.forWhom === "group" && <div className="stack">
        <label>{L("Jina la kundi", "Group name")}<input value={group.name} maxLength={60} onChange={(e) => setGroup({ ...group, name: e.target.value })} placeholder={L("Mfano: Wanawake wa Kijiji 2", "For example: Village 2 women")} /></label>
        <label>{L("Wanachama (tenganisha kwa koma, si lazima)", "Members (separate with commas, optional)")}<textarea rows={2} value={group.members} onChange={(e) => setGroup({ ...group, members: e.target.value })} /></label>
        <label>{L("Muda wa kila kikao", "Time for each session")}<select value={g.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>{[30, 60, 90, 120].map((m) => <option key={m} value={m}>{L(`Dakika ${m}`, `${m} minutes`)}</option>)}</select></label>
        <p className="muted small">{L("Usiandike nambari za simu wala vitambulisho vya wanachama.", "Do not write members' phone or ID numbers.")}</p>
      </div>}
      {err && <p className="error" role="alert">{L("Haikuhifadhiwa. Jaribu tena.", "Not saved. Try again.")}</p>}
      <div className="row">
        {step > 0 ? <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>{L("Rudi", "Back")}</button> : onCancel && <button type="button" className="btn ghost" onClick={onCancel}>{L("Sio sasa", "Not now")}</button>}
        {step < last ? <button type="button" className="btn" onClick={() => setStep(step + 1)}>{L("Endelea", "Next")}</button>
          : <button type="button" className="btn" disabled={busy} onClick={finish}>{L("Tengeneza mpango wangu", "Make my plan")}</button>}
      </div>
    </section>
  );
}
