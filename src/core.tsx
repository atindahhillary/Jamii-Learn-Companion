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

// The friendly guide: an acacia with a face, drawn inline so it loads on weak networks.
export const Mascot = ({ size = 96 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Msaidizi">
    <ellipse cx="60" cy="108" rx="38" ry="7" fill="#d9cfe9" />
    <rect x="52" y="62" width="16" height="44" rx="7" fill="#c98a4b" />
    <path d="M60 12C32 12 12 28 12 48c0 15 14 26 30 26h36c16 0 30-11 30-26 0-20-20-36-48-36z" fill="#7cc98a" />
    <path d="M28 36c6-10 16-15 28-16" stroke="#a6e0ae" strokeWidth="5" strokeLinecap="round" fill="none" />
    <circle cx="46" cy="46" r="5" fill="#2a1a3d" /><circle cx="74" cy="46" r="5" fill="#2a1a3d" />
    <circle cx="48" cy="44" r="1.6" fill="#fff" /><circle cx="76" cy="44" r="1.6" fill="#fff" />
    <path d="M50 57c6 6 14 6 20 0" stroke="#2a1a3d" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="36" cy="55" r="4.5" fill="#f4a9b8" opacity=".8" /><circle cx="84" cy="55" r="4.5" fill="#f4a9b8" opacity=".8" />
  </svg>
);

export const Avatar = ({ name, color = "#6250d6", size = 40 }: { name: string; color?: string; size?: number }) => (
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
