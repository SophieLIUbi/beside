import { PRESETS } from "./presets";
import type { Profile, Thread } from "./types";

const KEY = "beside.v1";

export type Saved = {
  v: 1;
  profile: Profile;
  threads: Thread[];
  activeId: string | null;
};

export function freshProfile(): Profile {
  return {
    name: "",
    locale: "en",
    provider: "groq",
    apiKey: "",
    model: PRESETS.groq.model,
    baseUrl: PRESETS.groq.baseUrl,
  };
}

function fresh(): Saved {
  return { v: 1, profile: freshProfile(), threads: [], activeId: null };
}

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as Partial<Saved>;
    if (data.v !== 1 || !data.profile) return fresh();
    return {
      v: 1,
      profile: { ...freshProfile(), ...data.profile },
      threads: Array.isArray(data.threads) ? data.threads : [],
      activeId: typeof data.activeId === "string" ? data.activeId : null,
    };
  } catch {
    return fresh();
  }
}

export function save(state: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* a full disk should not crash the conversation */
  }
}
