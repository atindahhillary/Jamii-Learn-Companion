import { BarChart3, BookOpen, CircleUserRound, Download, Home, LogOut, MessageCircle, ShieldCheck, Users, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Lang } from "../shared/content";
import { Admin } from "./admin";
import { AudioToggle } from "./audio";
import { Auth } from "./auth";
import { Chat } from "./chat";
import { Ctx, Avatar, DEMO, Loading, Mascot, api, installApp, useApp, useL, type Me } from "./core";
import { DemoAuth } from "./demo-auth";
import { Circles, Learn, Tools } from "./learn";
import { HomePage, Profile } from "./home";
import "./styles.css";

function Shell({ children }: { children: React.ReactNode }) {
  const { me, route, go, lang, setLang, refresh } = useApp();
  const L = useL();
  const isAdmin = me!.role === "admin";
  const nav = isAdmin
    ? [["admin", BarChart3, L("Dashibodi", "Dashboard")], ["circles", Users, L("Makundi", "Circles")], ["chat", MessageCircle, L("Msaidizi", "Assistant")], ["profile", CircleUserRound, L("Wasifu", "Profile")]]
    : [["home", Home, L("Nyumbani", "Home")], ["chat", MessageCircle, L("Msaidizi", "Assistant")], ["learn", BookOpen, L("Mafunzo", "Learn")], ["circles", Users, L("Makundi", "Circles")], ["tools", Wrench, L("Zana", "Tools")], ["profile", CircleUserRound, L("Wasifu", "Profile")]];
  const look = route === "chat" ? "plum" : isAdmin ? "vivid" : "soft";
  const top = route.split("/")[0];
  return (
    <div className="shell" data-look={look}>
      <a className="skip" href="#main">{L("Ruka hadi maudhui", "Skip to content")}</a>
      <aside className="side">
        <div className="brand"><Mascot size={38} /><span>Jamii Learn Companion</span></div>
        {look === "soft" && <div className="me-card"><Mascot size={84} /><b>{me!.name}</b><small>{me!.community?.name ?? L("Mshiriki", "Learner")}</small></div>}
        <nav aria-label={L("Menyu kuu", "Main menu")}>
          {nav.map(([id, Icon, name]: any) => (
            <button key={id} className="nav" aria-current={top === id ? "page" : undefined} onClick={() => go(id)}><Icon size={20} aria-hidden /><span>{name}</span></button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="nav" onClick={async () => { await api("/auth/logout", { method: "POST" }); refresh(); }}><LogOut size={20} aria-hidden /><span>{L("Toka", "Sign out")}</span></button>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          {isAdmin && <span className="pill"><ShieldCheck size={15} aria-hidden /> {L("Msimamizi", "Admin mode")}</span>}
          <span className="grow" />
          <AudioToggle />
          <div className="lang" role="group" aria-label={L("Lugha", "Language")}>
            {(["sw", "en"] as Lang[]).map((l) => <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === "sw" ? "Kiswahili" : "English"}</button>)}
          </div>
          <Avatar name={me!.name} />
        </header>
        {DEMO && <p className="demo-bar">{L("Onyesho: data ya mfano ni ya kubuni, na unachoandika kinabaki kwenye kifaa hiki. AI ya moja kwa moja na WhatsApp hazijaunganishwa.", "Demo: sample data is fictional and what you type stays on this device. Live AI and WhatsApp are not connected.")}</p>}
        <main id="main">{children}</main>
      </div>
    </div>
  );
}

export const InstallButton = () => {
  const L = useL();
  const [hint, setHint] = useState("");
  return (
    <>
      <button className="btn ghost" onClick={async () => {
        const r = await installApp();
        if (r === "ios") setHint(L("Kwenye iPhone: bonyeza Share, kisha 'Add to Home Screen'.", "On iPhone: tap Share, then 'Add to Home Screen'."));
        if (r === "manual") setHint(L("Fungua menyu ya kivinjari, kisha chagua 'Install app' au 'Add to Home screen'.", "Open the browser menu, then choose 'Install app' or 'Add to Home screen'."));
      }}><Download size={18} aria-hidden /> {L("Weka kwenye simu", "Install on phone")}</button>
      {hint && <p className="muted small" role="status">{hint}</p>}
    </>
  );
};

function App() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [lang, setLangState] = useState<Lang>(() => { try { return (localStorage.getItem("ky-lang") as Lang) || "sw"; } catch { return "sw"; } });
  const [route, setRoute] = useState(() => location.hash.slice(1));
  const refresh = () => api<Me>("/me").then((m) => { setMe(m); setLangState(m.lang); }).catch(() => setMe(null));
  useEffect(() => { refresh(); }, []);
  useEffect(() => { const f = () => setRoute(location.hash.slice(1)); addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("ky-lang", l); } catch { /* private mode */ }
    if (me) api("/me", { method: "PATCH", body: { lang: l } }).catch(() => undefined);
  };
  const go = (r: string) => { location.hash = r; };
  const value = { lang, setLang, me: me ?? null, refresh, go, route };
  if (me === undefined) return <Ctx.Provider value={value}><Loading /></Ctx.Provider>;
  if (!me) return <Ctx.Provider value={value}>{DEMO ? <DemoAuth /> : <Auth />}</Ctx.Provider>;
  const r = route.split("/")[0] || (me.role === "admin" ? "admin" : "home");
  const page = r === "chat" ? <Chat /> : r === "learn" ? <Learn /> : r === "circles" ? <Circles /> : r === "tools" ? <Tools /> : r === "profile" ? <Profile /> : r === "admin" && me.role === "admin" ? <Admin /> : <HomePage />;
  return <Ctx.Provider value={{ ...value, route: r }}><Shell>{page}</Shell></Ctx.Provider>;
}

createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("/sw.js");
