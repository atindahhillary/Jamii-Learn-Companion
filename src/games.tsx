import { ArrowLeft, Coins, Flag, Play, Shuffle, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { o, type T } from "../shared/content";
import { Person } from "./avatars";
import { Listen } from "./audio";
import { MODULES } from "../shared/curriculum";
import type { Game, Question } from "../shared/games";
import { MAA, MAA_NOTE, MAA_SOURCE } from "../shared/maa";
import { DEMO, api, useApp, useData, useL, useT } from "./core";

const shuffle = <X,>(a: X[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const best = (id: string) => { try { return Number(localStorage.getItem(`jlc-best-${id}`)) || 0; } catch { return 0; } };
const keepBest = (id: string, n: number) => { try { if (n > best(id)) localStorage.setItem(`jlc-best-${id}`, String(n)); } catch { /* score just is not remembered */ } };

const PAIRS: [T, T][] = [
  [o("Mkopo wa kaboni", "Carbon credit"), o("Tani moja ya gesi", "One tonne of gas")],
  [o("FPIC", "FPIC"), o("Ridhaa huru ya awali", "Free prior consent")],
  [o("CDA", "CDA"), o("Mkataba wa jamii", "Community agreement")],
  [o("Baseline", "Baseline"), o("Hali bila mradi", "Without the project")],
  [o("Mkaguzi", "Auditor"), o("Anakagua kazi", "Checks the work")],
  [o("Mgao", "Share"), o("Angalau 40% baada ya gharama", "At least 40% after costs")],
];

// Works for the ready-made words and for any generated game: pairs arrive already in the chosen language.
function Match({ onBack, pairs, id = "match", title }: { onBack: () => void; pairs: [string, string][]; id?: string; title?: string }) {
  const L = useL();
  const cards = useMemo(() => shuffle(pairs.flatMap((p, i) => [{ pair: i, text: p[0] }, { pair: i, text: p[1] }])), [pairs]);
  const [open, setOpen] = useState<number[]>([]), [won, setWon] = useState<number[]>([]), [tries, setTries] = useState(0);
  const pick = (i: number) => {
    if (open.length === 2 || open.includes(i) || won.includes(cards[i].pair)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setTries((t) => t + 1);
    const hit = cards[next[0]].pair === cards[next[1]].pair;
    setTimeout(() => {
      if (hit) { const w = [...won, cards[i].pair]; setWon(w); if (w.length === pairs.length) keepBest(id, Math.max(1, 100 - (tries + 1 - pairs.length) * 5)); }
      setOpen([]);
    }, hit ? 350 : 950);
  };
  return <Frame title={title ?? L("Linganisha maneno", "Match the words")} onBack={onBack} host="mwalimu" say={won.length === pairs.length ? L(`Hongera! Umemaliza kwa majaribio ${tries}.`, `Well done! You finished in ${tries} tries.`) : L("Fungua kadi mbili zinazoendana.", "Open two cards that belong together.")}>
    <div className="memory">
      {cards.map((c, i) => {
        const up = open.includes(i) || won.includes(c.pair);
        return <button key={i} className="memo" data-up={up} data-won={won.includes(c.pair)} aria-label={up ? c.text : L(`Kadi ${i + 1}`, `Card ${i + 1}`)} onClick={() => pick(i)}>{up ? c.text : "?"}</button>;
      })}
    </div>
  </Frame>;
}

function Share({ onBack }: { onBack: () => void }) {
  const L = useL();
  const rounds = useMemo(() => [[10, 6], [20, 15], [8, 3], [50, 45], [30, 10]].map(([e, c]) => {
    const right = +((e - c) * .4).toFixed(1);
    return { e, c, right, options: shuffle([right, +(e * .4).toFixed(1), +((e - c) * .25).toFixed(1)]) };
  }), []);
  const [i, setI] = useState(0), [score, setScore] = useState(0), [pick, setPick] = useState<number | null>(null);
  const r = rounds[i];
  if (!r) { keepBest("share", score); return <Frame title={L("Hesabu ya mgao", "Work out the share")} onBack={onBack} host="bibi" say={L(`Umepata ${score} kati ya ${rounds.length}. Sasa unajua kuuliza: 40% ya nini?`, `You got ${score} of ${rounds.length}. Now you know to ask: 40% of what?`)}><button className="btn" onClick={onBack}>{L("Maliza", "Finish")}</button></Frame>; }
  const costPct = (r.c / r.e) * 100;
  return <Frame title={L("Hesabu ya mgao", "Work out the share")} onBack={onBack} host="bibi" say={L(`Raundi ${i + 1}: mradi wa ardhi. Jamii inapata shilingi ngapi?`, `Round ${i + 1}: a land project. How much does the community get?`)}>
    <div className="bar-game" role="img" aria-label={L(`Mapato ${r.e}m, gharama ${r.c}m`, `Earnings ${r.e}m, costs ${r.c}m`)}>
      <span style={{ width: `${costPct}%` }} className="cost">{L("Gharama", "Costs")} {r.c}m</span><span style={{ width: `${100 - costPct}%` }} className="left">{r.e - r.c}m</span>
    </div>
    <p className="muted small">{L(`Mapato ${r.e}m. Angalau 40% ya salio baada ya gharama.`, `Earnings ${r.e}m. At least 40% of what is left after costs.`)}</p>
    <div className="stack">
      {r.options.map((op) => <button key={op} className="choice" disabled={pick != null} data-right={pick != null && op === r.right} aria-pressed={pick === op} onClick={() => { setPick(op); if (op === r.right) setScore(score + 1); }}>{op}m</button>)}
    </div>
    {pick != null && <>
      <p className="note" role="status">{pick === r.right ? L("Sahihi! ", "Correct! ") : L("Karibu. ", "Close. ")}{r.e}m - {r.c}m = {r.e - r.c}m, {L("na 40% ni", "and 40% is")} {r.right}m.</p>
      <button className="btn" onClick={() => { setI(i + 1); setPick(null); }}>{L("Endelea", "Next")}</button>
    </>}
  </Frame>;
}

const CLAUSES: { text: T; flag: boolean; why: T }[] = [
  { text: o("Mkataba huu ni wa milele na hauwezi kufutwa.", "This agreement lasts forever and cannot be cancelled."), flag: true, why: o("Uliza mwisho wake na njia ya kutoka.", "Ask when it ends and how to exit.") },
  { text: o("Ripoti ya mwaka ya mapato itatolewa kwa kamati.", "A yearly earnings report goes to the committee."), flag: false, why: o("Vizuri. Mfano wa CDA unataka ripoti hii.", "Good. The CDA template expects this report.") },
  { text: o("Jamii inapata 40% ya faida halisi, gharama zikiamuliwa na mwekezaji.", "The community gets 40% of net profit, with costs set by the developer."), flag: true, why: o("Nani anakagua gharama? Weka kikomo na ukaguzi huru.", "Who checks the costs? Ask for a cap and an independent audit.") },
  { text: o("Mkataba unapatikana kwa Kiswahili pia.", "The agreement is also available in Kiswahili."), flag: false, why: o("Vizuri. Taarifa kwa lugha yenu ni sehemu ya FPIC.", "Good. Information in your language is part of FPIC.") },
  { text: o("Mizozo itaamuliwa London tu.", "Disputes will be decided in London only."), flag: true, why: o("Mtafikaje huko? Uliza kwa nini isiwe Kenya.", "How would you get there? Ask why not Kenya.") },
  { text: o("Malisho yamepigwa marufuku hata wakati wa ukame.", "Grazing is banned even during drought."), flag: true, why: o("Mifugo itakula wapi? Jadili ukame.", "Where will livestock eat? Discuss drought.") },
  { text: o("Kamati ina wawakilishi wa wanawake na vijana waliochaguliwa.", "The committee has elected women and youth representatives."), flag: false, why: o("Vizuri. Sauti zote zinahitajika.", "Good. Every voice is needed.") },
  { text: o("Jamii lazima isiambie mtu yeyote masharti haya.", "The community must not tell anyone these terms."), flag: true, why: o("Mnapaswa kuonyesha wakili na wanachama wote.", "You should be able to show a lawyer and all members.") },
];

function Flags({ onBack }: { onBack: () => void }) {
  const L = useL(), T = useT();
  const list = useMemo(() => shuffle(CLAUSES), []);
  const [i, setI] = useState(0), [score, setScore] = useState(0), [ans, setAns] = useState<boolean | null>(null);
  const c = list[i];
  if (!c) { keepBest("flags", score); return <Frame title={L("Bendera nyekundu", "Red flags")} onBack={onBack} host="mama" say={L(`Umepata ${score} kati ya ${list.length}. Kumbuka: mchezo huu hauchukui nafasi ya wakili.`, `You got ${score} of ${list.length}. Remember: this game does not replace a lawyer.`)}><button className="btn" onClick={onBack}>{L("Maliza", "Finish")}</button></Frame>; }
  return <Frame title={L("Bendera nyekundu", "Red flags")} onBack={onBack} host="mama" say={L(`Kifungu ${i + 1} kati ya ${list.length}: tuulize zaidi au tuendelee?`, `Clause ${i + 1} of ${list.length}: ask more or carry on?`)}>
    <blockquote className="clause">{T(c.text)}</blockquote>
    {ans == null ? <div className="row two-btn">
      <button className="btn danger" onClick={() => { setAns(true); if (c.flag) setScore(score + 1); }}><Flag size={17} aria-hidden /> {L("Bendera nyekundu", "Red flag")}</button>
      <button className="btn ghost" onClick={() => { setAns(false); if (!c.flag) setScore(score + 1); }}>{L("Inaonekana sawa", "Looks fine")}</button>
    </div> : <>
      <p className="note" role="status">{ans === c.flag ? L("Sawa! ", "Right! ") : L("Angalia tena. ", "Look again. ")}{T(c.why)}</p>
      <button className="btn" onClick={() => { setI(i + 1); setAns(null); }}>{L("Endelea", "Next")}</button>
    </>}
  </Frame>;
}

function Frame({ title, onBack, host, say, children }: { title: string; onBack: () => void; host: string; say: string; children: React.ReactNode }) {
  const L = useL();
  return <div className="stack">
    <button className="link back" onClick={onBack}><ArrowLeft size={16} aria-hidden /> {L("Rudi", "Back")}</button>
    <h2>{title}</h2>
    <div className="line-row guide"><Person look={host} size={48} /><div className="bubble"><p>{say}</p><Listen text={say} /></div></div>
    {children}
  </div>;
}

function Quiz({ onBack, game }: { onBack: () => void; game: Game }) {
  const L = useL();
  const [i, setI] = useState(0), [score, setScore] = useState(0), [pick, setPick] = useState<number | null>(null);
  const q: Question | undefined = game.questions[i];
  if (!q) { keepBest(game.id, score); return <Frame title={game.title} onBack={onBack} host="mwalimu" say={L(`Umepata ${score} kati ya ${game.questions.length}.`, `You got ${score} of ${game.questions.length}.`)}><button className="btn" onClick={onBack}>{L("Maliza", "Finish")}</button></Frame>; }
  return <Frame title={game.title} onBack={onBack} host="mwalimu" say={L(`Swali ${i + 1} kati ya ${game.questions.length}`, `Question ${i + 1} of ${game.questions.length}`)}>
    <p className="big-title">{q.q}</p>
    <div className="stack">{q.options.map((op, j) => <button key={j} className="choice" disabled={pick != null} data-right={pick != null && j === q.answer} aria-pressed={pick === j} onClick={() => { setPick(j); if (j === q.answer) setScore(score + 1); }}>{op}</button>)}</div>
    {pick != null && <>
      <p className="note" role="status">{pick === q.answer ? L("Sahihi!", "Correct!") : `${L("Jibu ni", "The answer is")}: ${q.options[q.answer]}`}</p>
      <button className="btn" onClick={() => { setI(i + 1); setPick(null); }}>{L("Endelea", "Next")}</button>
    </>}
  </Frame>;
}

const PlayGame = ({ game, onBack }: { game: Game; onBack: () => void }) =>
  game.kind === "match" ? <Match onBack={onBack} pairs={game.pairs} id={game.id} title={game.title} /> : <Quiz onBack={onBack} game={game} />;

// Turn a lesson or anything the user pastes (notes, a meeting summary, a contract page) into a game.
function Maker({ onMade }: { onMade: (g: Game) => void }) {
  const { me } = useApp();
  const L = useL(), T = useT();
  const [from, setFrom] = useState<"lesson" | "text">("text"), [moduleId, setModuleId] = useState(MODULES[0].id);
  const [text, setText] = useState(""), [title, setTitle] = useState(""), [kind, setKind] = useState<"match" | "quiz">("quiz");
  const [lang, setLang] = useState<string>(me?.lang ?? "sw"), [other, setOther] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    try { onMade(await api<Game>("/tools/game", { body: { kind, lang: lang === "other" ? other : lang, title, ...(from === "lesson" ? { moduleId } : { text }) } })); }
    catch (x: any) {
      setErr(x.message === "needs_ai" ? L("Masomo yanapatikana kwa Kiswahili na Kiingereza. Lugha nyingine zinahitaji AI ya moja kwa moja, ambayo haipo kwenye onyesho hili. Unaweza kubandika maandishi yako kwa lugha yoyote.", "Lessons come in Kiswahili and English. Other languages need live AI, which this demo does not have. You can paste your own text in any language.")
        : x.message === "too_little" ? (kind === "match" ? L("Sikupata jozi za kutosha. Andika mstari mmoja kwa kila neno, kama 'CDA: mkataba wa jamii'.", "I could not find enough pairs. Write one per line, like 'CDA: community agreement'.") : L("Andika angalau sentensi tatu kamili, kila moja na maneno matano au zaidi.", "Write at least three full sentences, each with five or more words."))
        : L("Haikufanikiwa. Jaribu tena.", "That did not work. Try again."));
    }
    setBusy(false);
  };
  return <section className="card stack">
    <h3><Sparkles size={18} aria-hidden /> {L("Tengeneza mchezo", "Make a game")}</h3>
    <div className="tabs" role="tablist">{([["text", L("Maudhui yangu", "My own content")], ["lesson", L("Kutoka somo", "From a lesson")]] as const).map(([id, n]) => <button key={id} role="tab" aria-selected={from === id} onClick={() => setFrom(id)}>{n}</button>)}</div>
    {from === "lesson"
      ? <label>{L("Somo", "Lesson")}<select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>{MODULES.map((m) => <option key={m.id} value={m.id}>{T(m.title)}</option>)}</select></label>
      : <>
        <label>{L("Jina la mchezo", "Game name")}<input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>{L("Bandika maudhui yako, kwa lugha yoyote", "Paste your content, in any language")}<textarea rows={6} maxLength={6000} value={text} onChange={(e) => setText(e.target.value)} placeholder={L("Mfano:\nCDA: mkataba wa jamii na mwekezaji\nFPIC: ridhaa huru kabla ya mradi\nBaseline: hali bila mradi", "For example:\nCDA: the community and developer agreement\nFPIC: free consent before a project\nBaseline: what happens without the project")} /></label>
        <p className="muted small">{L("Ondoa majina na nambari za watu kwanza.", "Remove people's names and numbers first.")}</p>
      </>}
    <div className="two">
      <label>{L("Aina", "Type")}<select value={kind} onChange={(e) => setKind(e.target.value as "match" | "quiz")}><option value="quiz">{L("Maswali (jaza pengo)", "Quiz (fill the gap)")}</option><option value="match">{L("Linganisha jozi", "Match the pairs")}</option></select></label>
      <label>{L("Lugha", "Language")}<select value={lang} onChange={(e) => setLang(e.target.value)}><option value="sw">Kiswahili</option><option value="en">English</option><option value="Maa">Maa (Kenya, Tanzania)</option><option value="other">{L("Nyingine...", "Other...")}</option></select></label>
    </div>
    {lang === "Maa" && <div className="note small">
      <p>{T(MAA_NOTE)}</p>
      <p>{from === "lesson" ? L("Kutoka somo: mchezo wa maneno ya Maa ya mada hiyo, yakielezwa kwa lugha unayotumia.", "From a lesson: a game of Maa words on that topic, explained in your app language.") : L("Maudhui yako: andika kwa Maa, mfano 'ɛn-kɔ́p: ardhi'. Mchezo unatumia maneno yako kama yalivyo.", "Your content: write it in Maa, for example 'ɛn-kɔ́p: land'. The game uses your words as written.")}</p>
      <details><summary>{L(`Maneno ${MAA.length} ya Maa yaliyohakikiwa na kamusi`, `${MAA.length} dictionary-checked Maa words`)}</summary>
        <ul className="plain maa-list">{MAA.map((w) => <li key={w.maa}><b lang="mas">{w.maa}</b> <span className="muted">({w.plain})</span>: {T(w.gloss)}{w.note && <small className="muted"> · {T(w.note)}</small>}</li>)}</ul>
        <small className="muted">{L("Chanzo", "Source")}: {MAA_SOURCE}</small>
      </details>
    </div>}
    {lang === "other" && <label>{L("Lugha gani?", "Which language?")}<input value={other} maxLength={30} onChange={(e) => setOther(e.target.value)} placeholder="Maa, Samburu, Kikuyu, Somali..." /></label>}
    {lang === "other" && <p className="muted small">{DEMO ? L("Kwenye onyesho hili mchezo unatumia maandishi yako kama yalivyo. Kwa AI ya moja kwa moja, inaweza kuandika mchezo kwa lugha hiyo. Mtu anayeijua lugha ahakiki.", "In this demo the game uses your text as written. With live AI it can write the game in that language. Have a speaker of the language check it.") : L("AI itaandika mchezo kwa lugha hiyo. Mtu anayeijua lugha ahakiki kabla ya kutumia na kundi.", "The AI writes the game in that language. Have a speaker check it before using it with a group.")}</p>}
    {err && <p className="error" role="alert">{err}</p>}
    <button className="btn" disabled={busy || (from === "text" && !text.trim()) || (lang === "other" && !other.trim())} onClick={go}>{busy ? L("Inatengeneza...", "Making...") : L("Tengeneza", "Make it")}</button>
  </section>;
}

export function Games() {
  const L = useL();
  const [g, setG] = useState(""), [play, setPlay] = useState<Game | null>(null), [made, setMade] = useState<Game | null>(null);
  const mine = useData<Game[]>("/games");
  const back = () => { setPlay(null); setG(""); };
  if (play) return <PlayGame game={play} onBack={back} />;
  if (g === "match") return <Match onBack={back} pairs={PAIRS.map(([a, b]) => [L(a.sw, a.en), L(b.sw, b.en)] as [string, string])} />;
  if (g === "share") return <Share onBack={back} />;
  if (g === "flags") return <Flags onBack={back} />;
  const list: [string, typeof Shuffle, string, string, string][] = [
    ["match", Shuffle, "mwalimu", L("Linganisha maneno", "Match the words"), L("Kumbuka maneno muhimu ya kaboni", "Remember the key carbon words")],
    ["share", Coins, "bibi", L("Hesabu ya mgao", "Work out the share"), L("40% ya nini? Fanya hesabu sokoni", "40% of what? Do the market maths")],
    ["flags", Flag, "mama", L("Bendera nyekundu", "Red flags"), L("Tambua vifungu vya kuuliza zaidi", "Spot clauses that need more questions")],
  ];
  return <div className="stack">
    <Maker onMade={setMade} />
    {made && <section className="card stack" role="status">
      <p><b>{made.title}</b> · {made.kind === "match" ? L(`jozi ${made.pairs.length}`, `${made.pairs.length} pairs`) : L(`maswali ${made.questions.length}`, `${made.questions.length} questions`)} · {made.lang}{made.by === "ai" ? " · AI" : ""}</p>
      <div className="row">
        <button className="btn" onClick={() => setPlay(made)}><Play size={16} aria-hidden /> {L("Cheza", "Play")}</button>
        <button className="btn ghost" onClick={async () => { await api("/games", { body: made }); setMade(null); mine.reload(); }}>{L("Hifadhi kwenye michezo yangu", "Save to my games")}</button>
      </div>
    </section>}
    {!!mine.data?.length && <><h3>{L("Michezo yangu", "My games")}</h3>
      <div className="lessons">{mine.data.map((x) => (
        <div key={x.id} className="game card"><button className="link grow" onClick={() => setPlay(x)}><b>{x.title}</b><small className="muted block">{x.kind === "match" ? L("Linganisha", "Match") : L("Maswali", "Quiz")} · {x.lang}</small></button>
          <button className="icon" aria-label={L(`Futa ${x.title}`, `Delete ${x.title}`)} onClick={async () => { await api(`/games/${x.id}`, { method: "DELETE" }); mine.reload(); }}><Trash2 size={16} aria-hidden /></button></div>
      ))}</div></>}
    <h3>{L("Michezo iliyo tayari", "Ready-made games")}</h3>
    <div className="lessons">
      {list.map(([id, Icon, look, name, sub]) => (
        <button key={id} className="game card" onClick={() => setG(id)}><Person look={look} size={56} /><span><b>{name}</b><small className="muted">{sub}</small>{best(id) > 0 && <small className="muted"><Icon size={12} aria-hidden /> {L("Bora", "Best")}: {best(id)}</small>}</span></button>
      ))}
    </div>
  </div>;
}
