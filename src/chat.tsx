import { Download, Flag, History, Lightbulb, MessageCircleMore, Plus, Puzzle, Rocket, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COUNCIL } from "../shared/content";
import { HELLO } from "../shared/council";
import { Listen, audioOn, play, stop } from "./audio";
import { Picture } from "./illustrations";
import { DEMO, Failed, Loading, Mascot, api, useApp, useData, useL, useT } from "./core";
import { PlanBuilder } from "./plan";

type Msg = { id: string; role: string; expert?: string | null; body: string; source?: string | null; flagged?: boolean; pic?: string | null; asks?: number | null };
type Transcript = { session: number; started: string; messages: { role: string; body: string; at: string }[] };
const wait = (ms: number) => new Promise((r) => setTimeout(r, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms));

function WhatsAppDialog({ onClose }: { onClose: () => void }) {
  const { me } = useApp();
  const L = useL();
  const [phone, setPhone] = useState(""), [state, setState] = useState<"" | "busy" | "error" | "mismatch" | "off">("");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setState("busy");
    try { location.href = (await api<{ url: string }>("/whatsapp/link", { body: { phone } })).url; setState(""); }
    catch (x: any) { setState(x.message === "not_configured" ? "off" : x.message === "phone_mismatch" ? "mismatch" : "error"); }
  };
  return (
    <dialog ref={ref} onClose={onClose} className="dialog">
      <form onSubmit={go}>
        <div className="row-between"><h3>{L("Hamia WhatsApp", "Move to WhatsApp")}</h3><button type="button" className="icon" aria-label={L("Funga", "Close")} onClick={onClose}><X size={20} /></button></div>
        <p className="muted">{L("Weka nambari yako. Tutafungua WhatsApp na mazungumzo yataendelea huko.", "Key in your number. We open WhatsApp and the chat continues there.")}</p>
        <label>{L("Nambari ya WhatsApp", "WhatsApp number")}<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder={me?.phone} required /></label>
        {state === "off" && <p className="error" role="alert">{L("WhatsApp bado haijaunganishwa kwenye onyesho hili. Inahitaji nambari ya biashara iliyoidhinishwa.", "WhatsApp is not connected yet. It needs an approved business number.")}</p>}
        {state === "mismatch" && <p className="error" role="alert">{L("Tumia nambari uliyojisajili nayo.", "Use the number you registered with.")}</p>}
        {state === "error" && <p className="error" role="alert">{L("Nambari si sahihi au jaribu tena baadaye.", "Invalid number, or try again later.")}</p>}
        <button className="btn wa" disabled={state === "busy"}>{L("Fungua WhatsApp", "Open WhatsApp")}</button>
      </form>
    </dialog>
  );
}

