import { Person } from "./avatars";
import { useL } from "./core";

type L = (sw: string, en: string) => string;
const Label = ({ x, y, t, bold, anchor = "middle", fill = "#1d2b22" }: { x: number; y: number; t: string; bold?: boolean; anchor?: "middle" | "start" | "end"; fill?: string }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize="12" fontWeight={bold ? 700 : 500} fill={fill}>{t}</text>
);
const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
  <g stroke="#8a6a2f" strokeWidth="2.5" fill="none"><path d="M0 0" /><line x1={x1} y1={y1} x2={x2} y2={y2} /><path d={`M${x2 - 6} ${y2 - 5}l6 5-6 5`} /></g>
);
const Tree = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-3" y="-30" width="6" height="30" fill="#7a4f2e" /><ellipse cy="-36" rx="24" ry="11" fill="#2f7d5b" /></g>
);

// m1: a credit travels from the land to a buyer and is then retired.
const Credit = (L: L) => <>
  <Tree x={56} y={110} s={1.1} />
  <Label x={56} y={130} t={L("Ardhi inatunzwa", "Land is cared for")} />
  <Arrow x1={92} y1={80} x2={124} y2={80} />
  <rect x="130" y="52" width="92" height="56" rx="8" fill="#fbeec6" stroke="#c9a23f" />
  <Label x={176} y={76} t={L("Mkopo 1", "1 credit")} bold /><Label x={176} y={94} t={L("= tani 1 CO2", "= 1 tonne CO2")} />
  <Arrow x1={228} y1={80} x2={260} y2={80} />
  <Person look="kijana" size={56} x={276} y={50} />
  <Label x={304} y={130} t={L("Mnunuzi", "Buyer")} />
  <rect x="96" y="150" width="168" height="26" rx="13" fill="#dcebd6" /><Label x={180} y={168} t={L("Ukitumiwa unastaafishwa", "Used once, then retired")} bold />
</>;

// m2: carbon goes into soil with rain and care, and out with drought and overgrazing.
const Soil = (L: L) => <>
  <rect y="96" width="360" height="104" fill="#a9825a" /><rect y="86" width="360" height="14" fill="#7fae5c" />
  <Tree x={70} y={92} /><Tree x={286} y={92} s={.8} />
  <path d="M128 34v44M122 68l6 8 6-8" stroke="#2a78d6" strokeWidth="3" fill="none" /><Label x={128} y={26} t={L("Mvua na utunzaji", "Rain and care")} />
  <path d="M232 76v-40M226 44l6-8 6 8" stroke="#c8572a" strokeWidth="3" fill="none" /><Label x={232} y={26} t={L("Ukame, malisho mengi", "Drought, overgrazing")} />
  <rect x="96" y="124" width="168" height="44" rx="8" fill="#fffefa" /><Label x={180} y={143} t={L("Kaboni kwenye udongo", "Carbon in the soil")} bold /><Label x={180} y={160} t={L("kama akiba benki", "like savings in a bank")} />
</>;

// m3: credits are the gap between the project and the baseline, so an inflated baseline makes false credits.
const Baseline = (L: L) => <>
  <line x1="40" y1="164" x2="340" y2="164" stroke="#566459" /><line x1="40" y1="24" x2="40" y2="164" stroke="#566459" />
  <path d="M40 130L330 150L330 62L40 130Z" fill="#dcebd6" />
  <path d="M40 130L330 150" stroke="#c8572a" strokeWidth="3" strokeDasharray="6 4" fill="none" />
  <path d="M40 130L330 62" stroke="#2f7d5b" strokeWidth="3" fill="none" />
  <Label x={332} y={52} t={L("Na mradi", "With project")} anchor="end" bold />
  <Label x={230} y={110} t={L("Mikopo", "Credits")} bold />
  <Label x={200} y={182} t={L("Msingi: makisio bila mradi", "Baseline: estimate without project")} />
  <Label x={46} y={22} t={L("Kaboni", "Carbon")} anchor="start" />
</>;

// m4: ownership stays with the community while a contract can still restrict use.
const Rights = (L: L) => <>
  <rect x="24" y="30" width="312" height="120" rx="10" fill="#dcebd6" stroke="#1f4d3a" strokeWidth="2.5" strokeDasharray="8 5" />
  <Label x={180} y={22} t={L("Ardhi ya jamii: umiliki unabaki", "Community land: ownership stays")} bold />
  <path d="M30 118c60-30 120 20 170-6s80-30 130-22" stroke="#b9925a" strokeWidth="6" fill="none" strokeDasharray="10 6" />
  <Label x={92} y={134} t={L("Njia ya mifugo", "Cattle path")} />
  <circle cx="288" cy="60" r="11" fill="#5bb0d0" /><Label x={288} y={84} t={L("Kisima", "Well")} />
  <rect x="120" y="44" width="110" height="46" rx="8" fill="#f8e0cf" stroke="#c8572a" />
  <Label x={175} y={63} t={L("Mkataba unaweza", "A contract can")} bold /><Label x={175} y={80} t={L("kuzuia matumizi", "restrict use")} />
  <Label x={180} y={176} t={L("Soma masharti ya malisho na kuhama", "Read the grazing and movement terms")} />
</>;

