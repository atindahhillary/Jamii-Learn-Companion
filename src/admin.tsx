import { Flag, MessageSquareText, Printer, Search, Sprout, Users } from "lucide-react";
import { useState } from "react";
import { AUDIENCES, THEMES, type Audience, type Theme } from "../shared/content";
import { MODULES } from "../shared/curriculum";
import { AreaChart, Bars, Donut } from "./charts";
import { Avatar, DEMO, Failed, Loading, api, useData, useL, useT } from "./core";
import { demoCsv } from "./demo";

const STAGE_COLORS: Record<string, string> = { listening: "#eda100", started: "#e8743a", learning: "#0f7a4b", completed: "#2a78d6" };

export function Admin() {
  const L = useL(), T = useT();
  const [tab, setTab] = useState("overview");
  const tabs = [["overview", L("Muhtasari", "Overview")], ["learners", L("Washiriki", "Learners")], ["report", L("Ripoti", "Report")], ["flags", L("Ubora wa AI", "AI quality")]];
  const o = useData<any>("/admin/overview");
  const report = useData<any>("/admin/report");
  const people = useData<any[]>("/admin/learners");
  const flags = useData<any[]>("/admin/flags");
  const [search, setSearch] = useState("");
  if (o.failed) return <Failed retry={o.reload} />;
  if (!o.data || !report.data) return <Loading />;
  const c = o.data.counts, r = report.data;
  const stageName: Record<string, string> = { listening: L("Kusikilizwa", "Listening"), started: L("Ameanza", "Started"), learning: L("Anajifunza", "Learning"), completed: L("Amemaliza", "Completed") };
  const parts = ["listening", "started", "learning", "completed"].map((s) => ({ name: stageName[s], value: o.data.stages.find((x: any) => x.stage === s)?.n ?? 0, color: STAGE_COLORS[s] }));
  const completion = c.learners ? Math.round(((parts[3].value + parts[2].value) / c.learners) * 100) : 0;
  const kpis = [
    { n: c.learners, name: L("Washiriki", "Learners"), icon: Users, tone: "k1" },
    { n: c.active, name: L("Hai siku 7", "Active 7 days"), icon: Sprout, tone: "k2" },
    { n: c.insights, name: L("Mawazo yaliyokusanywa", "Voices collected"), icon: MessageSquareText, tone: "k3" },
    { n: c.flags, name: L("Majibu yaliyoripotiwa", "Reported answers"), icon: Flag, tone: "k4" },
  ];
  const q = search.toLowerCase();
  return (
    <div className="page">
      <div className="row-between wrap"><h1>{L("Dashibodi ya mafunzo", "Learning dashboard")}</h1>
        <div className="tabs" role="tablist">{tabs.map(([id, n]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{n}</button>)}</div>
      </div>
      {tab === "overview" && <>
        <div className="grid4">{kpis.map((k) => <div key={k.name} className={`kpi ${k.tone}`}><span className="kpi-icon"><k.icon size={24} aria-hidden /></span><div><b>{k.n}</b><span>{k.name}</span></div></div>)}</div>
        <div className="grid-main">
          <section className="card"><h2>{L("Ushiriki wa siku 14", "Participation, 14 days")}</h2>
            <p className="hero-num"><b>{c.web + c.wa}</b> <span className="muted small">{L("ujumbe", "messages")} · {c.web} {L("wavuti", "web")} · {c.wa} WhatsApp</span></p>
            <AreaChart rows={o.data.activity} series={[{ key: "messages", name: L("Ujumbe", "Messages"), color: "#0f7a4b" }, { key: "lessons", name: L("Masomo", "Lessons"), color: "#e8743a" }]} label={L("Ujumbe na masomo kwa siku", "Messages and lessons per day")} />
          </section>
          <section className="card"><h2>{L("Hatua za safari", "Journey stages")}</h2>
            <Donut parts={parts} center={`${completion}%`} sub={L("wanajifunza", "learning")} label={L("Washiriki kwa hatua", "Learners by stage")} />
          </section>
        </div>
        <div className="grid-main">
          <section className="card"><h2>{L("Mapengo ya maarifa", "Knowledge gaps")}</h2>
            <p className="muted small">{L("Juu zaidi = uhitaji mkubwa. Inachanganya wasiwasi wa watu (40%) na matokeo ya majaribio (60%).", "Higher means more need. Blends what people raise (40%) with quiz results (60%).")}</p>
            <Bars rows={[...r.gaps].sort((a: any, b: any) => b.gap - a.gap).map((g: any) => ({ name: T(THEMES[g.theme as Theme]), value: g.gap, note: `${g.voice} ${L("sauti", "voices")} · ${L("umahiri", "mastery")} ${g.mastery}%` }))} />
          </section>
          <section className="card"><h2>{L("Jamii", "Communities")}</h2>
            <ul className="plain">{r.communities.map((x: any) => <li key={x.name} className="row-between line"><span>{x.name}<small className="muted block">{x.county}</small></span><b>{x.n}</b></li>)}</ul>
          </section>
        </div>
      </>}
      {tab === "learners" && <section className="card">
        <div className="row-between wrap"><h2>{L("Washiriki wote", "All learners")}</h2>
          <label className="search"><Search size={16} aria-hidden /><span className="sr">{L("Tafuta", "Search")}</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L("Tafuta...", "Search...")} /></label></div>
        {!people.data ? <Loading /> : <div className="table"><table>
          <thead><tr><th>{L("Jina", "Name")}</th><th>{L("Jamii", "Community")}</th><th>{L("Jukumu", "Role")}</th><th>{L("Simu", "Phone")}</th><th>{L("Masomo", "Lessons")}</th><th>{L("Wastani", "Average")}</th><th>{L("Mara ya mwisho", "Last seen")}</th></tr></thead>
          <tbody>{people.data.filter((p) => !q || `${p.name} ${p.community} ${p.village}`.toLowerCase().includes(q)).map((p) => (
            <tr key={p.id}>
              <td><span className="row"><Avatar name={p.name} size={30} />{p.name}</span></td><td>{p.community ?? "-"}<small className="muted block">{p.village}</small></td>
              <td>{T(AUDIENCES[p.audience as Audience])}</td><td className="mono">{p.phone}</td><td>{p.modules}/{MODULES.length}</td><td>{p.avg_score ?? "-"}{p.avg_score != null && "%"}</td><td>{p.last_seen ? new Date(p.last_seen).toLocaleDateString() : "-"}</td>
            </tr>))}</tbody>
        </table></div>}
      </section>}
      {tab === "report" && <Report r={r} />}
      {tab === "flags" && <section className="card">
        <h2>{L("Majibu yaliyoripotiwa", "Reported answers")}</h2>
        <p className="muted small">{L("Watu waliripoti majibu haya kama si sahihi. Yakague na urekebishe maudhui.", "People marked these answers as wrong. Review them and correct the content.")}</p>
        {flags.data?.length === 0 && <p>{L("Hakuna ripoti kwa sasa.", "Nothing reported right now.")}</p>}
        <ul className="plain">{flags.data?.map((f) => <li key={f.id} className="line stack-sm"><p>{f.body}</p><button className="btn small ghost" onClick={async () => { await api(`/admin/flags/${f.id}/resolve`, { method: "POST" }); flags.reload(); o.reload(); }}>{L("Imeshughulikiwa", "Mark resolved")}</button></li>)}</ul>
      </section>}
    </div>
  );
}

