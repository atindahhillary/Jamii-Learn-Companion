import { Check } from "lucide-react";
import { useState } from "react";
import { THEMES, type Theme } from "../shared/content";
import { LANGUAGES, LIVELIHOODS, emptyProfile, type Goal, type Level, type Profile } from "../shared/plan";
import { Mascot, api, useL, useT } from "./core";

type StepId = "who" | "community" | "voices" | "topics" | "level" | "time" | "group";

// "Help me get started". A facilitator first describes the community, then what to learn;
// the journey is built from both. A learner on their own skips the community questions.
export function PlanBuilder({ start, onDone, onCancel }: { start?: Goal | null; onDone: (g: Goal, groupName: string) => void; onCancel?: () => void }) {
  const L = useL(), T = useT();
  const [i, setI] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState(false);
  const [g, setG] = useState<Goal>(start ?? { forWhom: "group", themes: [], level: "new", minutes: 60, note: "" });
  const [group, setGroup] = useState({ name: "", members: "" }), [p, setP] = useState<Profile>(emptyProfile());
  const set = (x: Partial<Goal>) => setG({ ...g, ...x });
  const setProf = (x: Partial<Profile>) => setP({ ...p, ...x });
  const flip = <X,>(list: X[], x: X) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const steps: StepId[] = g.forWhom === "group" ? ["who", "community", "voices", "topics", "level", "group"] : ["who", "topics", "level", "time"];
  const step = steps[Math.min(i, steps.length - 1)], last = i >= steps.length - 1;
  const asks: Record<StepId, string> = {
    who: L("Unajifunza kwa ajili ya nani?", "Who are you learning for?"),
    community: L("Kwanza, tuijue jamii. Iko wapi, inazungumza lugha gani, na inaishije?", "First, let us get to know the community. Where is it, which languages does it speak, and how does it make a living?"),
    voices: L("Jamii inasema nini? Andika kwa maneno yao, bila majina ya watu.", "What is the community saying? Use their words, without people's names."),
    topics: g.forWhom === "group" ? L("Ungependa kundi lijifunze nini? Tumeongeza tayari mahitaji tuliyoyaona.", "What should the group learn? We will add the needs we already picked up.") : L("Ungependa kujifunza nini? Chagua yoyote, au andika kwa maneno yako.", "What would you like to learn? Pick any, or write it in your own words."),
    level: g.forWhom === "group" ? L("Kundi linajua kiasi gani tayari?", "How much does the group know already?") : L("Unajua kiasi gani tayari?", "How much do you know already?"),
    time: L("Una muda gani kila wiki?", "How much time do you have each week?"),
    group: L("Mwisho: jina la kundi, wanachama na muda wa kikao", "Last: group name, members and session length"),
  };
  const finish = async () => {
    setBusy(true); setErr(false);
    try {
      await api("/plan", { body: g });
      if (g.forWhom === "group") {
        await api("/groups", { body: { name: group.name.trim() || p.place || L("Kundi langu", "My group"), needs: g.themes, note: g.note, profile: p, members: group.members.split(/[,\n]/).map((n) => ({ name: n.trim(), note: "" })).filter((m) => m.name), sessions: [] } });
      }
      onDone(g, g.forWhom === "group" ? group.name.trim() || p.place || L("Kundi langu", "My group") : "");
    } catch { setErr(true); }
    setBusy(false);
  };
  const pick = (on: boolean, label: string, click: () => void, key?: string) => <button key={key ?? label} type="button" className="choice" aria-pressed={on} onClick={click}>{on && <Check size={15} aria-hidden />} {label}</button>;
  return (
    <section className="card stack planner" aria-label={L("Mpango wa kujifunza", "Learning plan")}>
      <div className="line-row guide"><Mascot size={44} /><div className="bubble"><small className="muted">{i + 1}/{steps.length}</small><p>{asks[step]}</p></div></div>
      {step === "who" && <div className="stack">
        {pick(g.forWhom === "group", L("Jamii au kundi ninalofundisha (mkufunzi au mwanafunzi wa jamii)", "A community or group I teach (facilitator or community intern)"), () => set({ forWhom: "group", minutes: 60 }))}
        {pick(g.forWhom === "me", L("Mimi mwenyewe", "Myself"), () => set({ forWhom: "me", minutes: 20 }))}
      </div>}
      {step === "community" && <div className="stack">
        <label>{L("Mahali (kijiji, kata au kaunti)", "Place (village, ward or county)")}<input value={p.place} maxLength={80} onChange={(e) => setProf({ place: e.target.value })} placeholder={L("Mfano: Kijiji 2, Kajiado", "For example: Village 2, Kajiado")} /></label>
        <fieldset className="chips wrap"><legend className="small muted">{L("Lugha za jamii", "Community languages")}</legend>{LANGUAGES.map((x) => pick(p.languages.includes(x), x, () => setProf({ languages: flip(p.languages, x) }), x))}</fieldset>
        <fieldset className="chips wrap"><legend className="small muted">{L("Riziki", "Livelihoods")}</legend>{LIVELIHOODS.map((x) => pick(p.livelihoods.includes(x.id), T(x.name), () => setProf({ livelihoods: flip(p.livelihoods, x.id) }), x.id))}</fieldset>
        <fieldset className="chips wrap"><legend className="small muted">{L("Je, kuna mradi wa kaboni uliokuja tayari?", "Has a carbon project already approached them?")}</legend>
          {([["yes", L("Ndiyo", "Yes")], ["no", L("Hapana", "No")], ["unsure", L("Sina uhakika", "Not sure")]] as const).map(([v, n]) => pick(p.project === v, n, () => setProf({ project: v }), v))}
        </fieldset>
      </div>}
      {step === "voices" && <div className="stack">
        <label>{L("Wamesikia nini kuhusu kaboni?", "What have they heard about carbon?")}<textarea rows={2} maxLength={600} value={p.heard} onChange={(e) => setProf({ heard: e.target.value })} /></label>
        <label>{L("Wasiwasi wao ni upi?", "What worries them?")}<textarea rows={2} maxLength={600} value={p.worries} onChange={(e) => setProf({ worries: e.target.value })} placeholder={L("Mfano: pesa hazitafika kwa wote, tutazuiwa kuchunga", "For example: the money will not reach everyone, we will be stopped from grazing")} /></label>
        <label>{L("Nani huamua kuhusu ardhi?", "Who decides about land?")}<textarea rows={2} maxLength={400} value={p.decides} onChange={(e) => setProf({ decides: e.target.value })} /></label>
      </div>}
      {step === "topics" && <>
        <div className="chips wrap">{(Object.keys(THEMES) as Theme[]).map((t) => pick(g.themes.includes(t), T(THEMES[t]), () => set({ themes: flip(g.themes, t) }), t))}</div>
        <label>{L("Kwa maneno yako (si lazima)", "In your own words (optional)")}<textarea rows={3} maxLength={600} value={g.note} onChange={(e) => set({ note: e.target.value })} placeholder={L("Mfano: tunataka kujua mgao wa pesa na kama tunaweza kukataa mradi", "For example: we want to understand the money share and whether we can refuse a project")} /></label>
      </>}
      {step === "level" && <div className="stack">
        {([["new", L("Mpya kabisa", "Completely new")], ["some", L("Wamesikia kidogo", "Heard a little")], ["deep", L("Wanajua, wanataka undani", "Know it, want depth")]] as [Level, string][]).map(([v, n]) => pick(g.level === v, n, () => set({ level: v }), v))}
      </div>}
      {step === "time" && <div className="chips wrap">
        {[10, 20, 40, 60].map((m) => pick(g.minutes === m, L(`Dakika ${m}`, `${m} minutes`), () => set({ minutes: m }), String(m)))}
      </div>}
      {step === "group" && <div className="stack">
        <label>{L("Jina la kundi", "Group name")}<input value={group.name} maxLength={60} onChange={(e) => setGroup({ ...group, name: e.target.value })} placeholder={L("Mfano: Wanawake wa Kijiji 2", "For example: Village 2 women")} /></label>
        <label>{L("Wanachama (tenganisha kwa koma, si lazima)", "Members (separate with commas, optional)")}<textarea rows={2} value={group.members} onChange={(e) => setGroup({ ...group, members: e.target.value })} /></label>
        <label>{L("Muda wa kila kikao", "Time for each session")}<select value={g.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>{[30, 60, 90, 120].map((m) => <option key={m} value={m}>{L(`Dakika ${m}`, `${m} minutes`)}</option>)}</select></label>
        <p className="muted small">{L("Usiandike nambari za simu wala vitambulisho vya wanachama.", "Do not write members' phone or ID numbers.")}</p>
      </div>}
      {err && <p className="error" role="alert">{L("Haikuhifadhiwa. Jaribu tena.", "Not saved. Try again.")}</p>}
      <div className="row">
        {i > 0 ? <button type="button" className="btn ghost" onClick={() => setI(i - 1)}>{L("Rudi", "Back")}</button> : onCancel && <button type="button" className="btn ghost" onClick={onCancel}>{L("Sio sasa", "Not now")}</button>}
        {!last ? <button type="button" className="btn" onClick={() => setI(i + 1)}>{L("Endelea", "Next")}</button>
          : <button type="button" className="btn" disabled={busy} onClick={finish}>{g.forWhom === "group" ? L("Tengeneza safari ya jamii", "Build the community journey") : L("Tengeneza mpango wangu", "Make my plan")}</button>}
      </div>
    </section>
  );
}
