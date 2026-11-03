import { Flag, Lightbulb, MessageCircleMore, Puzzle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COUNCIL, expertById } from "../shared/content";
import { WELCOME } from "../shared/story";
import { Listen, audioOn, play, stop } from "./audio";
import { Person, SEAT_LOOK } from "./avatars";
import { Picture } from "./illustrations";
import { DEMO, Failed, Loading, api, useApp, useData, useL, useT } from "./core";

const Seat = ({ id, size = 40 }: { id: string; color?: string; size?: number }) => <Person look={SEAT_LOOK[id] ?? "elder"} size={size} />;

type Msg = { id: string; role: string; expert?: string | null; body: string; source?: string | null; flagged?: boolean; pic?: string | null; asks?: number | null };
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

export function Chat() {
  const { me, refresh, lang } = useApp();
  const L = useL(), T = useT();
  useEffect(() => stop, []);
  const { data, failed, reload } = useData<{ messages: Msg[]; intakeQuestion: string | null; starters?: string[] }>("/chat");
  const [msgs, setMsgs] = useState<Msg[]>([]), [text, setText] = useState(""), [busy, setBusy] = useState(false);
  const [expert, setExpert] = useState(""), [wa, setWa] = useState(false), [error, setError] = useState("");
  const [typing, setTyping] = useState<string | null>(null), [follow, setFollow] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!data) return;
    const hello = data.intakeQuestion ? [{ id: "q", role: "bot", expert: "mzee", body: `${T(WELCOME)}\n\n${data.intakeQuestion}`, asks: me?.intakeStep ?? 0 }] : [];
    setFollow(data.starters ?? []);
    const open = !data.messages.length && !hello.length ? [{ id: "q", role: "bot", expert: "mwalimu", body: L("Karibu. Uliza swali lolote kuhusu kaboni, ardhi, mikataba au mgao wa mapato.", "Welcome. Ask anything about carbon, land, contracts or benefit sharing.") }] : [];
    setMsgs([...data.messages, ...hello, ...open]);
  }, [data]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "end" }); }, [msgs, busy, typing]);

  const send = async (body: string, mode = "ask") => {
    if (!body.trim() || busy) return;
    setBusy(true); setError(""); setText("");
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", body }]);
    try {
      const r = await api("/chat", { body: { text: body, mode, expert } });
      if (audioOn()) play(r.body, lang);
      // Specialists answer one after another, so a council reply reads like a conversation.
      for (const [i, x] of (r.replies as Msg[]).entries()) {
        setTyping(x.expert ?? null);
        await wait(i === 0 ? 450 : 900);
        setMsgs((m) => [...m, { ...x, id: String(x.id), role: "bot" }]);
      }
      setTyping(null);
      setFollow(r.followups ?? []);
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
  const seat = expertById(expert || [...msgs].reverse().find((m) => m.expert)?.expert || "kaboni");
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.body ?? "";
  const pending = [...msgs].reverse().find((m) => m.role === "bot")?.asks != null;
  return (
    <div className="chat">
      <section className="council card" aria-label={L("Baraza la wataalamu", "Council of experts")}>
        <h2>{L("Baraza la Wataalamu", "Council of Experts")}</h2>
        <button className="seat" aria-pressed={!expert} onClick={() => setExpert("")}><Seat id="all" color="#1f4d3a" /><span><b>{L("Baraza lote", "Whole council")}</b><small>{L("Tunachagua mtaalamu kwa swali lako", "We pick the expert for your question")}</small></span></button>
        {COUNCIL.map((e) => (
          <button key={e.id} className="seat" aria-pressed={expert === e.id} onClick={() => setExpert(e.id)}><Seat id={e.id} color={e.color} /><span><b>{T(e.name)}</b><small>{T(e.role)}</small></span></button>
        ))}
      </section>
      <section className="thread card" aria-label={L("Mazungumzo", "Conversation")}>
        <header className="row-between thread-head">
          <span className="row"><Seat id={expert ? seat.id : "all"} color={expert ? seat.color : "#1f4d3a"} /><span><b>{expert ? T(seat.name) : L("Baraza la Wataalamu", "Council of Experts")}</b><small className="muted block">{L("Hii ni AI, inaweza kukosea", "This is AI, it can be wrong")}</small></span></span>
          <button className="btn wa small" onClick={() => setWa(true)}><MessageCircleMore size={17} aria-hidden /> WhatsApp</button>
        </header>
        <div className="messages" aria-live="polite">
          {msgs.map((m) => (
            <div key={m.id} className={`bubble ${m.role === "user" ? "mine" : ""}`}>
              {m.role !== "user" && m.expert && <small className="who"><Person look={SEAT_LOOK[m.expert] ?? "elder"} size={22} /> {T(expertById(m.expert).name)}</small>}
              <p>{m.body}</p>
              {m.pic && <Picture id={m.pic} />}
              {m.source && <small className="src">{L("Chanzo", "Source")}: {m.source}</small>}
              {m.role === "bot" && <Listen text={m.body} />}
              {m.role === "bot" && m.id !== "q" && (
                <button className="flag" disabled={m.flagged} onClick={() => flag(m.id)}><Flag size={13} aria-hidden /> {m.flagged ? L("Imeripotiwa, asante", "Reported, thank you") : L("Si sahihi", "Not right")}</button>
              )}
            </div>
          ))}
          {busy && <div className="bubble typing" role="status">{typing ? <><Person look={SEAT_LOOK[typing] ?? "elder"} size={22} /> {L(`${T(expertById(typing).name)} anaandika`, `${T(expertById(typing).name)} is typing`)}</> : L("Baraza linajadili...", "The council is thinking...")}<span className="dots"><i /><i /><i /></span></div>}
          <div ref={end} />
        </div>
        {error && <p className="error pad-x" role="alert">{error}</p>}
        {!busy && (
          <div className="chips" aria-label={L("Mapendekezo", "Suggestions")}>
            {pending && <button className="skip" onClick={() => send("RUKA")}>{L("Ruka swali hili", "Skip this question")}</button>}
            {follow.map((f) => <button key={f} onClick={() => send(f)}><Sparkles size={15} aria-hidden /> {f}</button>)}
            {lastUser && <button onClick={() => send(lastUser, "analogy")}><Lightbulb size={15} aria-hidden /> {L("Nipe mfano", "Give an analogy")}</button>}
            {lastUser && <button onClick={() => send(lastUser, "game")}><Puzzle size={15} aria-hidden /> {L("Nipe mchezo", "Give a game")}</button>}
          </div>
        )}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <label className="sr" htmlFor="msg">{L("Andika ujumbe", "Type a message")}</label>
          <input id="msg" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder={L("Andika hapa...", "Type here...")} autoComplete="off" />
          <button className="send" aria-label={L("Tuma", "Send")} disabled={busy}><Send size={20} aria-hidden /></button>
        </form>
      </section>
      <aside className="profile card">
        <span className="profile-art" style={{ background: seat.color }}><Seat id={seat.id} color="rgba(255,255,255,.2)" size={84} /></span>
        <h3>{T(seat.name)}</h3>
        <p className="muted">{T(seat.role)}</p>
        <p>{T(seat.focus)}</p>
        <hr />
        <h4>{L("Jinsi ninavyokujibu", "How I answer you")}</h4>
        <p className="muted small">{me?.consentAi ? L("AI imewashwa. Majibu yanatumia maelezo yaliyohakikiwa.", "AI is on. Answers use the verified notes.") : DEMO ? L("Onyesho hili linatumia majibu yaliyoandaliwa na vyanzo.", "This demo uses prepared, sourced answers.") : L("Majibu yaliyoandaliwa tu. Washa AI kwenye Wasifu.", "Prepared answers only. Turn on AI in Profile.")}</p>
        <div className="safety">{L("Usishiriki PIN, kitambulisho au siri za jamii.", "Do not share PINs, IDs or community secrets.")}</div>
      </aside>
      {wa && <WhatsAppDialog onClose={() => setWa(false)} />}
    </div>
  );
}
