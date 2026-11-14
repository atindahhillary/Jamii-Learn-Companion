import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { THEMES, type Theme } from "../shared/content";
import { MODULES } from "../shared/curriculum";
import { LANGUAGES, LIVELIHOODS, emptyProfile, groupNeeds, groupPlan, groupProgress, type Group, type Profile } from "../shared/plan";
import { Failed, Loading, api, useData, useL, useT } from "./core";

type PlanData = { groups: Group[]; gaps: { moduleId: string; gap: number }[] };

// The facilitator's view: each group's needs, a session plan built from them, and feedback for the group and each member.
export function Groups() {
  const L = useL();
  const { data, failed, reload } = useData<PlanData>("/plan");
  const [open, setOpen] = useState<string | null>(null), [name, setName] = useState("");
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  const g = data.groups.find((x) => x.id === open);
  if (g) return <GroupView key={g.id} g={g} gaps={data.gaps} onBack={() => { setOpen(null); reload(); }} onSaved={reload} />;
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const made = await api<Group>("/groups", { body: { name, members: [], needs: [], note: "", sessions: [] } });
    setName(""); await reload(); setOpen(made.id);
  };
  return (
    <div className="stack">
      <p className="muted">{L("Kwa wakufunzi na wanafunzi wa jamii: fuatilia kila kundi, mahitaji yao, vikao na maoni. Mpango wa vikao unabadilika kadri unavyoandika.", "For facilitators and community interns: track each group, its needs, sessions and feedback. The session plan changes as you write notes.")}</p>
      <Dashboard groups={data.groups} gaps={data.gaps} />
      <div className="lessons">
        {data.groups.map((x) => {
          const pr = groupProgress(x, data.gaps);
          return <button key={x.id} className="game card group-card" onClick={() => setOpen(x.id)}><span className="grow"><b>{x.name}</b><small className="muted">{x.profile?.place || ""}{x.profile?.place ? " · " : ""}{x.members.length} {L("wanachama", "members")}</small>
            <Bar percent={pr.percent} label={L(`Masomo ${pr.covered} kati ya ${pr.planned}`, `${pr.covered} of ${pr.planned} lessons`)} /></span></button>;
        })}
      </div>
      <form className="row" onSubmit={add}>
        <label className="grow">{L("Kundi jipya", "New group")}<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={L("Jina la kundi", "Group name")} /></label>
        <button className="btn"><Plus size={17} aria-hidden /> {L("Ongeza", "Add")}</button>
      </form>
    </div>
  );
}

const Bar = ({ percent, label }: { percent: number; label: string }) => (
  <span className="bar-wrap"><span className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}><i style={{ width: `${percent}%` }} /></span><small className="muted">{label}</small></span>
);

// Across all groups: what a facilitator or supervisor looks at first.
export function Dashboard({ groups, gaps }: { groups: Group[]; gaps: PlanData["gaps"] }) {
  const L = useL();
  if (!groups.length) return null;
  const all = groups.map((g) => groupProgress(g, gaps));
  const members = all.reduce((n, p) => n + p.members, 0), reached = all.reduce((n, p) => n + p.reached, 0);
  const att = all.filter((p) => p.attendance != null);
  const tiles = [
    [String(groups.length), L("Makundi", "Groups")],
    [`${reached}/${members}`, L("Wanachama waliofikiwa", "Members reached")],
    [String(all.reduce((n, p) => n + p.sessions, 0)), L("Vikao vilivyofanyika", "Sessions held")],
    [`${Math.round(all.reduce((n, p) => n + p.percent, 0) / all.length)}%`, L("Wastani wa safari", "Average journey done")],
    [att.length ? `${Math.round(att.reduce((n, p) => n + (p.attendance ?? 0), 0) / att.length)}%` : "-", L("Mahudhurio", "Attendance")],
  ];
  return <section className="card dash" aria-label={L("Dashibodi ya maendeleo", "Progress dashboard")}>
    <h3>{L("Dashibodi ya maendeleo", "Progress dashboard")}</h3>
    <div className="dash-tiles">{tiles.map(([n, t]) => <div key={t}><b>{n}</b><small>{t}</small></div>)}</div>
  </section>;
}