// Past conversations, all kept: open one to read it, or download it as text.
function Transcripts({ onOpen, refreshKey }: { onOpen: (t: Transcript) => void; refreshKey: number }) {
  const L = useL();
  const { data } = useData<Transcript[]>("/chat/transcripts", [refreshKey]);
  const download = (t: Transcript) => {
    const text = t.messages.map((m) => `[${new Date(m.at).toLocaleString()}] ${m.role === "user" ? L("Mimi", "Me") : L("Msaidizi wa Jamii (AI)", "Jamii Companion (AI)")}:\n${m.body}`).join("\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    a.download = `jamii-mazungumzo-${t.started.slice(0, 10)}-${t.session}.txt`; a.click();
  };
  return (
    <div className="stack">
      <h3 className="row"><History size={17} aria-hidden /> {L("Mazungumzo yaliyohifadhiwa", "Saved conversations")}</h3>
      {!data?.length && <p className="muted small">{L("Bado hakuna. Kila mazungumzo yanahifadhiwa hapa.", "None yet. Every conversation is kept here.")}</p>}
      <ul className="plain">{data?.map((t) => (
        <li key={t.session} className="transcript">
          <button className="link grow" onClick={() => onOpen(t)}><b>{t.messages.find((m) => m.role === "user")?.body.slice(0, 48) || L("Mazungumzo", "Conversation")}</b><small className="muted block">{new Date(t.started).toLocaleDateString()} · {t.messages.length} {L("ujumbe", "messages")}</small></button>
          <button className="icon" aria-label={L("Pakua", "Download")} onClick={() => download(t)}><Download size={16} aria-hidden /></button>
        </li>
      ))}</ul>
    </div>
  );
}

export function Chat() {
  const { me, refresh, lang, go } = useApp();
  const L = useL(), T = useT();
  useEffect(() => stop, []);
  const { data, failed, reload } = useData<{ messages: Msg[]; starters?: string[] }>("/chat");
  const [msgs, setMsgs] = useState<Msg[]>([]), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const [wa, setWa] = useState(false), [error, setError] = useState(""), [follow, setFollow] = useState<string[]>([]);
  const [planning, setPlanning] = useState(false), [reading, setReading] = useState<Transcript | null>(null), [saved, setSaved] = useState(0), [history, setHistory] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!data) return;
    setFollow(data.starters ?? []);
    setMsgs(data.messages.length ? data.messages : [{ id: "q", role: "bot", body: T(HELLO) }]);
  }, [data, lang]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "end" }); }, [msgs, busy, planning]);

  const send = async (body: string, mode = "ask") => {
    if (!body.trim() || busy) return;
    setBusy(true); setError(""); setText(""); setReading(null); setPlanning(false);
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", body }]);
    try {
      const r = await api("/chat", { body: { text: body, mode } });
      await wait(450);
      setMsgs((m) => [...m, ...(r.replies as Msg[]).map((x) => ({ ...x, id: String(x.id), role: "bot" }))]);
      if (audioOn()) play(r.body, lang);
      setFollow(r.followups ?? []);
      setSaved((n) => n + 1);
      if (me && r.intakeStep !== me.intakeStep && r.intakeStep >= me.intakeTotal) refresh();
    } catch (x: any) {
      setError(x.message === "rate" ? L("Maswali mengi kwa saa hii. Pumzika kidogo.", "Too many messages this hour. Take a short break.") : L("Ujumbe haukutumwa. Angalia mtandao.", "Message not sent. Check your connection."));
    }
    setBusy(false);
  };
  const flag = async (id: string) => {
    await api("/chat/flag", { body: { id, reason: "user" } });
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, flagged: true } : x)));
  };
  const fresh = async () => { await api("/chat/new", { method: "POST" }); setReading(null); setSaved((n) => n + 1); reload(); };
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.body ?? "";
  const pending = [...msgs].reverse().find((m) => m.role === "bot")?.asks != null;
  const shown: Msg[] = reading ? reading.messages.map((m, i) => ({ id: `t${i}`, role: m.role, body: m.body })) : msgs;
  return (
    <div className="chat" data-history={history}>
      <section className="council card" aria-label={L("Mazungumzo", "Conversations")}>
        <button className="btn small" onClick={fresh}><Plus size={16} aria-hidden /> {L("Mazungumzo mapya", "New conversation")}</button>
        <Transcripts onOpen={(t) => { setReading(t); setHistory(false); }} refreshKey={saved} />
      </section>
      <section className="thread card" aria-label={L("Mazungumzo", "Conversation")}>
        <header className="row-between thread-head">
          <span className="row"><Mascot size={40} /><span><b>{L("Msaidizi wa Jamii", "Jamii Companion")}</b><small className="muted block">{L("Wataalamu wote kwa sauti moja. Hii ni AI, inaweza kukosea", "All the experts in one voice. This is AI, it can be wrong")}</small></span></span>
          <span className="row">
            <button className="btn ghost small phone-only" aria-expanded={history} onClick={() => setHistory(!history)}><History size={16} aria-hidden /> {L("Historia", "History")}</button>
            <button className="btn wa small" onClick={() => setWa(true)}><MessageCircleMore size={17} aria-hidden /> WhatsApp</button>
          </span>
        </header>
        {reading && <p className="note pad-x row-between">{L("Unasoma mazungumzo ya", "Reading the conversation from")} {new Date(reading.started).toLocaleDateString()}<button className="link" onClick={() => setReading(null)}>{L("Rudi kwa mazungumzo ya sasa", "Back to the current chat")}</button></p>}
        <div className="messages" aria-live="polite">
          {shown.map((m) => (
            <div key={m.id} className={`bubble ${m.role === "user" ? "mine" : ""}`}>
              {m.role !== "user" && <small className="who"><Mascot size={22} /> {L("Msaidizi wa Jamii", "Jamii Companion")}</small>}
              <p>{m.body}</p>
              {m.pic && <Picture id={m.pic} />}
              {m.source && <small className="src">{L("Chanzo", "Source")}: {m.source}</small>}
              {m.role === "bot" && <Listen text={m.body} />}
              {m.role === "bot" && !reading && m.id !== "q" && (
                <button className="flag" disabled={m.flagged} onClick={() => flag(m.id)}><Flag size={13} aria-hidden /> {m.flagged ? L("Imeripotiwa, asante", "Reported, thank you") : L("Si sahihi", "Not right")}</button>
              )}
            </div>
          ))}
          {planning && <PlanBuilder onCancel={() => setPlanning(false)} onDone={(_, group) => {
            setPlanning(false);
            setMsgs((m) => [...m, { id: `p${Date.now()}`, role: "bot", body: group
              ? L(`Mpango wako uko tayari, na kundi "${group}" limeongezwa. Fungua Mafunzo kuona masomo yako na mwongozo wa vikao.`, `Your plan is ready, and the group "${group}" is added. Open Learn to see your lessons and the session guide.`)
              : L("Mpango wako uko tayari. Fungua Mafunzo kuona masomo uliyochagua, kwa mpangilio na muda wake.", "Your plan is ready. Open Learn to see the lessons you chose, in order and with timings.") }]);
          }} />}
          {busy && <div className="bubble typing" role="status"><Mascot size={22} /> {L("Msaidizi anaandika", "The companion is typing")}<span className="dots"><i /><i /><i /></span></div>}
          <div ref={end} />
        </div>
        {error && <p className="error pad-x" role="alert">{error}</p>}
        {!busy && !reading && (
          <div className="chips" aria-label={L("Mapendekezo", "Suggestions")}>
            {!planning && <button className="start" onClick={() => setPlanning(true)}><Rocket size={15} aria-hidden /> {L("Nisaidie kuanza", "Help me get started")}</button>}
            {msgs.some((m) => m.id.startsWith("p")) && <button onClick={() => go("learn")}>{L("Fungua mpango wangu", "Open my plan")}</button>}
            {pending && <button className="skip" onClick={() => send("RUKA")}>{L("Ruka swali hili", "Skip this question")}</button>}
            {follow.map((f) => <button key={f} onClick={() => send(f)}><Sparkles size={15} aria-hidden /> {f}</button>)}
            {lastUser && <button onClick={() => send(lastUser, "analogy")}><Lightbulb size={15} aria-hidden /> {L("Nipe mfano", "Give an analogy")}</button>}
            {lastUser && <button onClick={() => send(lastUser, "game")}><Puzzle size={15} aria-hidden /> {L("Nipe mchezo", "Give a game")}</button>}
          </div>
        )}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <label className="sr" htmlFor="msg">{L("Andika ujumbe", "Type a message")}</label>
          <input id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder={L("Niulize chochote...", "Ask me anything...")} autoComplete="off" />
          <button className="send" aria-label={L("Tuma", "Send")} disabled={busy}><Send size={20} aria-hidden /></button>
        </form>
      </section>
      <aside className="profile card">
        <span className="profile-art" style={{ background: "#1f4d3a" }}><Mascot size={84} /></span>
        <h3>{L("Msaidizi wa Jamii", "Jamii Companion")}</h3>
        <p className="muted">{L("Jibu moja linaloleta pamoja:", "One answer that brings together:")}</p>
        <ul className="plain small left">{COUNCIL.map((e) => <li key={e.id}>• {T(e.name)}: <span className="muted">{T(e.role)}</span></li>)}</ul>
        <hr />
        <p className="muted small">{me?.consentAi ? L("AI imewashwa. Majibu yanatumia maelezo yaliyohakikiwa.", "AI is on. Answers use the verified notes.") : DEMO ? L("Onyesho hili linatumia majibu yaliyoandaliwa na vyanzo.", "This demo uses prepared, sourced answers.") : L("Majibu yaliyoandaliwa tu. Washa AI kwenye Wasifu.", "Prepared answers only. Turn on AI in Profile.")}</p>
        <div className="safety">{L("Usishiriki PIN, kitambulisho au siri za jamii.", "Do not share PINs, IDs or community secrets.")}</div>
      </aside>
      {wa && <WhatsAppDialog onClose={() => setWa(false)} />}
    </div>
  );
}
