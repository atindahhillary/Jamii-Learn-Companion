import { ShieldCheck, Sprout } from "lucide-react";
import { useState } from "react";
import { AUDIENCES, type Audience } from "../shared/content";
import { Mascot, useApp, useL, useT } from "./core";
import { demoSignIn } from "./demo";

export function DemoAuth() {
  const { refresh, lang, setLang } = useApp();
  const L = useL(), T = useT();
  const [name, setName] = useState(""), [audience, setAudience] = useState<Audience>("herder");
  const enter = (role: "learner" | "admin") => { demoSignIn(role, name.trim().slice(0, 40), lang, audience); refresh(); };
  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="lang" role="group" aria-label={L("Lugha", "Language")}>
          <button aria-pressed={lang === "sw"} onClick={() => setLang("sw")}>Kiswahili</button>
          <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
        </div>
        <Mascot size={120} />
        <h1>Jamii Learn Companion</h1>
        <p>{L("Ardhi yetu. Sauti yetu. Uamuzi wetu.", "Our land. Our voice. Our decision.")}</p>
        <ul>
          <li>{L("Tuambie unachojua na kinachokutia wasiwasi", "Tell us what you know and what worries you")}</li>
          <li>{L("Pata mafunzo yanayotokana na mahitaji ya jamii yako", "Get training built from your community's needs")}</li>
          <li>{L("Jifunze kwenye simu, pamoja na wenzako", "Learn on your phone, with your peers")}</li>
        </ul>
      </section>
      <section className="card auth-form">
        <h2>{L("Jaribu onyesho", "Try the demo")}</h2>
        <p className="muted small">{L("Hakuna akaunti, simu wala PIN. Unachoandika kinabaki kwenye kifaa hiki tu. Watu wote wa mfano ni wa kubuni.", "No account, phone or PIN. What you type stays on this device only. All sample people are fictional.")}</p>
        <label>{L("Jina (hiari)", "Name (optional)")}<input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
        <label>{L("Mimi ni", "I am a")}
          <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
            {Object.entries(AUDIENCES).map(([k, v]) => <option key={k} value={k}>{T(v)}</option>)}
          </select>
        </label>
        <div className="stack">
          <button className="btn" onClick={() => enter("learner")}><Sprout size={18} aria-hidden /> {L("Ingia kama mshiriki", "Enter as a learner")}</button>
          <button className="btn ghost" onClick={() => enter("admin")}><ShieldCheck size={18} aria-hidden /> {L("Ingia kama msimamizi", "Enter as an admin")}</button>
        </div>
      </section>
    </div>
  );
}
