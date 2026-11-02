import { useId } from "react";

// One drawn family of Maasai characters, so every person in the app shares a style. Inline SVG keeps it light on weak networks.
export type Look = { skin: string; shuka: string; dark: string; bg: string; hair: "grey" | "shaved" | "ochre" | "short"; female: boolean; beads: string[] };
export const LOOKS: Record<string, Look> = {
  elder: { skin: "#6f4329", shuka: "#c1272d", dark: "#7d1216", bg: "#bfe3ee", hair: "grey", female: false, beads: ["#c1272d", "#f6c453", "#2a78d6", "#fff"] },
  mama: { skin: "#7a4a2d", shuka: "#2a5fb0", dark: "#173d78", bg: "#fbe0b8", hair: "shaved", female: true, beads: ["#f6c453", "#c1272d", "#fff", "#2a78d6"] },
  moran: { skin: "#7f4d2e", shuka: "#d6402f", dark: "#8c1f16", bg: "#d8ecc4", hair: "ochre", female: false, beads: ["#fff", "#c1272d", "#178a55", "#f6c453"] },
  dada: { skin: "#84512f", shuka: "#7a3fa0", dark: "#4d2569", bg: "#f6d7d0", hair: "shaved", female: true, beads: ["#2a78d6", "#fff", "#f6c453", "#c1272d"] },
  kijana: { skin: "#5f3a24", shuka: "#178a55", dark: "#0c5534", bg: "#fdeeb8", hair: "short", female: false, beads: ["#f6c453", "#fff", "#c1272d", "#2a78d6"] },
  bibi: { skin: "#6a3f27", shuka: "#e0792b", dark: "#9c4c12", bg: "#dbe9f3", hair: "grey", female: true, beads: ["#c1272d", "#fff", "#2a78d6", "#f6c453"] },
  mwalimu: { skin: "#744529", shuka: "#b8326a", dark: "#7b1c45", bg: "#d6ecf2", hair: "short", female: true, beads: ["#fff", "#f6c453", "#178a55", "#c1272d"] },
  mfugaji: { skin: "#6a4028", shuka: "#23407a", dark: "#121f42", bg: "#f4e3c1", hair: "short", female: false, beads: ["#c1272d", "#f6c453", "#fff", "#178a55"] },
};
const KEYS = Object.keys(LOOKS);

export const SEAT_LOOK: Record<string, string> = { all: "elder", kaboni: "moran", wakili: "mama", mzee: "elder", malisho: "mfugaji", mwalimu: "mwalimu", mchambuzi: "bibi", mlinzi: "dada" };

export function lookFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return KEYS[h % KEYS.length];
}

export function Person({ look = "elder", size = 40, label, x, y }: { look?: string; size?: number; label?: string; x?: number; y?: number }) {
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const l = LOOKS[look] ?? LOOKS.elder;
  const hairColor = l.hair === "grey" ? "#d9d6cf" : l.hair === "ochre" ? "#a8452a" : "#1c120c";
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 120 120" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="person">
      <clipPath id={id}><circle cx="60" cy="60" r="60" /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="120" height="120" fill={l.bg} />
        <path d="M0 96c22-12 44-14 66-8s38 4 54-6v38H0z" fill="#8db86a" />
        <path d="M12 120c2-28 24-40 48-40s46 12 48 40z" fill={l.shuka} />
        <path d="M26 96l40 24M44 86l44 34M84 88l-36 32M100 100l-22 20M20 108l14 12" stroke={l.dark} strokeWidth="2.5" />
        <path d="M12 120c6-20 18-30 34-36l30 36z" fill={l.shuka} opacity=".82" />
        <rect x="50" y="62" width="20" height="24" rx="9" fill={l.skin} />
        <path d="M31 80q29 34 58 0" fill="none" stroke={l.beads[3]} strokeWidth="5" strokeDasharray="4 3" />
        <path d="M36 77q24 27 48 0" fill="none" stroke={l.beads[2]} strokeWidth="5" />
        <path d="M41 74q19 19 38 0" fill="none" stroke={l.beads[1]} strokeWidth="5" />
        <path d="M45 71q15 12 30 0" fill="none" stroke={l.beads[0]} strokeWidth="4" />
        {l.female && <path d="M25 83q35 42 70 0" fill="none" stroke={l.beads[0]} strokeWidth="4" strokeDasharray="2 3" />}
        <circle cx="37" cy="47" r="4.5" fill={l.skin} /><circle cx="83" cy="47" r="4.5" fill={l.skin} />
        <path d="M37 52v9M83 52v9" stroke={l.beads[1]} strokeWidth="2.5" />
        <circle cx="37" cy="63" r="2.8" fill={l.beads[0]} /><circle cx="83" cy="63" r="2.8" fill={l.beads[2]} />
        {l.female && <><path d="M34 54v14M86 54v14" stroke={l.beads[3]} strokeWidth="2" strokeDasharray="2 2" /><circle cx="34" cy="70" r="2.4" fill={l.beads[1]} /><circle cx="86" cy="70" r="2.4" fill={l.beads[1]} /></>}
        {l.hair === "ochre" && <path d="M36 44c-3 14-5 22-3 30M41 34c-5 16-6 28-5 38M84 44c3 14 5 22 3 30M79 34c5 16 6 28 5 38" stroke={hairColor} strokeWidth="5" fill="none" strokeLinecap="round" />}
        <ellipse cx="60" cy="45" rx="23" ry="27" fill={l.skin} />
        {l.hair === "shaved"
          ? <path d="M38 38c0-22 44-22 44 0-6-9-38-9-44 0z" fill={l.skin} opacity=".75" />
          : <path d="M37 42c-1-26 47-26 46 0-6-11-40-11-46 0z" fill={hairColor} />}
        <path d="M38 37q22-10 44 0" fill="none" stroke={l.beads[1]} strokeWidth="3.5" />
        <path d="M38 37q22-10 44 0" fill="none" stroke={l.beads[0]} strokeWidth="3.5" strokeDasharray="3 5" />
        <circle cx="51" cy="45" r="2.6" fill="#1c120c" /><circle cx="69" cy="45" r="2.6" fill="#1c120c" />
        <path d="M46 39q5-3 9 0M65 39q5-3 9 0" stroke={l.hair === "grey" ? hairColor : "#1c120c"} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M50 57q10 9 20 0z" fill="#fff" stroke="#3a2013" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
