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
  const [tab, setTab] = useState("trail");
  if (open === "roleplay") return <RolePlay onDone={close} />;
  const m = MODULES.find((x) => x.id === open);
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  const done = data.progress.filter((p) => p.module_id !== "roleplay").length;
  if (m) return <Lesson key={m.id} m={m} doneBefore={done - (data.progress.some((p) => p.module_id === m.id) ? 1 : 0)} onDone={close} />;
  return (
    <div className="page">
      <h1>{L("Safari yako", "Your journey")}</h1>
      <p className="muted lead">{L("Tembea na Mzee Sironka kijijini Enkare. Njia hii imepangwa kutokana na maswali na wasiwasi wa jamii yako.", "Walk with Mzee Sironka through Enkare village. This path follows your community's questions and worries.")}</p>
      <div className="tabs" role="tablist">
        {[["trail", L("Safari", "Journey")], ["work", L("Kazi zangu", "Assignments")], ["games", L("Michezo", "Games")]].map(([id, n]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{n}</button>)}
      </div>
      {tab === "work" && <Assignments />}
      {tab === "games" && <Games />}
      {tab === "trail" && <>
      <section className="card land-card"><Land done={done} /><p className="land-note"><b>{L("Ardhi yako", "Your land")}</b> · {L(`miti ${done} kati ya ${MODULES.length}`, `${done} of ${MODULES.length} trees`)}</p></section>
      <Trail plan={data.plan} done={data.progress} onOpen={setOpen} onPlay={() => setOpen("roleplay")} />
      </>}
    </div>
  );
}

export function Tools() {
  const { me } = useApp();
  const L = useL();
  const [doc, setDoc] = useState(""), [review, setReview] = useState<any>(null), [busy, setBusy] = useState(false);
  const [text, setText] = useState(""), [to, setTo] = useState<"sw" | "en">("en"), [out, setOut] = useState<any>(null);
  return (
    <div className="page">
      <h1>{L("Zana za jamii", "Community tools")}</h1>
      <div className="grid2">
        <section className="card stack">
          <h2>{L("Kagua mkataba", "Review a contract")}</h2>
          <p className="muted small">{L("Bandika maandishi. Zana inakupa maswali ya kuuliza, si uamuzi. Ondoa majina na nambari za watu kwanza.", "Paste the text. The tool gives questions to ask, not a decision. Remove people's names and numbers first.")}</p>
          <label className="sr" htmlFor="doc">{L("Maandishi ya mkataba", "Contract text")}</label>
          <textarea id="doc" rows={9} value={doc} onChange={(e) => setDoc(e.target.value)} maxLength={12000} />
          <button className="btn" disabled={busy || !doc.trim()} onClick={async () => { setBusy(true); setReview(await api("/tools/review", { body: { text: doc } }).catch(() => null)); setBusy(false); }}>{L("Kagua", "Review")}</button>
          {review && <div role="status">
            {review.summary && <p className="note">{review.summary}</p>}
            <h3>{L("Maswali ya kuuliza", "Questions to ask")} ({review.flags.length})</h3>
            <ul className="flags">{review.flags.map((f: any) => <li key={f.id}><b>{f.title}</b>{f.ask}</li>)}</ul>
            {review.flags.length === 0 && <p className="muted small">{L("Hakuna alama zilizopatikana. Hii haimaanishi mkataba ni salama.", "No flags found. This does not mean the contract is safe.")}</p>}
            <h3>{L("Haikuonekana kwenye maandishi", "Not seen in this text")}</h3>
            <ul>{review.missing.map((x: string) => <li key={x}>{x}</li>)}</ul>
            <p className="safety">{L("Ona wakili huru na jadili na jamii kabla ya kuamua.", "See an independent lawyer and discuss with the community before deciding.")}</p>
          </div>}
        </section>
        <section className="card stack">
          <h2>{L("Tafsiri", "Translate")}</h2>
          <p className="muted small">{L("Kwa WhatsApp, barua pepe au mazungumzo na wazungumzaji wa Kiingereza.", "For WhatsApp, email or talking with English speakers.")}</p>
          <label>{L("Tafsiri kwenda", "Translate to")}<select value={to} onChange={(e) => setTo(e.target.value as "sw" | "en")}><option value="en">English</option><option value="sw">Kiswahili</option></select></label>
          <label className="sr" htmlFor="tr">{L("Maandishi", "Text")}</label>
          <textarea id="tr" rows={5} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          <button className="btn" disabled={!text.trim()} onClick={async () => setOut(await api("/tools/translate", { body: { text, to } }).catch(() => null))}>{L("Tafsiri", "Translate")}</button>
          {out && <div role="status">
            {out.text ? <p className="note">{out.text}</p> : <p className="muted small">{DEMO ? L("Tafsiri ya AI haipo kwenye onyesho hili. Maneno muhimu yako hapa chini.", "AI translation is not in this demo. Key terms are below.") : me?.consentAi ? L("Tafsiri ya AI haipatikani sasa.", "AI translation is not available right now.") : L("Washa AI kwenye Wasifu ili kutafsiri. Maneno muhimu yako hapa chini.", "Turn on AI in Profile to translate. Key terms are below.")}</p>}
            {out.glossary.length > 0 && <ul>{out.glossary.map((g: any) => <li key={g.en}><b>{g.en}</b>: {g.sw}</li>)}</ul>}
          </div>}
          <p className="muted small">{L("Hakiki tafsiri ya mambo muhimu na mtu anayejua lugha zote mbili.", "Check translations of important matters with someone who knows both languages.")}</p>
        </section>
      </div>
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