function GroupView({ g: start, gaps, onBack, onSaved }: { g: Group; gaps: PlanData["gaps"]; onBack: () => void; onSaved: () => void }) {
  const L = useL(), T = useT();
  const [g, setG] = useState(start), [state, setState] = useState<"" | "saved" | "error">("");
  const [log, setLog] = useState({ moduleId: "", attended: [] as string[], feedback: "" }), [member, setMember] = useState("");
  const save = async (next: Group) => {
    setG(next); setState("");
    try { setG(await api<Group>("/groups", { body: next })); setState("saved"); onSaved(); } catch { setState("error"); }
  };
  const needs = groupNeeds(g), plan = groupPlan(g, gaps), pr = groupProgress(g, gaps);
  const taught = (id: string) => g.sessions.filter((s) => s.moduleId === id);
  const nextStep = plan.find((p) => !taught(p.moduleId).length);
  return (
    <div className="stack">
      <button className="link back" onClick={onBack}><ArrowLeft size={16} aria-hidden /> {L("Makundi yote", "All groups")}</button>
      <h2>{g.name}</h2>
      {state === "error" && <p className="error" role="alert">{L("Haikuhifadhiwa.", "Not saved.")}</p>}
      {state === "saved" && <p className="muted small" role="status">{L("Imehifadhiwa", "Saved")}</p>}

      <section className="card stack">
        <h3>{L("Maendeleo", "Progress")}</h3>
        <Bar percent={pr.percent} label={L(`Masomo ${pr.covered} kati ya ${pr.planned} ya safari`, `${pr.covered} of ${pr.planned} journey lessons`)} />
        <div className="dash-tiles">
          <div><b>{pr.sessions}</b><small>{L("Vikao", "Sessions")}</small></div>
          <div><b>{pr.attendance == null ? "-" : `${pr.attendance}%`}</b><small>{L("Mahudhurio", "Attendance")}</small></div>
          <div><b>{pr.reached}/{pr.members}</b><small>{L("Wamefikiwa", "Reached")}</small></div>
          <div><b>{pr.last ? new Date(pr.last).toLocaleDateString() : "-"}</b><small>{L("Kikao cha mwisho", "Last session")}</small></div>
        </div>
      </section>

      <CommunityProfile p={g.profile ?? emptyProfile()} onSave={(profile) => save({ ...g, profile })} />

      <section className="card stack">
        <h3>{L("Mahitaji ya kundi", "Group needs")}</h3>
        <div className="chips wrap">{(Object.keys(THEMES) as Theme[]).map((t) => (
          <button key={t} className="choice" aria-pressed={g.needs.includes(t)} onClick={() => save({ ...g, needs: g.needs.includes(t) ? g.needs.filter((x) => x !== t) : [...g.needs, t] })}>{T(THEMES[t])}</button>
        ))}</div>
        {needs.some((n) => n.from === "community") && <p className="muted small">{L("Kutoka kwa taarifa za jamii:", "From the community profile:")} {needs.filter((n) => n.from === "community").map((n) => T(THEMES[n.theme])).join(", ")}</p>}
        {needs.some((n) => n.from === "notes") && <p className="muted small">{L("Tumeyaona pia kwenye maelezo yako:", "Also picked up from your notes:")} {needs.filter((n) => n.from === "notes").map((n) => T(THEMES[n.theme])).join(", ")}</p>}
        <label>{L("Maelezo kuhusu kundi", "Notes about the group")}<textarea rows={3} maxLength={800} defaultValue={g.note} onBlur={(e) => e.target.value !== g.note && save({ ...g, note: e.target.value })} placeholder={L("Wanauliza nini? Wana wasiwasi gani?", "What do they ask? What worries them?")} /></label>
      </section>

      <section className="card stack">
        <h3>{L("Mpango wa vikao", "Session plan")}</h3>
        <ol className="plain session-plan">
          {plan.map((p) => {
            const m = MODULES.find((x) => x.id === p.moduleId)!, done = taught(p.moduleId);
            return <li key={p.moduleId} data-done={done.length > 0} data-next={p === nextStep}>
              <b>{p.order}. {T(m.title)}</b> <small className="muted">{p.minutes} {L("dakika", "min")} · {T(p.reason)}{done.length ? ` · ${L("Kimefundishwa", "Taught")} ${new Date(done.at(-1)!.at).toLocaleDateString()}` : ""}</small>
              {p.guide && p === nextStep && <div className="note small">
                <b>{L("Mwongozo wa mkufunzi", "Facilitator guide")}</b>{"\n"}
                {m.points.map((x) => `• ${T(x)}`).join("\n")}{"\n\n"}
                <b>{L("Shughuli", "Activity")}:</b> {T(p.guide.activity)}{"\n"}
                <b>{L("Swali la majadiliano", "Discussion question")}:</b> {T(p.guide.discuss)}
              </div>}
            </li>;
          })}
        </ol>
      </section>

      <section className="card stack">
        <h3>{L("Andika kikao", "Log a session")}</h3>
        <label>{L("Somo", "Lesson")}<select value={log.moduleId} onChange={(e) => setLog({ ...log, moduleId: e.target.value })}>
          <option value="">{L("Chagua", "Choose")}</option>
          {plan.map((p) => <option key={p.moduleId} value={p.moduleId}>{T(MODULES.find((m) => m.id === p.moduleId)!.title)}</option>)}
        </select></label>
        {g.members.length > 0 && <fieldset className="chips wrap"><legend className="small muted">{L("Waliohudhuria", "Who came")}</legend>
          {g.members.map((m) => <label key={m.name} className="check"><input type="checkbox" checked={log.attended.includes(m.name)} onChange={(e) => setLog({ ...log, attended: e.target.checked ? [...log.attended, m.name] : log.attended.filter((x) => x !== m.name) })} /> {m.name}</label>)}
        </fieldset>}
        <label>{L("Maoni kwa kundi: nini kilienda vizuri, nini kinahitaji kurudiwa?", "Feedback for the group: what went well, what needs another go?")}<textarea rows={3} maxLength={800} value={log.feedback} onChange={(e) => setLog({ ...log, feedback: e.target.value })} /></label>
        <button className="btn" disabled={!log.moduleId} onClick={() => { save({ ...g, sessions: [...g.sessions, { ...log, at: Date.now() }] }); setLog({ moduleId: "", attended: [], feedback: "" }); }}>{L("Hifadhi kikao", "Save session")}</button>
        {g.sessions.length > 0 && <ul className="plain feed">{[...g.sessions].reverse().map((s, i) => (
          <li key={i}><b>{T(MODULES.find((m) => m.id === s.moduleId)!.title)}</b> <small className="muted">{new Date(s.at).toLocaleDateString()} · {s.attended.length} {L("walihudhuria", "came")}</small>{s.feedback && <p>{s.feedback}</p>}</li>
        ))}</ul>}
      </section>

      <section className="card stack">
        <h3>{L("Wanachama na maoni binafsi", "Members and individual feedback")}</h3>
        {g.members.map((m, i) => {
          const came = g.sessions.filter((s) => s.attended.includes(m.name)).length;
          return <div key={m.name} className="member">
            <span className="row-between"><b>{m.name}</b><small className="muted">{L(`vikao ${came}`, `${came} sessions`)}</small></span>
            <textarea rows={2} maxLength={400} defaultValue={m.note} aria-label={L(`Maoni kwa ${m.name}`, `Feedback for ${m.name}`)} placeholder={L("Mahitaji yake, maendeleo, maoni yako", "Their needs, progress, your feedback")}
              onBlur={(e) => e.target.value !== m.note && save({ ...g, members: g.members.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)) })} />
          </div>;
        })}
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (member.trim() && !g.members.some((m) => m.name === member.trim())) save({ ...g, members: [...g.members, { name: member.trim(), note: "" }] }); setMember(""); }}>
          <label className="grow">{L("Ongeza mwanachama", "Add a member")}<input value={member} maxLength={40} onChange={(e) => setMember(e.target.value)} /></label>
          <button className="btn ghost"><Plus size={17} aria-hidden /> {L("Ongeza", "Add")}</button>
        </form>
      </section>

      <button className="btn danger" onClick={async () => { if (confirm(L("Futa kundi hili na kumbukumbu zake zote?", "Delete this group and all its records?"))) { await api(`/groups/${g.id}`, { method: "DELETE" }); onBack(); } }}><Trash2 size={16} aria-hidden /> {L("Futa kundi", "Delete group")}</button>
    </div>
  );
}

