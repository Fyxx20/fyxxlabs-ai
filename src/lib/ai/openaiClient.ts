import "server-only";
import OpenAI from "openai";

export const OPENAI_ERROR_CODES = {
  OPENAI_KEY_INVALID: "OPENAI_KEY_INVALID",
  OPENAI_RATE_LIMIT: "OPENAI_RATE_LIMIT",
  OPENAI_TIMEOUT: "OPENAI_TIMEOUT",
  AI_BAD_JSON: "AI_BAD_JSON",
} as const;

export type OpenAIErrorCode = (typeof OPENAI_ERROR_CODES)[keyof typeof OPENAI_ERROR_CODES];

export function assertOpenAIEnv(): { key: string; model: string } {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  if (!key || key.length < 10) {
    throw new Error(OPENAI_ERROR_CODES.OPENAI_KEY_INVALID);
  }
  return { key, model };
}

export function isOpenAIAvailable(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key.length >= 10);
}

export interface CallOpenAIJsonParams {
  system: string;
  user: string;
  schemaHint?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Appelle l'API OpenAI et retourne un objet JSON parsé.
 * En cas d'erreur (clé invalide, rate limit, timeout, JSON invalide), throw une Error avec message = code.
 */
export async function callOpenAIJson<T = unknown>(params: CallOpenAIJsonParams): Promise<T> {
  const { system, user, schemaHint, maxTokens, temperature } = params;
  let key: string;
  let model: string;
  try {
    const env = assertOpenAIEnv();
    key = env.key;
    model = env.model;
  } catch {
    throw new Error(OPENAI_ERROR_CODES.OPENAI_KEY_INVALID);
  }

  const openai = new OpenAI({ apiKey: key, timeout: 30000 });
  const maxOutputTokens = (params.maxTokens ?? Number(process.env.OPENAI_MAX_OUTPUT_TOKENS)) || 3000;
  const temp = (params.temperature ?? Number(process.env.OPENAI_TEMPERATURE)) || 0.3;

  const userContent = schemaHint
    ? `${user}\n\nRéponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour). Structure attendue: ${schemaHint}`
    : user;

  let raw: string;
  try {
    // Add explicit timeout wrapper
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: maxOutputTokens,
        temperature: temp,
      });
      clearTimeout(timeoutId);
      raw = completion.choices[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e?.status === 401) throw new Error(OPENAI_ERROR_CODES.OPENAI_KEY_INVALID);
    if (e?.status === 429) throw new Error(OPENAI_ERROR_CODES.OPENAI_RATE_LIMIT);
    if (e?.code === "ETIMEDOUT" || e?.code === "ERR_HTTP_REQUEST_TIMEOUT" || e?.message?.toLowerCase().includes("timeout")) {
      throw new Error(OPENAI_ERROR_CODES.OPENAI_TIMEOUT);
    }
    throw err;
  }

  if (!raw || !raw.trim()) {
    throw new Error(OPENAI_ERROR_CODES.AI_BAD_JSON);
  }

  const trimmed = raw.trim();
  const jsonStr = trimmed.startsWith("```") ? trimmed.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "") : trimmed;

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(OPENAI_ERROR_CODES.AI_BAD_JSON);
  }
}

export interface CallOpenAIChatParams {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

/** Retourne le contenu texte de l'assistant. Throw avec code en cas d'erreur. */
export async function callOpenAIChat(params: CallOpenAIChatParams): Promise<string> {
  const { messages, maxTokens, temperature } = params;
  let key: string;
  let model: string;
  try {
    const env = assertOpenAIEnv();
    key = env.key;
    model = env.model;
  } catch {
    throw new Error(OPENAI_ERROR_CODES.OPENAI_KEY_INVALID);
  }
  const openai = new OpenAI({ apiKey: key });
  const maxOutputTokens = (maxTokens ?? Number(process.env.OPENAI_MAX_OUTPUT_TOKENS)) || 1200;
  const temp = (temperature ?? Number(process.env.OPENAI_TEMPERATURE)) || 0.2;
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxOutputTokens,
      temperature: temp,
    });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    if (e?.status === 401) throw new Error(OPENAI_ERROR_CODES.OPENAI_KEY_INVALID);
    if (e?.status === 429) throw new Error(OPENAI_ERROR_CODES.OPENAI_RATE_LIMIT);
    if (e?.code === "ETIMEDOUT" || e?.message?.toLowerCase().includes("timeout")) {
      throw new Error(OPENAI_ERROR_CODES.OPENAI_TIMEOUT);
    }
    throw err;
  }
}
