import { useState } from "react";
import { AUDIENCES, type Audience } from "../shared/content";
import { Landscape, Mascot, api, useApp, useL, useT } from "./core";

const ERR: Record<string, [string, string]> = {
  fields: ["Jaza jina na nambari sahihi ya simu ya Kenya.", "Enter your name and a valid Kenyan phone number."],
  consent: ["Tafadhali soma na ukubali kabla ya kuendelea.", "Please read and agree before continuing."],
  pin_format: ["PIN lazima iwe tarakimu 6.", "PIN must be 6 digits."],
  pin_weak: ["PIN hii ni rahisi kukisiwa. Chagua nyingine.", "That PIN is easy to guess. Choose another."],
  exists: ["Nambari hii tayari imesajiliwa. Ingia badala yake.", "This number is already registered. Sign in instead."],
  login: ["Nambari au PIN si sahihi.", "Wrong number or PIN."],
  locked: ["Majaribio mengi. Jaribu tena baada ya dakika 15.", "Too many tries. Try again in 15 minutes."],
  rate: ["Maombi mengi. Subiri kidogo.", "Too many requests. Please wait."],
  server: ["Hitilafu ya mtandao. Jaribu tena.", "Network problem. Try again."],
};

export function Auth() {
  const { refresh, lang, setLang } = useApp();
  const L = useL(), T = useT();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [f, setF] = useState({ name: "", phone: "", pin: "", secret: "", community: "", county: "", village: "", audience: "herder" as Audience, consentTerms: false, consentAi: false, consentShare: false });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const field = (k: "name" | "phone" | "community" | "county" | "village", label: string, extra: object = {}) => (
    <label>{label}<input value={f[k]} onChange={(e) => set(k, e.target.value)} {...extra} /></label>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      await api(mode === "up" ? "/auth/register" : "/auth/login", { body: mode === "up" ? { ...f, lang } : { phone: f.phone, secret: f.secret } });
      refresh();
    } catch (x: any) { const m = ERR[x.message] ?? ERR.server; setErr(lang === "sw" ? m[0] : m[1]); }
    setBusy(false);
  };
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
          <li>{L("Jifunze kwenye simu au WhatsApp, pamoja na wenzako", "Learn on your phone or WhatsApp, with your peers")}</li>
        </ul>
        <Landscape />
      </section>
      <form className="card auth-form" onSubmit={submit}>
        <h2>{mode === "up" ? L("Jiunge", "Join") : L("Ingia", "Sign in")}</h2>
        {mode === "up" && field("name", L("Jina lako", "Your name"), { required: true, autoComplete: "name" })}
        {field("phone", L("Nambari ya simu", "Phone number"), { required: true, inputMode: "tel", placeholder: "07XX XXX XXX", autoComplete: "tel" })}
        {mode === "in" ? (
          <label>{L("PIN", "PIN")}<input type="password" required value={f.secret} onChange={(e) => set("secret", e.target.value)} autoComplete="current-password" /></label>
        ) : (
          <>
            <label>{L("Unda PIN ya tarakimu 6", "Create a 6 digit PIN")}<input type="password" inputMode="numeric" maxLength={6} required value={f.pin} onChange={(e) => set("pin", e.target.value)} autoComplete="new-password" /></label>
            <div className="two">
              {field("community", L("Jamii yako (hiari)", "Your community (optional)"))}
              {field("county", L("Kaunti (hiari)", "County (optional)"))}
            </div>
            {field("village", L("Kijiji au eneo (hiari)", "Village or area (optional)"))}
            <label>{L("Mimi ni", "I am a")}
              <select value={f.audience} onChange={(e) => set("audience", e.target.value)}>
                {Object.entries(AUDIENCES).map(([k, v]) => <option key={k} value={k}>{T(v)}</option>)}
              </select>
            </label>
            <fieldset>
              <legend>{L("Ridhaa yako", "Your consent")}</legend>
              <label className="check"><input type="checkbox" checked={f.consentTerms} onChange={(e) => set("consentTerms", e.target.checked)} /> <span>{L("Ninakubali mazungumzo na maendeleo yangu yahifadhiwe, na wasimamizi waone maendeleo yangu ya mafunzo. Ninaweza kufuta data yangu wakati wowote.", "I agree my chats and progress are stored and that facilitators can see my learning progress. I can delete my data at any time.")}</span></label>
              <label className="check"><input type="checkbox" checked={f.consentAi} onChange={(e) => set("consentAi", e.target.checked)} /> <span>{L("Hiari: maswali yangu yatumwe kwa huduma ya AI (Anthropic, nje ya Kenya) ili kupata majibu bora. Bila hii, nitapata majibu yaliyoandaliwa tu.", "Optional: send my questions to an AI service (Anthropic, outside Kenya) for better answers. Without this I get prepared answers only.")}</span></label>
              <label className="check"><input type="checkbox" checked={f.consentShare} onChange={(e) => set("consentShare", e.target.checked)} /> <span>{L("Hiari: maneno yangu yanaweza kunukuliwa bila jina katika ripoti za jamii.", "Optional: my words may be quoted without my name in community reports.")}</span></label>
            </fieldset>
          </>
        )}
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{mode === "up" ? L("Anza", "Start") : L("Ingia", "Sign in")}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "up" ? "in" : "up"); setErr(""); }}>
          {mode === "up" ? L("Tayari una akaunti? Ingia", "Already joined? Sign in") : L("Mgeni? Jiunge", "New here? Join")}
        </button>
      </form>
    </div>
  );
}
