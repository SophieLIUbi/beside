export type Locale = "en" | "zh";

export type ProviderKind = "deepseek" | "groq" | "openai" | "ollama" | "custom";

export type Profile = {
  name: string;
  locale: Locale;
  provider: ProviderKind;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type Msg = {
  id: string;
  role: "user" | "companion";
  content: string;
  createdAt: number;
};

export type Thread = {
  id: string;
  companionId: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
};

export type Preset = {
  baseUrl: string;
  model: string;
  needsKey: boolean;
};
