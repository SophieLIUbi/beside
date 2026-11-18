import type { Preset, ProviderKind } from "./types";

export const PRESETS: Record<ProviderKind, Preset> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
    needsKey: true,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "openai/gpt-oss-120b",
    needsKey: true,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    needsKey: true,
  },
  ollama: {
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "llama3.2",
    needsKey: false,
  },
  custom: {
    baseUrl: "https://api.openai.com/v1",
    model: "",
    needsKey: true,
  },
};

export function voiceReady(provider: ProviderKind, apiKey: string): boolean {
  if (!PRESETS[provider].needsKey) return true;
  return apiKey.trim().length >= 12;
}
