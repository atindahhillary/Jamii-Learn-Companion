import { ArrowLeft, Coins, Flag, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { o, type T } from "../shared/content";
import { Person } from "./avatars";
import { Listen } from "./audio";
import { useL, useT } from "./core";

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

function Match({ onBack }: { onBack: () => void }) {
  const L = useL(), T = useT();
  const cards = useMemo(() => shuffle(PAIRS.flatMap((p, i) => [{ pair: i, text: p[0] }, { pair: i, text: p[1] }])), []);
  const [open, setOpen] = useState<number[]>([]), [won, setWon] = useState<number[]>([]), [tries, setTries] = useState(0);
  const pick = (i: number) => {
    if (open.length === 2 || open.includes(i) || won.includes(cards[i].pair)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setTries((t) => t + 1);
    const hit = cards[next[0]].pair === cards[next[1]].pair;
    setTimeout(() => {
      if (hit) { const w = [...won, cards[i].pair]; setWon(w); if (w.length === PAIRS.length) keepBest("match", Math.max(1, 100 - (tries + 1 - PAIRS.length) * 5)); }
      setOpen([]);
    }, hit ? 350 : 950);
  };
  return <Frame title={L("Linganisha maneno", "Match the words")} onBack={onBack} host="mwalimu" say={won.length === PAIRS.length ? L(`Hongera! Umemaliza kwa majaribio ${tries}.`, `Well done! You finished in ${tries} tries.`) : L("Fungua kadi mbili zinazoendana.", "Open two cards that belong together.")}>
    <div className="memory">
      {cards.map((c, i) => {
        const up = open.includes(i) || won.includes(c.pair);
        return <button key={i} className="memo" data-up={up} data-won={won.includes(c.pair)} aria-label={up ? T(c.text) : L(`Kadi ${i + 1}`, `Card ${i + 1}`)} onClick={() => pick(i)}>{up ? T(c.text) : "?"}</button>;
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
    <button className="link back" onClick={onBack}><ArrowLeft size={16} aria-hidden /> {L("Rudi kwenye michezo", "Back to games")}</button>
    <h2>{title}</h2>
    <div className="line-row guide"><Person look={host} size={48} /><div className="bubble"><p>{say}</p><Listen text={say} /></div></div>
    {children}
  </div>;
}

export function Games() {
  const L = useL();
  const [g, setG] = useState("");
  if (g === "match") return <Match onBack={() => setG("")} />;
  if (g === "share") return <Share onBack={() => setG("")} />;
  if (g === "flags") return <Flags onBack={() => setG("")} />;
  const list: [string, typeof Shuffle, string, string, string][] = [
    ["match", Shuffle, "mwalimu", L("Linganisha maneno", "Match the words"), L("Kumbuka maneno muhimu ya kaboni", "Remember the key carbon words")],
    ["share", Coins, "bibi", L("Hesabu ya mgao", "Work out the share"), L("40% ya nini? Fanya hesabu sokoni", "40% of what? Do the market maths")],
    ["flags", Flag, "mama", L("Bendera nyekundu", "Red flags"), L("Tambua vifungu vya kuuliza zaidi", "Spot clauses that need more questions")],
  ];
  return <div className="lessons">
    {list.map(([id, Icon, look, name, sub]) => (
      <button key={id} className="game card" onClick={() => setG(id)}><Person look={look} size={56} /><span><b>{name}</b><small className="muted">{sub}</small>{best(id) > 0 && <small className="muted"><Icon size={12} aria-hidden /> {L("Bora", "Best")}: {best(id)}</small>}</span></button>
    ))}
  </div>;
}
