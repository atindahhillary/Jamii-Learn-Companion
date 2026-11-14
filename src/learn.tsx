import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import { ROLES, SCENES } from "../shared/content";
import { MODULES } from "../shared/curriculum";
import { Avatar, DEMO, Failed, Loading, api, useApp, useData, useL, useT } from "./core";
import type { LearnData } from "./home";
import { Land, Lesson, Trail } from "./journey";
import { Assignments } from "./assignments";
import { Listen } from "./audio";
import { Person } from "./avatars";
import { Games } from "./games";
import { Groups } from "./groups";
import { PlanBuilder } from "./plan";

function RolePlay({ onDone }: { onDone: () => void }) {
  const L = useL(), T = useT();
  const [i, setI] = useState(0), [points, setPoints] = useState(0), [picked, setPicked] = useState<number | null>(null);
  const total = SCENES.length * 3, scene = SCENES[i];
  const next = () => {
    if (i + 1 === SCENES.length) api("/learn/practice", { body: { score: Math.round((points / total) * 100) } }).catch(() => undefined);
    setI(i + 1); setPicked(null);
  };
  return (
    <div className="page narrow">
      <button className="link back" onClick={onDone}><ArrowLeft size={16} aria-hidden /> {L("Rudi", "Back")}</button>
      <h1>{L("Igizo: Mkutano wa kijiji", "Role play: The village meeting")}</h1>
      <p className="muted">{L("Chezeni pamoja. Wahusika:", "Play together. Roles:")}</p>
      <div className="roles">{ROLES.map((r, k) => <span key={k}><Person look={["elder", "mama", "moran", "kijana"][k]} size={52} /><small>{T(r)}</small></span>)}</div>
      {scene ? (
        <section className="card stack">
          <small className="muted">{i + 1}/{SCENES.length}</small>
          <p className="big-title">{T(scene.text)}</p>
          <Listen text={T(scene.text)} />
          {scene.choices.map((c, j) => (
            <button key={j} className="choice" disabled={picked != null} aria-pressed={picked === j} onClick={() => { setPicked(j); setPoints(points + c.points); }}>{T(c.text)}</button>
          ))}
          {picked != null && <><p className="note" role="status">{T(scene.choices[picked].feedback)}</p><button className="btn" onClick={next}>{L("Endelea", "Continue")}</button></>}
        </section>
      ) : (
        <section className="card stack"><p className="big-title">{points}/{total}</p><p>{L("Jadilini: uamuzi upi ulikuwa mgumu zaidi, na kwa nini?", "Discuss: which decision was hardest, and why?")}</p><button className="btn" onClick={onDone}>{L("Maliza", "Finish")}</button></section>
      )}
    </div>
  );
}

