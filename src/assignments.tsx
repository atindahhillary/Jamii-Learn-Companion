import { CheckCircle2, Circle, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { MODULES } from "../shared/curriculum";
import { Avatar, Failed, Loading, api, useData, useL, useT } from "./core";

export type Work = { id: number; module_id: string; body: string; feedback: string | null; name?: string };

export function WorkBox({ moduleId, existing, onSent }: { moduleId: string; existing?: Work; onSent?: () => void }) {
  const L = useL();
  const [text, setText] = useState(existing?.body ?? ""), [state, setState] = useState<"" | "busy" | "sent" | "error">("");
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setState("busy");
    try { await api("/assignments", { body: { moduleId, text } }); setState("sent"); onSent?.(); } catch { setState("error"); }
  };
  return (
    <form className="stack" onSubmit={send}>
      <label className="sr" htmlFor={`work-${moduleId}`}>{L("Jibu la kazi yako", "Your assignment answer")}</label>
      <textarea id={`work-${moduleId}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder={L("Eleza ulichofanya na ulichojifunza...", "Say what you did and what you learned...")} />
      <button className="btn" disabled={!text.trim() || state === "busy"}>{existing ? L("Tuma tena", "Send again") : L("Tuma kazi", "Send assignment")}</button>
      {state === "sent" && <p className="muted small" role="status">{L("Imetumwa kwa mkufunzi. Asante!", "Sent to your facilitator. Thank you!")}</p>}
      {state === "error" && <p className="error" role="alert">{L("Haikutumwa. Jaribu tena.", "Not sent. Try again.")}</p>}
    </form>
  );
}

export function Assignments() {
  const L = useL(), T = useT();
  const { data, failed, reload } = useData<Work[]>("/assignments");
  const [open, setOpen] = useState<string | null>(null);
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  const sent = data.length, reviewed = data.filter((w) => w.feedback).length;
  return (
    <div className="stack">
      <p className="muted">{L(`Kazi ${sent} kati ya ${MODULES.length} zimetumwa, ${reviewed} zimepitiwa. Fanya kazi hizi nyumbani au kijijini, kisha andika ulichogundua.`, `${sent} of ${MODULES.length} sent, ${reviewed} reviewed. Do these at home or in the village, then write what you found.`)}</p>
      {MODULES.map((m) => {
        const w = data.find((x) => x.module_id === m.id);
        return (
          <section key={m.id} className="card stack work">
            <button className="work-head" aria-expanded={open === m.id} onClick={() => setOpen(open === m.id ? null : m.id)}>
              {w ? <CheckCircle2 size={20} className="ok" aria-hidden /> : <Circle size={20} aria-hidden />}
              <span><b>{T(m.title)}</b><small className="muted">{w?.feedback ? L("Imepitiwa", "Reviewed") : w ? L("Imetumwa", "Sent") : L("Haijafanywa", "To do")}</small></span>
            </button>
            {open === m.id && <>
              <p>{T(m.activity)}</p>
              {w?.feedback && <p className="note"><b>{L("Maoni ya mkufunzi", "Facilitator feedback")}: </b>{w.feedback}</p>}
              <WorkBox moduleId={m.id} existing={w} onSent={reload} />
            </>}
          </section>
        );
      })}
    </div>
  );
}

export function AdminWork() {
  const L = useL(), T = useT();
  const { data, failed, reload } = useData<Work[]>("/admin/assignments");
  const [draft, setDraft] = useState<Record<number, string>>({});
  if (failed) return <Failed retry={reload} />;
  if (!data) return <Loading />;
  return (
    <section className="card">
      <h2>{L("Kazi za washiriki", "Learner assignments")}</h2>
      {data.length === 0 && <p>{L("Bado hakuna kazi.", "No assignments yet.")}</p>}
      <ul className="plain">
        {data.map((w) => (
          <li key={w.id} className="line stack-sm">
            <span className="row"><Avatar name={w.name ?? ""} size={32} /><b>{w.name}</b><small className="muted">{T(MODULES.find((m) => m.id === w.module_id)!.title)}</small></span>
            <p>{w.body}</p>
            {w.feedback ? <p className="note"><MessageSquareText size={14} aria-hidden /> {w.feedback}</p> : (
              <form className="row" onSubmit={async (e) => { e.preventDefault(); await api(`/admin/assignments/${w.id}/feedback`, { body: { text: draft[w.id] } }); reload(); }}>
                <label className="sr" htmlFor={`fb-${w.id}`}>{L("Maoni", "Feedback")}</label>
                <input id={`fb-${w.id}`} className="grow-input" value={draft[w.id] ?? ""} onChange={(e) => setDraft({ ...draft, [w.id]: e.target.value })} maxLength={600} placeholder={L("Andika maoni...", "Write feedback...")} />
                <button className="btn small" disabled={!draft[w.id]?.trim()}>{L("Tuma", "Send")}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
