import type { Lang } from "../shared/content.js";

const VERSION = process.env.WA_GRAPH_VERSION || "v23.0";
export const waConfigured = () => !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID && process.env.WA_BOT_NUMBER);

async function post(payload: object) {
  const r = await fetch(`https://graph.facebook.com/${VERSION}/${process.env.WA_PHONE_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WA_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!r.ok) throw new Error(`whatsapp ${r.status}`);
}

// Free-form text is only allowed inside WhatsApp's 24 hour window, which every reply here sits in.
export async function sendText(to: string, text: string) {
  if (!waConfigured()) return;
  await post({ to: to.replace("+", ""), type: "text", text: { body: text.slice(0, 4000) } });
}

// Starting a conversation needs a Meta-approved template; skipped until one is registered.
export async function sendTemplate(to: string, lang: Lang, code: string) {
  const name = process.env.WA_TEMPLATE;
  if (!name) return;
  await post({ to: to.replace("+", ""), type: "template", template: { name, language: { code: lang }, components: [{ type: "body", parameters: [{ type: "text", text: code }] }] } });
}