export function Learn() {
  const L = useL(), T = useT();
  const { data, failed, reload } = useData<LearnData>("/learn");
  const [open, setOpen] = useState<string | null>(null);
  const close = () => { setOpen(null); reload(); };
  const [chosen, setTab] = useState<string | null>(null), [editing, setEditing] = useState(false);
  if (open === "roleplay") return <RolePlay onDone={close} />;
  const m = MODULES.find((x) => x.id === open);
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  const inPlan = (id: string) => data.plan.some((p) => p.moduleId === id);
  const done = data.progress.filter((p) => p.module_id !== "roleplay" && inPlan(p.module_id)).length;
  // Facilitators land on their groups; everyone else on their own journey.
  const tab = chosen ?? (data.goal?.forWhom === "group" ? "groups" : "trail");
  if (m) return <Lesson key={m.id} m={m} doneBefore={done - (data.progress.some((p) => p.module_id === m.id) ? 1 : 0)} onDone={close} />;
  return (
    <div className="page">
      <h1>{data.goal ? L("Mpango wako wa kujifunza", "Your learning plan") : L("Safari yako", "Your journey")}</h1>
      <p className="muted lead">{data.goal ? L("Masomo haya yamechaguliwa kutokana na ulichotuambia unataka kujifunza. Kila somo linaeleza kwa nini liko hapa.", "These lessons were picked from what you told us you want to learn. Each one says why it is here.") : L("Tembea na Mzee Sironka kijijini Enkare. Njia hii imepangwa kutokana na maswali na wasiwasi wa jamii yako.", "Walk with Mzee Sironka through Enkare village. This path follows your community's questions and worries.")}</p>
      {editing ? <PlanBuilder start={data.goal} onCancel={() => setEditing(false)} onDone={() => { setEditing(false); reload(); }} />
        : <div className="row"><button className="btn small" onClick={() => setEditing(true)}>{data.goal ? L("Badilisha mpango wangu", "Change my plan") : L("Niambie unachotaka kujifunza", "Tell us what you want to learn")}</button></div>}
      <div className="tabs" role="tablist">
        {[["trail", L("Safari", "Journey")], ["work", L("Kazi zangu", "Assignments")], ["groups", L("Makundi ninayofundisha", "Groups I teach")]].map(([id, n]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{n}</button>)}
      </div>
      {tab === "work" && <Assignments />}
      {tab === "groups" && <Groups />}
      {tab === "trail" && <>
      <section className="card land-card"><Land done={done} total={data.plan.length} /><p className="land-note"><b>{L("Ardhi yako", "Your land")}</b> · {L(`miti ${done} kati ya ${data.plan.length}`, `${done} of ${data.plan.length} trees`)}</p></section>
      <Trail plan={data.plan} done={data.progress} onOpen={setOpen} onPlay={() => setOpen("roleplay")} />
      </>}
    </div>
  );
}

// Tools is the home of every game: ready-made ones and ones made from a lesson or your own content.
export function Tools() {
  const L = useL();
  return (
    <div className="page">
      <h1>{L("Michezo", "Games")}</h1>
      <p className="muted lead">{L("Cheza michezo iliyo tayari, au geuza somo au maudhui yako mwenyewe kuwa mchezo, kwa Kiswahili, Kiingereza au Maa.", "Play a ready-made game, or turn a lesson or your own content into a game, in Kiswahili, English or Maa.")}</p>
      <Games />
    </div>
  );
}

export function Circles() {
  const { me } = useApp();
  const L = useL();
  const isAdmin = me!.role === "admin";
  const { data, failed, reload } = useData<any>(isAdmin ? "/admin/circles" : "/learn");
  const circles: { id: number; name: string; topic: string; members: number }[] = isAdmin ? data : data?.circles;
  const [open, setOpen] = useState<number | null>(null);
  const cur = open ?? circles?.[0]?.id ?? null;
  const posts = useData<any[]>(cur ? `/circles/${cur}/posts` : "/me", [cur]);
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(false);
  if (failed) return <Failed retry={reload} />;
  if (!circles) return <Loading />;
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim()) return;
    setBusy(true); setErr(false);
    try { await api(`/circles/${cur}/posts`, { body: { text } }); setText(""); await posts.reload(); } catch { setErr(true); }
    setBusy(false);
  };
  return (
    <div className="page">
      <h1>{L("Makundi ya kujifunza", "Learning circles")}</h1>
      <p className="muted lead">{L("Shirikishaneni uzoefu. Andika @msaidizi kuomba msaada wa AI.", "Share experience with peers. Type @msaidizi to call the AI.")}</p>
      <div className="circles">
        <div className="stack">{circles.map((c) => (
          <button key={c.id} className="seat card" aria-pressed={cur === c.id} onClick={() => setOpen(c.id)}><span><b>{c.name}</b><small>{c.topic}</small><small>{c.members} {L("wanachama", "members")}</small></span></button>
        ))}</div>
        <section className="card stack">
          {Array.isArray(posts.data) && posts.data.length === 0 && <p className="muted">{L("Bado hakuna ujumbe. Anza wewe!", "No posts yet. You start!")}</p>}
          <ul className="plain feed">
            {Array.isArray(posts.data) && posts.data.map((p) => (
              <li key={p.id} data-bot={p.is_bot}>
                <span className="row"><Avatar name={p.is_bot ? "Mzee Sironka" : p.author} size={32} /><b>{p.is_bot ? L("Mzee Sironka (AI)", "Mzee Sironka (AI)") : p.author}</b></span><p>{p.body}</p>
                {isAdmin && <button className="link" onClick={async () => { await api(`/admin/posts/${p.id}/hide`, { method: "POST" }); posts.reload(); }}>{L("Ficha", "Hide")}</button>}
              </li>
            ))}
          </ul>
          {!isAdmin && <form className="composer" onSubmit={send}>
            <label className="sr" htmlFor="post">{L("Andika ujumbe kwa kundi", "Write to the circle")}</label>
            <input id="post" value={text} onChange={(e) => setText(e.target.value)} maxLength={800} placeholder={L("Shiriki uzoefu wako...", "Share your experience...")} />
            <button className="send" disabled={busy} aria-label={L("Tuma", "Send")}><Send size={20} aria-hidden /></button>
          </form>}
          {err && <p className="error" role="alert">{L("Haikutumwa.", "Not sent.")}</p>}
        </section>
      </div>
    </div>
  );
}
