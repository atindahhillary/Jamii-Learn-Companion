import { createContext, useContext, useEffect, useState } from "react";
import type { Lang, T } from "../shared/content";
import { Person, lookFor } from "./avatars";

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

// The guide, shown as the elder of the Maasai character family.
export const Mascot = ({ size = 96 }: { size?: number }) => <Person look="elder" size={size} label="Mzee Sironka" />;

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

export const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => <Person look={lookFor(name)} size={size} />;

let promptEvent: any = null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); promptEvent = e; });
export async function installApp(): Promise<"done" | "ios" | "manual"> {
  if (promptEvent) { await promptEvent.prompt(); promptEvent = null; return "done"; }
  return /iphone|ipad/i.test(navigator.userAgent) ? "ios" : "manual";
}
