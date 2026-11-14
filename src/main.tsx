import { BarChart3, BookOpen, CircleUserRound, Home, LogOut, MessageCircle, ShieldCheck, Users, Wrench, X } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Lang } from "../shared/content";
import { AudioToggle } from "./audio";
import { Auth } from "./auth";
import { Ctx, Avatar, DEMO, Loading, Mascot, api, installApp, useApp, useL, type Me } from "./core";
import { DemoAuth } from "./demo-auth";
// Each page loads only when opened, so the first screen arrives fast on a slow phone network.
const Admin = lazy(() => import("./admin").then((m) => ({ default: m.Admin })));
const Chat = lazy(() => import("./chat").then((m) => ({ default: m.Chat })));
const Learn = lazy(() => import("./learn").then((m) => ({ default: m.Learn })));
const Circles = lazy(() => import("./learn").then((m) => ({ default: m.Circles })));
const Tools = lazy(() => import("./learn").then((m) => ({ default: m.Tools })));
const HomePage = lazy(() => import("./home").then((m) => ({ default: m.HomePage })));
const Profile = lazy(() => import("./home").then((m) => ({ default: m.Profile })));
import "./styles.css";

function Shell({ children }: { children: React.ReactNode }) {
  const { me, route, go, lang, setLang, refresh } = useApp();
  const L = useL();
  const isAdmin = me!.role === "admin";
  // The demo notice can be closed, which gives the chat more room on a phone.
  const [hideDemo, setHideDemo] = useState(() => { try { return localStorage.getItem("jlc-demo-bar") === "1"; } catch { return false; } });
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
        {DEMO && !hideDemo && <p className="demo-bar"><span>{L("Onyesho: data ya mfano ni ya kubuni, na unachoandika kinabaki kwenye kifaa hiki. AI ya moja kwa moja na WhatsApp hazijaunganishwa.", "Demo: sample data is fictional and what you type stays on this device. Live AI and WhatsApp are not connected.")}</span><button className="icon" aria-label={L("Funga ujumbe", "Close notice")} onClick={() => { setHideDemo(true); try { localStorage.setItem("jlc-demo-bar", "1"); } catch { /* shows again next visit */ } }}><X size={16} aria-hidden /></button></p>}
        <main id="main"><Suspense fallback={<Loading />}>{children}</Suspense></main>
      </div>
    </div>
  );
}


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
