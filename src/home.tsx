import { BookOpenCheck, Flame, MessagesSquare, Sprout, Target } from "lucide-react";
import { useState } from "react";
import { AUDIENCES, THEMES } from "../shared/content";
import { MODULES } from "../shared/curriculum";
import { AreaChart } from "./charts";
import { DEMO, Failed, Loading, Mascot, api, useApp, useData, useL, useT } from "./core";
import { InstallButton } from "./main";

export type LearnData = {
  progress: { module_id: string; score: number }[]; circles: { id: number; name: string; topic: string; members: number }[];
  activity: { day: string; n: number }[]; plan: { moduleId: string; theme: string; gap: number; order: number; day: number; voice: number }[];
};

export function HomePage() {
  const { me, go } = useApp();
  const L = useL(), T = useT();
  const { data, failed, reload } = useData<LearnData>("/learn");
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  const done = data.progress.filter((p) => p.module_id !== "roleplay");
  const avg = done.length ? Math.round(done.reduce((a, p) => a + p.score, 0) / done.length) : 0;
  const days = data.activity.filter((a) => a.n > 0).length;
  const next = data.plan.find((p) => !done.some((d) => d.module_id === p.moduleId));
  const nextM = MODULES.find((m) => m.id === next?.moduleId);
  const listening = me!.intakeStep < me!.intakeTotal;
  const stats = [
    { icon: BookOpenCheck, n: `${done.length}/${MODULES.length}`, name: L("Masomo", "Lessons"), tone: "lilac" },
    { icon: Target, n: `${avg}%`, name: L("Wastani wa majaribio", "Quiz average"), tone: "pink" },
    { icon: Flame, n: `${days}/7`, name: L("Siku za kujifunza", "Learning days"), tone: "mint" },
    { icon: MessagesSquare, n: data.circles.length, name: L("Makundi yangu", "My circles"), tone: "butter" },
  ];
  return (
    <div className="page">
      <h1>{L("Habari", "Hello")}, {me!.name.split(" ")[0]}!</h1>
      <p className="muted lead">{L("Tujifunze pamoja leo.", "Let's learn together today.")}</p>
      {listening && (
        <button className="banner" onClick={() => go("chat")}><Mascot size={64} /><span><b>{L("Kwanza, tukusikilize", "First, let us listen to you")}</b><small>{L(`Maswali ${me!.intakeTotal - me!.intakeStep} yamebaki. Majibu yako yanaunda mafunzo ya jamii.`, `${me!.intakeTotal - me!.intakeStep} questions left. Your answers shape your community's training.`)}</small></span></button>
      )}
      <div className="grid4">
        {stats.map((s) => <div key={s.name} className={`stat ${s.tone}`}><s.icon size={30} aria-hidden /><div><b>{s.n}</b><span>{s.name}</span></div></div>)}
      </div>
      <div className="grid-main">
        <section className="card"><h2>{L("Shughuli za wiki hii", "This week's activity")}</h2>
          <AreaChart rows={data.activity.map((a) => ({ ...a, day: a.day.slice(5) }))} series={[{ key: "n", name: L("Shughuli", "Activity"), color: "#6250d6" }]} label={L("Shughuli za siku saba", "Activity over seven days")} />
        </section>
        <section className="card today">
          <h2>{L("Somo lijalo", "Next lesson")}</h2>
          {nextM ? <>
            <p className="big-title">{T(nextM.title)}</p>
            <p className="muted small">{nextM.minutes} {L("dakika", "minutes")} · {T(THEMES[nextM.theme])}</p>
            <button className="btn" onClick={() => go("learn")}>{L("Anza somo", "Start lesson")}</button>
          </> : <p>{L("Umemaliza masomo yote. Hongera! Sasa wafundishe wengine.", "You finished every lesson. Well done! Now teach others.")}</p>}
        </section>
      </div>
      <div className="grid-main">
        <section className="card"><h2>{L("Safari yangu ya mafunzo", "My learning journey")}</h2>
          <ol className="journey">
            {data.plan.map((p) => {
              const m = MODULES.find((x) => x.id === p.moduleId)!, d = done.find((x) => x.module_id === p.moduleId);
              return <li key={p.moduleId} data-done={!!d}><span className="dot">{d ? "✓" : p.order}</span><span>{T(m.title)}</span><b>{d ? `${d.score}%` : ""}</b></li>;
            })}
          </ol>
        </section>
        <section className="card"><h2>{L("Makundi yangu", "My circles")}</h2>
          <ul className="plain">
            {data.circles.map((c) => <li key={c.id}><button className="seat" onClick={() => go("circles")}><Sprout size={20} aria-hidden /><span><b>{c.name}</b><small>{c.members} {L("wanachama", "members")}</small></span></button></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function Profile() {
  const { me, refresh, go } = useApp();
  const L = useL(), T = useT();
  const [msg, setMsg] = useState(""), [confirm, setConfirm] = useState(false);
  const update = async (b: object) => { await api("/me", { method: "PATCH", body: b }); refresh(); setMsg(L("Imehifadhiwa", "Saved")); };
  const download = async () => {
    const data = await api("/me/export");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "jamii-learn-companion-data-yangu.json"; a.click();
  };
  return (
    <div className="page narrow">
      <h1>{L("Wasifu wangu", "My profile")}</h1>
      <section className="card stack">
        <p><b>{me!.name}</b><br /><span className="muted">{me!.phone}</span><br /><span className="muted">{me!.community ? `${me!.community.name}, ${me!.community.county}` : ""}</span></p>
        <label>{L("Kiwango cha maelezo: nieleze kama", "Explanation level: explain to me as a")}
          <select value={me!.audience} onChange={(e) => update({ audience: e.target.value })}>
            {Object.entries(AUDIENCES).map(([k, v]) => <option key={k} value={k}>{T(v)}</option>)}
          </select>
        </label>
        <InstallButton />
      </section>
      <section className="card stack">
        <h2>{L("Faragha yangu", "My privacy")}</h2>
        {!DEMO && <label className="check"><input type="checkbox" checked={me!.consentAi} onChange={(e) => update({ consentAi: e.target.checked })} /> <span>{L("Tuma maswali kwa huduma ya AI (Anthropic, nje ya Kenya)", "Send questions to the AI service (Anthropic, outside Kenya)")}</span></label>}
        <label className="check"><input type="checkbox" checked={me!.consentShare} onChange={(e) => update({ consentShare: e.target.checked })} /> <span>{L("Maneno yangu yanukuliwe bila jina katika ripoti", "Quote my words without my name in reports")}</span></label>
        {msg && <p className="muted small" role="status">{msg}</p>}
        <div className="row">
          <button className="btn ghost" onClick={download}>{L("Pakua data yangu", "Download my data")}</button>
          {!confirm && <button className="btn danger" onClick={() => setConfirm(true)}>{L("Futa akaunti yangu", "Delete my account")}</button>}
        </div>
        {confirm && <div className="safety" role="alert">
          <p>{L("Hii itafuta mazungumzo, maendeleo na michango yako yote. Haiwezi kurudishwa.", "This deletes your chats, progress and contributions. It cannot be undone.")}</p>
          <button className="btn danger" onClick={async () => { await api("/me", { method: "DELETE" }); go(""); refresh(); }}>{L("Ndiyo, futa kila kitu", "Yes, delete everything")}</button>
        </div>}
      </section>
    </div>
  );
}
