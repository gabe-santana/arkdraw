/**
 * OpenAI Chat Completions adapter. Also serves any OpenAI-compatible endpoint
 * (OpenRouter, Azure OpenAI v1, LM Studio, vLLM, Groq…) via a custom base URL.
 */
import type { ChatMessage, ChatResponse, HttpRequest, ModelInfo, ProviderAdapter, ProviderConfig, StopReason, ToolCall } from './types';
import { AiError } from './types';
import { t } from '@/i18n';

export const OPENAI_BASE = 'https://api.openai.com/v1';

/** Joins a base URL and a path, tolerating trailing slashes. */
export function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

function baseOf(config: ProviderConfig): string {
  if (config.provider === 'openai') return OPENAI_BASE;
  if (!config.baseUrl) throw new AiError(t('ai.error.customBaseUrl'));
  return config.baseUrl;
}

type OaiToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

function toOpenAiMessages(system: string, messages: ChatMessage[]) {
  const out: unknown[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') {
      if (m.native && typeof m.native === 'object') out.push(m.native);
      else
        out.push({
          role: 'assistant',
          content: m.text || null,
          ...(m.toolCalls.length
            ? {
                tool_calls: m.toolCalls.map<OaiToolCall>((c) => ({
                  id: c.id,
                  type: 'function',
                  function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
                })),
              }
            : {}),
        });
    } else {
      for (const r of m.results) out.push({ role: 'tool', tool_call_id: r.id, content: r.isError ? `Error: ${r.content}` : r.content });
    }
  }
  return out;
}

/** Parses tool-call arguments; malformed JSON is surfaced to the model as an error later. */
export function parseArgs(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw ?? {};
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return { __invalidJson: raw };
  }
}

export const openai: ProviderAdapter = {
  buildChat(config, req): HttpRequest {
    const base = baseOf(config);
    // A full ".../chat/completions" URL (e.g. with an Azure api-version query) is used as-is.
    const url = /\/chat\/completions(\?|$)/.test(base) ? base : joinUrl(base, 'chat/completions');
    return {
      method: 'POST',
      url,
      body: {
        model: config.model,
        messages: toOpenAiMessages(req.system, req.messages),
        tools: req.tools.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
        tool_choice: 'auto',
      },
    };
  },

  parseChat(json): ChatResponse {
    const res = json as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: OaiToolCall[]; refusal?: string | null }; finish_reason?: string }>;
    };
    const choice = res?.choices?.[0];
    if (!choice?.message) throw new AiError(t('ai.error.unexpectedEndpointResponse'));
    const msg = choice.message;
    if (msg.refusal) throw new AiError(t('ai.error.declinedReason', { reason: msg.refusal }));
    const toolCalls: ToolCall[] = (msg.tool_calls ?? [])
      .filter((c) => c.type === 'function' || c.function)
      .map((c, i) => ({ id: c.id || `call_${i}`, name: c.function.name, args: parseArgs(c.function.arguments) }));
    const map: Record<string, StopReason> = { stop: 'end', tool_calls: 'tool_use', function_call: 'tool_use', length: 'max_tokens', content_filter: 'refusal' };
    let stopReason = map[choice.finish_reason ?? ''] ?? 'other';
    if (toolCalls.length) stopReason = 'tool_use';
    // Replay exactly what the server returned (keeps ids, reasoning fields…).
    const native = { role: 'assistant', content: msg.content ?? null, ...(msg.tool_calls?.length ? { tool_calls: msg.tool_calls } : {}) };
    return { text: msg.content ?? '', toolCalls, stopReason, native };
  },

  buildListModels(config): HttpRequest {
    return { method: 'GET', url: joinUrl(baseOf(config), 'models') };
  },

  parseListModels(json): ModelInfo[] {
    const data = (json as { data?: Array<{ id: string; name?: string }> })?.data ?? [];
    return data.map((m) => ({ id: m.id, label: m.name }));
  },
};