function Report({ r }: { r: any }) {
  const L = useL(), T = useT();
  return (
    <section className="card report">
      <div className="row-between wrap no-print">
        <h2>{L("Ripoti ya jamii na mpango wa mafunzo", "Community report and training plan")}</h2>
        <span className="row">
          <button className="btn small ghost" onClick={() => print()}><Printer size={16} aria-hidden /> {L("Chapisha / PDF", "Print / PDF")}</button>
          <a className="btn small ghost" href={DEMO ? `data:text/csv;charset=utf-8,${encodeURIComponent(demoCsv())}` : "/api/admin/report.csv"} download="jamii-learn-companion-report.csv">CSV</a>
        </span>
      </div>
      <p className="muted small">{L("Imetolewa", "Generated")} {new Date(r.generatedAt).toLocaleString()} · {r.sentiment.total} {L("michango", "contributions")}</p>
      <h3>{L("Tulichosikia", "What we heard")}</h3>
      <div className="grid4 mini">
        {[["idea", L("Mawazo", "Ideas")], ["knowledge", L("Maarifa", "Knowledge")], ["concern", L("Wasiwasi", "Concerns")], ["question", L("Maswali", "Questions")]].map(([k, n]) => <div key={k}><b>{r.kinds[k]}</b><span>{n}</span></div>)}
      </div>
      <h3>{L("Mpango wa mafunzo uliopendekezwa", "Recommended training plan")}</h3>
      <div className="table"><table>
        <thead><tr><th>#</th><th>{L("Somo", "Module")}</th><th>{L("Siku", "Day")}</th><th>{L("Pengo", "Gap")}</th><th>{L("Sababu", "Why")}</th></tr></thead>
        <tbody>{r.curriculum.map((c: any) => <tr key={c.moduleId}><td>{c.order}</td><td>{T(MODULES.find((m) => m.id === c.moduleId)!.title)}</td><td>{c.day}</td><td>{c.gap}</td><td>{c.moduleId === "m1" ? L("Msingi wa masomo mengine", "Foundation for the rest") : `${c.voice} ${L("sauti", "voices")}, ${L("umahiri", "mastery")} ${c.mastery}%`}</td></tr>)}</tbody>
      </table></div>
      <h3>{L("Sauti za jamii", "Community voices")}</h3>
      <p className="muted small">{L(`Bila majina, kwa ridhaa tu, na kwa makundi ya watu 5 au zaidi. Maarifa ya jadi hayanukuliwi hapa.`, "No names, with consent only, from groups of 5 or more. Traditional knowledge is not quoted here.")}</p>
      {r.voices.length === 0 && <p>{L("Bado hakuna nukuu zinazoruhusiwa.", "No quotes can be shown yet.")}</p>}
      <ul className="quotes">{r.voices.map((v: any, i: number) => <li key={i}>"{v.body}"<small className="muted block">{T(THEMES[v.theme as Theme])}</small></li>)}</ul>
      <p className="muted small">{L("Mapendekezo haya yanatokana na kanuni zinazoonekana, si uamuzi wa mwisho. Yajadiliwe na jamii.", "These recommendations come from visible rules, not a final decision. Discuss them with the community.")}</p>
    </section>
  );
}
