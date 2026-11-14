// AI models a learner can choose for the Assistant. Every model gets the same safety rules and the same
// sourced reference notes; if a model is not set up or fails, the learner gets the prepared, sourced answer.
import { o, type T } from "./content.js";

export type ModelId = "prepared" | "claude" | "chatgpt" | "gemini" | "grok" | "deepseek" | "climategpt";
export type ModelInfo = { id: ModelId; name: string; maker: string; where: T; env: { key: string; model: string; base?: string } };

export const MODELS_AI: ModelInfo[] = [
  // Free and always on: the app's own sourced answers, nothing leaves the device.
  { id: "prepared", name: "Jamii", maker: "Jamii", where: o("Kwenye kifaa chako", "On your device"), env: { key: "", model: "" } },
  { id: "claude", name: "Claude", maker: "Anthropic", where: o("Marekani", "United States"), env: { key: "ANTHROPIC_API_KEY", model: "CLAUDE_MODEL" } },
  { id: "chatgpt", name: "ChatGPT", maker: "OpenAI", where: o("Marekani", "United States"), env: { key: "OPENAI_API_KEY", model: "OPENAI_MODEL" } },
  { id: "gemini", name: "Gemini", maker: "Google", where: o("Marekani na kwingineko", "United States and elsewhere"), env: { key: "GEMINI_API_KEY", model: "GEMINI_MODEL" } },
  { id: "grok", name: "Grok", maker: "xAI", where: o("Marekani", "United States"), env: { key: "XAI_API_KEY", model: "XAI_MODEL" } },
  { id: "deepseek", name: "DeepSeek", maker: "DeepSeek", where: o("China", "China"), env: { key: "DEEPSEEK_API_KEY", model: "DEEPSEEK_MODEL" } },
  { id: "climategpt", name: "ClimateGPT", maker: "Erasmus.AI", where: o("Mahali mnapoipangisha", "Wherever you host it"), env: { key: "CLIMATEGPT_API_KEY", model: "CLIMATEGPT_MODEL", base: "CLIMATEGPT_BASE_URL" } },
];

export const DEFAULT_MODEL: ModelId = "prepared";
export const isModel = (x: unknown): x is ModelId => MODELS_AI.some((m) => m.id === x);
export const modelInfo = (id: string) => MODELS_AI.find((m) => m.id === id) ?? MODELS_AI[0];
