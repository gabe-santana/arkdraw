/**
 * Google Gemini (Generative Language API, v1beta `generateContent`) adapter.
 * The key travels in the `x-goog-api-key` header (injected by the transport),
 * never in the query string.
 */
import type { ChatMessage, ChatResponse, HttpRequest, JsonSchema, ModelInfo, ListingAdapter, ProviderAdapter, StopReason, ToolCall } from './types';
import { AiError } from './types';
import { t } from '@/i18n';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

type Part = {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: unknown };
  functionResponse?: { id?: string; name: string; response: unknown };
  [k: string]: unknown;
};

/** Gemini's schema dialect is an OpenAPI subset: drop keywords it rejects. */
export function geminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as JsonSchema)) {
    if (k === 'additionalProperties' || k === '$schema' || k === 'examples' || k === 'default') continue;
    out[k] = k === 'properties' ? Object.fromEntries(Object.entries(v as JsonSchema).map(([pk, pv]) => [pk, geminiSchema(pv)])) : geminiSchema(v);
  }
  return out;
}

function toContents(messages: ChatMessage[]) {
  const out: Array<{ role: 'user' | 'model'; parts: Part[] }> = [];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', parts: [{ text: m.text }] });
    else if (m.role === 'assistant') {
      const parts: Part[] = Array.isArray(m.native)
        ? (m.native as Part[])
        : [
            ...(m.text ? [{ text: m.text }] : []),
            ...m.toolCalls.map((c) => ({ functionCall: { name: c.name, args: c.args ?? {} } })),
          ];
      out.push({ role: 'model', parts });
    } else {
      out.push({
        role: 'user',
        parts: m.results.map((r) => ({
          functionResponse: {
            ...(r.id.startsWith('gemini_') ? {} : { id: r.id }),
            name: r.name,
            response: r.isError ? { error: r.content } : { result: r.content },
          },
        })),
      });
    }
  }
  return out;
}

export const gemini: ListingAdapter = {
  buildChat(config, req): HttpRequest {
    const model = config.model.replace(/^models\//, '');
    return {
      method: 'POST',
      url: `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`,
      body: {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: toContents(req.messages),
        ...(req.tools.length
          ? {
              tools: [
                {
                  functionDeclarations: req.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parameters: geminiSchema(t.parameters),
                  })),
                },
              ],
              toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
            }
          : {}),
      },
    };
  },

  parseChat(json): ChatResponse {
    const res = json as {
      candidates?: Array<{ content?: { parts?: Part[] }; finishReason?: string }>;
      promptFeedback?: { blockReason?: string };
    };
    if (res?.promptFeedback?.blockReason) throw new AiError(t('ai.error.geminiBlocked', { reason: res.promptFeedback.blockReason }));
    const cand = res?.candidates?.[0];
    if (!cand) throw new AiError(t('ai.error.unexpectedResponse', { provider: 'Gemini' }));
    const parts = cand.content?.parts ?? [];
    let text = '';
    const toolCalls: ToolCall[] = [];
    parts.forEach((p, i) => {
      if (typeof p.text === 'string' && !p.thought) text += p.text;
      if (p.functionCall) toolCalls.push({ id: p.functionCall.id ?? `gemini_${i}`, name: p.functionCall.name, args: p.functionCall.args ?? {} });
    });
    const fr = cand.finishReason ?? '';
    let stopReason: StopReason = fr === 'STOP' ? 'end' : fr === 'MAX_TOKENS' ? 'max_tokens' : fr === 'SAFETY' || fr === 'PROHIBITED_CONTENT' ? 'refusal' : 'other';
    if (toolCalls.length) stopReason = 'tool_use';
    if (stopReason === 'refusal' && !toolCalls.length) throw new AiError(t('ai.error.geminiDeclined'));
    return { text, toolCalls, stopReason, native: parts };
  },

  buildListModels(): HttpRequest {
    return { method: 'GET', url: `${GEMINI_BASE}/models?pageSize=200` };
  },

  parseListModels(json): ModelInfo[] {
    const models = (json as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> })?.models ?? [];
    return models
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName }));
  },
};

export const VERTEX_BASE = 'https://aiplatform.googleapis.com/v1';

/**
 * Google Vertex AI in express mode (API key): the same wire format as Gemini at
 * Vertex's publisher-model endpoint. Express keys can't list models, so
 * "Test connection" pings instead.
 */
export const vertex: ProviderAdapter = {
  buildChat(config, req): HttpRequest {
    const model = config.model.replace(/^(publishers\/google\/)?models\//, '');
    return { ...gemini.buildChat(config, req), url: `${VERTEX_BASE}/publishers/google/models/${encodeURIComponent(model)}:generateContent` };
  },
  parseChat: gemini.parseChat,
};
