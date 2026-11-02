import { ArrowLeft, Check, Footprints, Send, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Module } from "../shared/curriculum";
import { MODULES } from "../shared/curriculum";
import { FINALE, GUIDE, STORY } from "../shared/story";
import { Mascot, api, useApp, useL, useT } from "./core";

const SPOTS: [number, number, number][] = [[120, 214, 1], [650, 206, 1.1], [235, 232, 1.25], [525, 226, 1], [60, 240, 1.3], [385, 216, .9], [730, 240, 1.35], [300, 196, .8]];

function mix(a: number[], b: number[], t: number) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

// Your own land: it starts dry and comes back to life, one tree per stop.
export function Land({ done, fresh = false }: { done: number; fresh?: boolean }) {
  const L = useL();
  const t = done / MODULES.length;
  return (
    <svg className="my-land" viewBox="0 0 800 280" preserveAspectRatio="xMidYMax slice" role="img" aria-label={L(`Ardhi yako: miti ${done} kati ya ${MODULES.length}`, `Your land: ${done} of ${MODULES.length} trees`)}>
      <rect width="800" height="280" fill={mix([240, 214, 170], [176, 224, 238], t)} />
      <circle cx="640" cy={130 - 80 * t} r="40" fill="#f6c453" />
      <path d="M0 170c130-46 260-44 400-14s280 14 400-30v154H0z" fill={mix([201, 170, 116], [127, 174, 92], t)} />
      <path d="M0 214c170-30 320-26 470-8s230 2 330-16v90H0z" fill={mix([214, 180, 120], [92, 150, 74], t)} />
      <g fill="#7a4f2e"><path d="M392 196c0-24 44-24 44 0z" /><path d="M446 200c0-20 36-20 36 0z" /></g>
      {done >= 4 && <path className="pop" d="M0 256c120-20 220 8 340-6s180-22 300-6 110 6 160 0v36H0z" fill="#5bb0d0" />}
      {SPOTS.slice(0, done).map(([x, y, s], i) => (
        <g key={i} className={fresh && i === done - 1 ? "pop" : undefined} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-2 0v-34M0-22l-14-10M0-26l13-9" stroke="#5a3a22" strokeWidth="4" fill="none" />
          <ellipse cx="0" cy="-40" rx="28" ry="10" fill="#2f7d5b" />
          <ellipse cx="-8" cy="-46" rx="17" ry="7" fill="#46996f" />
        </g>
      ))}
      {done >= 3 && <path d="M170 74q9-8 16 0q9-8 16 0M240 52q7-6 13 0q7-6 13 0" stroke="#1f4d3a" strokeWidth="2.5" fill="none" />}
      {done >= 6 && <g fill="#c8862f" transform="translate(585 150)"><path d="M0 46l3-30 26-4 3 34h-5l-2-22-16 2-4 20zM26 16l8-38 10 2-10 38z" /><circle cx="42" cy="-22" r="6" /></g>}
    </svg>
  );
}

function useVoice(lang: string) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const check = () => setOk(speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(lang)));
    check();
    speechSynthesis.addEventListener("voiceschanged", check);
    return () => speechSynthesis.removeEventListener("voiceschanged", check);
  }, [lang]);
  return ok ? (text: string) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
    u.lang = lang;
    speechSynthesis.speak(u);
  } : null;
}

type Line = { who: "guide" | "me"; text: string };
type Beat = { kind: "say"; text: string } | { kind: "ask"; text: string } | { kind: "quiz"; i: number } | { kind: "end" };

