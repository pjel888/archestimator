export type DeepSeekChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type DeepSeekAskResult = {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type DeepSeekChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: DeepSeekAskResult["usage"];
  error?: {
    message?: string;
  };
};

const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const DEEPSEEK_REQUEST_TIMEOUT_MS = 20_000;

function getDeepSeekModel() {
  return process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL;
}

export function hasDeepSeekApiKey() {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export async function askDeepSeek(messages: DeepSeekChatMessage[]): Promise<DeepSeekAskResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured.");

  const model = getDeepSeekModel();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), DEEPSEEK_REQUEST_TIMEOUT_MS);
  const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: abortController.signal,
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: 0.2,
      max_tokens: 900,
    }),
  }).finally(() => clearTimeout(timeoutId));

  const payload = (await response.json().catch(() => null)) as DeepSeekChatCompletionResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `DeepSeek request failed with status ${response.status}.`);
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek returned an empty response.");

  return {
    content,
    model: payload?.model || model,
    usage: payload?.usage,
  };
}
