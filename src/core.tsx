import { createContext, useContext, useEffect, useState } from "react";
import type { Lang, T } from "../shared/content";

export type Me = {
  id: string; name: string; role: "learner" | "admin"; lang: Lang; audience: string; village: string | null;
  consentAi: boolean; consentShare: boolean; intakeStep: number; intakeTotal: number; phone: string;
  community: { name: string; county: string } | null; whatsapp: boolean;
};

export const DEMO = !!import.meta.env.VITE_DEMO;

export async function api<R = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<R> {
  if (DEMO) return (await import("./demo")).demoApi(path, opts.method ?? (opts.body ? "POST" : "GET"), opts.body ?? {});
  const r = await fetch(`/api${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", "x-ky": "1" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error ?? "server"), { status: r.status });
  return data;
}

export function useData<R>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<R | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => api<R>(path).then((d) => { setData(d); setFailed(false); }).catch(() => setFailed(true));
  useEffect(() => { load(); }, [path, ...deps]);
  return { data, failed, reload: load };
}

export const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; me: Me | null; refresh: () => void; go: (r: string) => void; route: string }>(null as any);
export const useApp = () => useContext(Ctx);
export const useL = () => {
  const { lang } = useApp();
  return (sw: string, en: string) => (lang === "sw" ? sw : en);
};
export const useT = () => {
  const { lang } = useApp();
  return (t: T) => t[lang];
};

export const Loading = () => {
  const L = useL();
  return <p className="muted pad" role="status">{L("Inapakia...", "Loading...")}</p>;
};
export const Failed = ({ retry }: { retry: () => void }) => {
  const L = useL();
  return <div className="pad"><p>{L("Imeshindikana kupakia. Angalia mtandao wako.", "Could not load. Check your connection.")}</p><button className="btn" onClick={retry}>{L("Jaribu tena", "Try again")}</button></div>;
};

// The guide: a Maasai elder in a red shuka and beaded collar, drawn inline so it loads on weak networks.
export const Mascot = ({ size = 96 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Msaidizi">
    <clipPath id="ma"><circle cx="60" cy="60" r="60" /></clipPath>
    <g clipPath="url(#ma)">
      <rect width="120" height="120" fill="#bfe3ee" />
      <circle cx="92" cy="26" r="15" fill="#f6c453" />
      <path d="M0 92c22-12 44-14 66-8s38 4 54-6v42H0z" fill="#7fae5c" />
      <path d="M12 120c2-28 24-40 48-40s46 12 48 40z" fill="#c1272d" />
      <path d="M26 96l40 24M44 86l44 34M84 88l-36 32M100 100l-22 20M20 108l14 12" stroke="#7d1216" strokeWidth="2.5" />
      <path d="M12 120c6-20 18-30 34-36l30 36z" fill="#d6403f" />
      <rect x="50" y="62" width="20" height="24" rx="9" fill="#5a3320" />
      <path d="M31 80q29 34 58 0" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="4 3" />
      <path d="M36 77q24 27 48 0" fill="none" stroke="#2a78d6" strokeWidth="5" />
      <path d="M41 74q19 19 38 0" fill="none" stroke="#f6c453" strokeWidth="5" />
      <path d="M45 71q15 12 30 0" fill="none" stroke="#c1272d" strokeWidth="4" />
      <circle cx="37" cy="47" r="4.5" fill="#5f3623" /><circle cx="83" cy="47" r="4.5" fill="#5f3623" />
      <path d="M37 52v9M83 52v9" stroke="#f6c453" strokeWidth="2.5" />
      <circle cx="37" cy="63" r="2.8" fill="#c1272d" /><circle cx="83" cy="63" r="2.8" fill="#2a78d6" />
      <ellipse cx="60" cy="45" rx="23" ry="27" fill="#6f4329" />
      <path d="M37 42c-1-26 47-26 46 0-6-11-40-11-46 0z" fill="#1c120c" />
      <path d="M38 37q22-10 44 0" fill="none" stroke="#f6c453" strokeWidth="3.5" />
      <path d="M38 37q22-10 44 0" fill="none" stroke="#c1272d" strokeWidth="3.5" strokeDasharray="3 5" />
      <circle cx="51" cy="45" r="2.6" fill="#1c120c" /><circle cx="69" cy="45" r="2.6" fill="#1c120c" />
      <path d="M46 39q5-3 9 0M65 39q5-3 9 0" stroke="#1c120c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M50 57q10 9 20 0z" fill="#fff" stroke="#3a2013" strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  </svg>
);

export const Landscape = () => (
  <svg className="land" viewBox="0 0 800 220" preserveAspectRatio="xMidYMax slice" aria-hidden>
    <circle cx="620" cy="96" r="52" fill="#f6c453" opacity=".9" />
    <path d="M0 150c120-50 240-50 360-20s300 20 440-40v130H0z" fill="#2f7d5b" opacity=".55" />
    <path d="M0 186c160-36 300-30 460-10s240 4 340-20v64H0z" fill="#17392b" />
    <path d="M196 182v-58" stroke="#17392b" strokeWidth="7" />
    <path d="M196 140l-34-22M196 132l32-20M196 150l22-12" stroke="#17392b" strokeWidth="4" />
    <path d="M120 112c26-22 128-24 158 0-24 12-134 14-158 0z" fill="#17392b" />
  </svg>
);

export const Avatar = ({ name, color = "#2f7d5b", size = 40 }: { name: string; color?: string; size?: number }) => (
  <span className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
    {name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
  </span>
);

let promptEvent: any = null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); promptEvent = e; });
export async function installApp(): Promise<"done" | "ios" | "manual"> {
  if (promptEvent) { await promptEvent.prompt(); promptEvent = null; return "done"; }
  return /iphone|ipad/i.test(navigator.userAgent) ? "ios" : "manual";
}