export function Lesson({ m, doneBefore, onDone }: { m: Module; doneBefore: number; onDone: () => void }) {
  const { lang } = useApp();
  const L = useL(), T = useT();
  const stop = STORY[m.id];
  const beats = useMemo<Beat[]>(() => [
    { kind: "say", text: T(stop.open) }, ...m.points.map((p) => ({ kind: "say" as const, text: T(p) })),
    { kind: "ask", text: T(stop.ask) }, ...m.quiz.map((_, i) => ({ kind: "quiz" as const, i })), { kind: "end" },
  ], [m, lang]);
  const [log, setLog] = useState<Line[]>([]), [at, setAt] = useState(-1), [typing, setTyping] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]), [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState(""), [score, setScore] = useState<number | null>(null), [err, setErr] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const speak = useVoice(lang);
  const beat = beats[at];

  const next = () => setAt((a) => a + 1);
  useEffect(() => { next(); }, []);
  useEffect(() => {
    const b = beats[at];
    if (!b) return;
    setTyping(true); setPicked(null);
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => {
      setTyping(false);
      if (b.kind === "say" || b.kind === "ask") setLog((l) => [...l, { who: "guide", text: b.text }]);
      if (b.kind === "quiz") setLog((l) => [...l, { who: "guide", text: T(m.quiz[b.i].q) }]);
      if (b.kind === "end") {
        setLog((l) => [...l, { who: "guide", text: T(stop.close) }]);
        api<{ score: number }>("/learn/quiz", { body: { moduleId: m.id, answers } }).then((r) => setScore(r.score)).catch(() => setErr(true));
      }
    }, calm ? 0 : 650);
    return () => clearTimeout(timer);
  }, [at]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "end", behavior: "smooth" }); }, [log, typing, score]);

  const reflect = async (skip: boolean) => {
    if (!skip && text.trim()) {
      setLog((l) => [...l, { who: "me", text }]);
      api("/learn/reflect", { body: { moduleId: m.id, text } }).catch(() => undefined);
    }
    setText(""); next();
  };
  const choose = (i: number, j: number) => {
    const q = m.quiz[i], right = j === q.answer;
    setPicked(j);
    setAnswers((a) => { const c = [...a]; c[i] = j; return c; });
    setLog((l) => [...l, { who: "me", text: T(q.options[j]) }, { who: "guide", text: `${right ? L("Ndiyo kabisa! ", "Exactly! ") : L("Si hivyo, rafiki. ", "Not quite, friend. ")}${T(q.why)}` }]);
  };
  const finished = beat?.kind === "end" && score != null;
  const grown = doneBefore + (score != null ? 1 : 0);
  return (
    <div className="page narrow walk">
      <button className="link back" onClick={onDone}><ArrowLeft size={16} aria-hidden /> {L("Rudi safarini", "Back to the journey")}</button>
      <div className="walk-head"><Land done={Math.min(grown, MODULES.length)} fresh={finished} /><span className="walk-place"><Footprints size={15} aria-hidden /> {T(stop.place)}</span></div>
      <section className="card walk-talk" aria-live="polite">
        {log.map((l, i) => (
          <div key={i} className={`line-row ${l.who}`}>
            {l.who === "guide" && <Mascot size={36} />}
            <div className={`bubble ${l.who === "me" ? "mine" : ""}`}>
              {l.who === "guide" && <small className="who">{GUIDE} (AI)</small>}
              <p>{l.text}</p>
              {l.who === "guide" && speak && <button className="flag" onClick={() => speak(l.text)}><Volume2 size={13} aria-hidden /> {L("Sikiliza", "Listen")}</button>}
            </div>
          </div>
        ))}
        {typing && <div className="line-row guide" role="status"><Mascot size={36} /><div className="bubble dots" aria-label={L("Anaandika", "Typing")}><i /><i /><i /></div></div>}
      </section>
      {!typing && beat && (
        <div className="walk-controls">
          {beat.kind === "say" && <button className="btn" onClick={next}>{L("Endelea kutembea", "Keep walking")}</button>}
          {beat.kind === "ask" && <form className="stack" onSubmit={(e) => { e.preventDefault(); reflect(false); }}>
            <label className="sr" htmlFor="reflect">{beat.text}</label>
            <textarea id="reflect" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder={L("Andika kwa maneno yako...", "In your own words...")} />
            <span className="row"><button className="btn" disabled={!text.trim()}><Send size={16} aria-hidden /> {L("Mjibu Mzee", "Answer the elder")}</button><button type="button" className="link" onClick={() => reflect(true)}>{L("Ruka", "Skip")}</button></span>
          </form>}
          {beat.kind === "quiz" && (picked == null
            ? <div className="stack">{m.quiz[beat.i].options.map((op, j) => <button key={j} className="choice" onClick={() => choose(beat.i, j)}>{T(op)}</button>)}</div>
            : <button className="btn" onClick={next}>{L("Endelea kutembea", "Keep walking")}</button>)}
          {finished && <div className="reward">
            <Land done={Math.min(grown, MODULES.length)} fresh />
            <p className="big-title">{L("Umepanda mti mpya kwenye ardhi yako!", "You planted a new tree on your land!")}</p>
            <p className="muted small">{L("Alama", "Score")}: {score}%</p>
            <div className="safety"><b>{L("Changamoto ya leo", "Today's challenge")}: </b>{T(m.activity)}</div>
            {grown >= MODULES.length && <p className="note">{T(FINALE)}</p>}
            <button className="btn" onClick={onDone}>{L("Rudi safarini", "Back to the journey")}</button>
          </div>}
          {err && <p className="error" role="alert">{L("Haikuhifadhiwa. Angalia mtandao.", "Not saved. Check your connection.")}</p>}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}

export function Trail({ plan, done, onOpen, onPlay }: { plan: { moduleId: string }[]; done: { module_id: string; score: number }[]; onOpen: (id: string) => void; onPlay: () => void }) {
  const L = useL(), T = useT();
  const nextId = plan.find((p) => !done.some((d) => d.module_id === p.moduleId))?.moduleId;
  return (
    <ol className="trail">
      {plan.map((p, i) => {
        const m = MODULES.find((x) => x.id === p.moduleId)!, d = done.find((x) => x.module_id === m.id);
        return (
          <li key={m.id} className={i % 2 ? "right" : ""}>
            <button className="stop" data-state={d ? "done" : m.id === nextId ? "next" : "ahead"} onClick={() => onOpen(m.id)}>
              <span className="stop-dot">{d ? <Check size={20} aria-hidden /> : i + 1}</span>
              <span><small>{T(STORY[m.id].place)}</small><b>{T(m.title)}</b><small>{d ? `${L("Alama", "Score")} ${d.score}%` : `${m.minutes} ${L("dakika", "min")}`}</small></span>
            </button>
          </li>
        );
      })}
      <li><button className="stop play" onClick={onPlay}><span className="stop-dot"><Footprints size={18} aria-hidden /></span><span><small>{L("Fanyeni pamoja", "Do it together")}</small><b>{L("Igizo: Mkutano wa kijiji", "Role play: The village meeting")}</b></span></button></li>
    </ol>
  );
}