// m5: the four words of FPIC, each with a person.
const Fpic = (L: L) => {
  const steps: [string, string, string][] = [["mama", L("Huru", "Free"), L("bila shinikizo", "no pressure")], ["moran", L("Awali", "Prior"), L("kabla ya mradi", "before start")], ["dada", L("Taarifa", "Informed"), L("lugha yetu", "our language")], ["elder", L("Ridhaa", "Consent"), L("ndiyo au hapana", "yes or no")]];
  return <>{steps.map(([look, a, b], i) => (
    <g key={a}><Person look={look} size={58} x={18 + i * 84} y={36} /><Label x={47 + i * 84} y={116} t={a} bold /><Label x={47 + i * 84} y={134} t={b} />{i < 3 && <Arrow x1={80 + i * 84} y1={65} x2={98 + i * 84} y2={65} />}</g>
  ))}<Label x={180} y={170} t={L("Kikikosekana kimoja, si ridhaa", "If one is missing, it is not consent")} bold /></>;
};

// m6: the worked example from regulation 29.
const Share = (L: L) => <>
  <Label x={20} y={30} t={L("Mapato: 10m", "Earnings: 10m")} anchor="start" bold />
  <rect x="20" y="38" width="176" height="30" fill="#c8572a" /><rect x="198" y="38" width="142" height="30" fill="#2f7d5b" />
  <Label x={108} y={58} t={L("Gharama 6m", "Costs 6m")} fill="#fff" bold /><Label x={269} y={58} t={L("Salio 4m", "Left 4m")} fill="#fff" bold />
  <path d="M198 72l-30 34M340 72l-58 34" stroke="#8a6a2f" strokeDasharray="4 4" fill="none" />
  <rect x="168" y="108" width="114" height="30" fill="#f6c453" /><Label x={225} y={128} t={L("40% = 1.6m", "40% = 1.6m")} bold />
  <Person look="bibi" size={52} x={100} y={100} />
  <Label x={180} y={170} t={L("Sio 4m! Uliza gharama ni zipi.", "Not 4m! Ask what the costs are.")} bold />
</>;

// m7: who sits on the CDA committee.
const Committee = (L: L) => {
  const seats: [string, string][] = [["mama", L("Wanawake", "Women")], ["elder", L("Wazee", "Elders")], ["moran", L("Vijana", "Youth")], ["dada", L("Pembezoni", "Marginalised")], ["bibi", L("Ulemavu", "Disability")], ["mfugaji", L("AZAKI", "CSOs")]];
  return <>{seats.map(([look, n], i) => (
    <g key={n}><Person look={look} size={46} x={14 + i * 57} y={36} /><text x={37 + i * 57} y={100} textAnchor="middle" fontSize="10" fontWeight="600" fill="#1d2b22">{n}</text></g>
  ))}
    <rect x="50" y="116" width="260" height="30" rx="15" fill="#dcebd6" /><Label x={180} y={136} t={L("Wanachaguliwa na jamii", "Elected by the community")} bold />
    <Label x={180} y={172} t={L("Mwenyekiti: si mwanasiasa", "Chair: not a politician")} />
  </>;
};

// m8: a traffic light for how far to trust AI.
const Trust = (L: L) => {
  const rows: [string, string, string][] = [["#2f9e62", L("Tumia AI", "Use AI"), L("eleza neno, toa mfano", "explain a word, give an example")], ["#eda100", L("Hakiki", "Check"), L("pesa, sheria, ardhi", "money, law, land")], ["#c8372d", L("Usiweke", "Never enter"), L("PIN, kitambulisho, siri", "PIN, ID, secrets")]];
  return <>
    <rect x="30" y="20" width="44" height="150" rx="12" fill="#2b2b28" />
    {rows.map(([c, a, b], i) => <g key={a}><circle cx="52" cy={46 + i * 49} r="17" fill={c} /><Label x={92} y={42 + i * 49} t={a} anchor="start" bold /><Label x={92} y={59 + i * 49} t={b} anchor="start" /></g>)}
    <Label x={92} y={186} t={L("Uamuzi ni wa jamii", "The decision is the community's")} anchor="start" bold />
  </>;
};

const ART: Record<string, { draw: (L: L) => React.ReactNode; alt: [string, string] }> = {
  m1: { draw: Credit, alt: ["Mkopo wa kaboni unatoka ardhini kwenda kwa mnunuzi, kisha unastaafishwa.", "A carbon credit moves from the land to a buyer, then is retired."] },
  m2: { draw: Soil, alt: ["Mvua huongeza kaboni udongoni, ukame huipunguza.", "Rain adds carbon to soil, drought takes it away."] },
  m3: { draw: Baseline, alt: ["Mikopo ni tofauti kati ya mradi na msingi.", "Credits are the gap between the project and the baseline."] },
  m4: { draw: Rights, alt: ["Ardhi inabaki ya jamii lakini mkataba unaweza kuzuia matumizi.", "The land stays the community's but a contract can restrict use."] },
  m5: { draw: Fpic, alt: ["Hatua nne za FPIC: huru, awali, taarifa, ridhaa.", "Four parts of FPIC: free, prior, informed, consent."] },
  m6: { draw: Share, alt: ["Mapato 10m, gharama 6m, salio 4m, na 40% ni 1.6m.", "Earnings 10m, costs 6m, 4m left, and 40% is 1.6m."] },
  m7: { draw: Committee, alt: ["Kamati ya CDA ina wawakilishi waliochaguliwa wa makundi yote.", "The CDA committee has elected representatives of every group."] },
  m8: { draw: Trust, alt: ["Taa ya kuamini AI: tumia, hakiki, usiweke.", "A traffic light for AI: use it, check it, never enter secrets."] },
};

export function Picture({ id }: { id: string }) {
  const L = useL();
  const art = ART[id];
  if (!art) return null;
  return <svg className="picture" viewBox="0 0 360 200" role="img" aria-label={L(art.alt[0], art.alt[1])}>{art.draw(L)}</svg>;
}
