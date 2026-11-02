import { useState } from "react";

const W = 640, H = 220, P = { l: 34, r: 12, t: 12, b: 26 };

export function AreaChart({ rows, series, label }: { rows: any[]; series: { key: string; name: string; color: string }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...rows.flatMap((r) => series.map((s) => r[s.key])));
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, rows.length - 1);
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b);
  const ticks = [0, Math.round(max / 2), max];
  return (
    <figure className="chart">
      <div className="legend">{series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.name}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(rows.length - 1, Math.round((((e.clientX - b.left) / b.width) * W - P.l) / ((W - P.l - P.r) / Math.max(1, rows.length - 1)))))); }}>
        {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#ece8f3" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="tick">{t}</text></g>)}
        {rows.map((r, i) => i % Math.ceil(rows.length / 7) === 0 && <text key={i} x={x(i)} y={H - 6} textAnchor={i === rows.length - 1 ? "end" : "middle"} className="tick">{r.day}</text>)}
        {series.map((s) => {
          const line = rows.map((r, i) => `${x(i)},${y(r[s.key])}`).join(" L");
          return <g key={s.key}><path d={`M${line} L${x(rows.length - 1)},${y(0)} L${x(0)},${y(0)}Z`} fill={s.color} opacity=".14" /><path d={`M${line}`} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" /></g>;
        })}
        {hover != null && <g><line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#b9b0c9" />
          {series.map((s) => <circle key={s.key} cx={x(hover)} cy={y(rows[hover][s.key])} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />)}</g>}
      </svg>
      {hover != null && <div className="tip" style={{ left: `${(x(hover) / W) * 100}%` }}><b>{rows[hover].day}</b>{series.map((s) => <div key={s.key}>{s.name}: {rows[hover][s.key]}</div>)}</div>}
    </figure>
  );
}

export function Donut({ parts, center, sub, label }: { parts: { name: string; value: number; color: string }[]; center: string; sub: string; label: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const R = 70, C = 2 * Math.PI * R, GAP = 4;
  let off = 0;
  return (
    <figure className="donut">
      <svg viewBox="0 0 180 180" role="img" aria-label={`${label}: ${parts.map((p) => `${p.name} ${p.value}`).join(", ")}`}>
        <g transform="rotate(-90 90 90)">
          {parts.filter((p) => p.value > 0).map((p) => {
            const len = (p.value / total) * C, el = <circle key={p.name} cx="90" cy="90" r={R} fill="none" stroke={p.color} strokeWidth="20" strokeDasharray={`${Math.max(1, len - GAP)} ${C}`} strokeDashoffset={-off}><title>{p.name}: {p.value}</title></circle>;
            off += len;
            return el;
          })}
        </g>
        <text x="90" y="88" textAnchor="middle" className="big">{center}</text>
        <text x="90" y="108" textAnchor="middle" className="tick">{sub}</text>
      </svg>
      <div className="legend">{parts.map((p) => <span key={p.name}><i style={{ background: p.color }} />{p.name} ({p.value})</span>)}</div>
    </figure>
  );
}

export const Bars = ({ rows }: { rows: { name: string; value: number; note?: string }[] }) => (
  <ul className="bars">
    {rows.map((r) => (
      <li key={r.name}>
        <span className="row-between"><span>{r.name}</span><b>{r.value}</b></span>
        <span className="track" role="meter" aria-valuenow={r.value} aria-valuemin={0} aria-valuemax={100} aria-label={r.name}><span style={{ width: `${r.value}%` }} /></span>
        {r.note && <small className="muted">{r.note}</small>}
      </li>
    ))}
  </ul>
);