// Basic community knowledge, editable any time; the journey re-plans from it.
function CommunityProfile({ p, onSave }: { p: Profile; onSave: (p: Profile) => void }) {
  const L = useL(), T = useT();
  const flip = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const text = (k: "place" | "heard" | "worries" | "decides", label: string, rows = 2) => (
    <label key={k}>{label}<textarea rows={rows} maxLength={600} defaultValue={p[k]} onBlur={(e) => e.target.value !== p[k] && onSave({ ...p, [k]: e.target.value })} /></label>
  );
  return <section className="card stack">
    <h3>{L("Taarifa za jamii", "Community profile")}</h3>
    {text("place", L("Mahali", "Place"), 1)}
    <div className="chips wrap">{LANGUAGES.map((x) => <button key={x} className="choice" aria-pressed={p.languages.includes(x)} onClick={() => onSave({ ...p, languages: flip(p.languages, x) })}>{x}</button>)}</div>
    <div className="chips wrap">{LIVELIHOODS.map((x) => <button key={x.id} className="choice" aria-pressed={p.livelihoods.includes(x.id)} onClick={() => onSave({ ...p, livelihoods: flip(p.livelihoods, x.id) })}>{T(x.name)}</button>)}</div>
    <label>{L("Mradi wa kaboni umekuja?", "Has a carbon project come?")}<select value={p.project} onChange={(e) => onSave({ ...p, project: e.target.value as Profile["project"] })}>
      <option value="">-</option><option value="yes">{L("Ndiyo", "Yes")}</option><option value="no">{L("Hapana", "No")}</option><option value="unsure">{L("Sina uhakika", "Not sure")}</option>
    </select></label>
    {text("heard", L("Wamesikia nini kuhusu kaboni?", "What have they heard about carbon?"))}
    {text("worries", L("Wasiwasi wao", "Their worries"))}
    {text("decides", L("Nani huamua kuhusu ardhi?", "Who decides about land?"))}
  </section>;
}
