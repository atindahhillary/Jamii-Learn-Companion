// Non-Anthropic models. OpenAI, Google Gemini, xAI Grok and DeepSeek all offer an OpenAI-compatible
// chat completions endpoint, and ClimateGPT is served through one (for example a Hugging Face endpoint).
import { modelInfo, type ModelId } from "../shared/models.js";

const BASES: Partial<Record<ModelId, string>> = {
  chatgpt: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  grok: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
};

export type ChatMsg = { role: "user" | "assistant"; content: string };

// Set up = it has a key and a model name (and, for ClimateGPT, an address). Claude is checked in bot.ts.
export function configured(id: ModelId): boolean {
  const e = modelInfo(id).env;
  if (id === "claude") return !!process.env[e.key];
  return !!(process.env[e.key] && process.env[e.model] && (BASES[id] || (e.base && process.env[e.base])));
}

export async function callCompatible(id: ModelId, system: string, messages: ChatMsg[], maxTokens: number): Promise<string | null> {
  const e = modelInfo(id).env;
  const base = (BASES[id] ?? (e.base ? process.env[e.base] : "") ?? "").replace(/\/$/, "");
  if (!configured(id) || !base) return null;
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env[e.key]}` },
      body: JSON.stringify({ model: process.env[e.model], max_tokens: maxTokens, messages: [{ role: "system", content: system }, ...messages] }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) { console.error("model error", id, r.status); return null; }
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    console.error("model failed", id);
    return null; // shortcut: any failure falls back to the sourced offline answer, so learners never see an error
  }
}
