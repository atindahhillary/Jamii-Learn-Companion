import type { Lang } from "../shared/content.js";

const VERSION = process.env.WA_GRAPH_VERSION || "v23.0";
export const waConfigured = () => !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID && process.env.WA_BOT_NUMBER);
// Replying needs only the token and the sending number id; the public bot number is for links into WhatsApp.
const canSend = () => !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID);

async function post(payload: object) {
  const r = await fetch(`https://graph.facebook.com/${VERSION}/${process.env.WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WA_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!r.ok) throw new Error(`whatsapp ${r.status} ${(await r.text().catch(() => "")).slice(0, 300)}`);
}

// A reply can carry up to 3 tap buttons, or a list of up to 10 choices behind one button.
export type Row = { id: string; title: string; description?: string };
export type Out = { text: string; buttons?: Row[]; list?: { button: string; rows: Row[] } };
const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function sendOut(to: string, out: Out) {
  if (!canSend()) return;
  const dest = to.replace("+", "");
  if (!out.buttons?.length && !out.list?.rows.length) return post({ to: dest, type: "text", text: { body: out.text.slice(0, 4000) } });
  // Interactive bodies stop at 1024 characters, so a long answer goes first as plain text.
  let body = out.text;
  if (body.length > 1000) { await post({ to: dest, type: "text", text: { body: body.slice(0, 4000) } }); body = "👇"; }
  const action = out.list
    ? { button: cap(out.list.button, 20), sections: [{ title: cap(out.list.button, 24), rows: out.list.rows.slice(0, 10).map((r) => ({ id: r.id.slice(0, 200), title: cap(r.title, 24), ...(r.description ? { description: cap(r.description, 72) } : {}) })) }] }
    : { buttons: out.buttons!.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: cap(b.title, 20) } })) };
  return post({ to: dest, type: "interactive", interactive: { type: out.list ? "list" : "button", body: { text: body }, action } });
}

// Marks the message read and shows "typing…" while the answer is prepared, so the chat feels instant.
export async function markRead(messageId: string) {
  if (!canSend()) return;
  await post({ status: "read", message_id: messageId, typing_indicator: { type: "text" } }).catch(() => undefined);
}

// Free-form text is only allowed inside WhatsApp's 24 hour window, which every reply here sits in.
export async function sendText(to: string, text: string) {
  if (!canSend()) return;
  await post({ to: to.replace("+", ""), type: "text", text: { body: text.slice(0, 4000) } });
}

// Starting a conversation needs a Meta-approved template; skipped until one is registered.
export async function sendTemplate(to: string, lang: Lang, code: string) {
  const name = process.env.WA_TEMPLATE;
  if (!name) return;
  await post({ to: to.replace("+", ""), type: "template", template: { name, language: { code: lang }, components: [{ type: "body", parameters: [{ type: "text", text: code }] }] } });
}
