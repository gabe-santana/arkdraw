/**
 * OpenAI Chat Completions adapter. Also serves the hosted OpenAI-compatible
 * providers (xAI, DeepSeek, Mistral, OpenRouter, Groq, Moonshot, Qwen, Z.ai,
 * Together, Fireworks, Cerebras) at their fixed base URLs, Azure AI Foundry
 * and Cloudflare Workers AI at URLs built from the user's resource/account,
 * and any other compatible endpoint (LM Studio, vLLM…) via a custom base URL.
 */
import type { ChatMessage, ChatResponse, HttpRequest, ModelInfo, ListingAdapter, ProviderAdapter, ProviderConfig, ProviderId, StopReason, ToolCall } from './types';
import { AiError } from './types';
import { t } from '@/i18n';

export const OPENAI_BASE = 'https://api.openai.com/v1';

/** Official API bases of the hosted providers served by this adapter (the desktop backend only sends their keys to these hosts). */
export const HOSTED_OPENAI_BASES: Partial<Record<ProviderId, string>> = {
  openai: OPENAI_BASE,
  xai: 'https://api.x.ai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  mistral: 'https://api.mistral.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  moonshot: 'https://api.moonshot.ai/v1',
  qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  zai: 'https://api.z.ai/api/paas/v4',
  together: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  cerebras: 'https://api.cerebras.ai/v1',
};

/** Joins a base URL and a path, tolerating trailing slashes. */
export function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/**
 * A pasted base URL without the endpoint people often copy along with it
 * (".../v1/responses", ".../v1/chat/completions") or a trailing slash. A query
 * string (Azure's `api-version`) is kept.
 */
export function normalizeBaseUrl(raw: string): string {
  const [path, query] = raw.trim().split(/\?(.*)/s, 2);
  const clean = path.replace(/\/+$/, '').replace(/\/(responses|chat\/completions|completions|models)$/, '').replace(/\/+$/, '');
  return query ? `${clean}?${query}` : clean;
}

/** Appends `path` to a base URL, keeping its query string at the end. */
function endpoint(base: string, path: string): string {
  const [p, query] = base.split(/\?(.*)/s, 2);
  return joinUrl(p, path) + (query ? `?${query}` : '');
}

/** Azure resource endpoints accepted for the Azure provider (the desktop backend enforces the same list). */
export const AZURE_HOST_SUFFIXES = ['.openai.azure.com', '.services.ai.azure.com', '.cognitiveservices.azure.com'];

/** `https://<resource>.<azure host>` with any path → its OpenAI-compatible v1 API (`<origin>/openai/v1`). */
export function azureBase(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new AiError(t('ai.error.azureEndpoint'));
  }
  if (url.protocol !== 'https:' || !AZURE_HOST_SUFFIXES.some((s) => url.hostname.endsWith(s))) throw new AiError(t('ai.error.azureEndpoint'));
  return `${url.origin}/openai/v1`;
}

function baseOf(config: ProviderConfig): string {
  const hosted = HOSTED_OPENAI_BASES[config.provider];
  if (hosted) return hosted;
  if (config.provider === 'azure') {
    if (!config.baseUrl) throw new AiError(t('ai.error.azureEndpoint'));
    return azureBase(config.baseUrl);
  }
  if (config.provider === 'cloudflare') {
    const account = config.params?.accountId?.trim() ?? '';
    if (!/^[0-9a-f]{32}$/i.test(account)) throw new AiError(t('ai.error.cloudflareAccount'));
    return `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`;
  }
  if (!config.baseUrl) throw new AiError(t('ai.error.customBaseUrl'));
  return normalizeBaseUrl(config.baseUrl);
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

export const openai: ListingAdapter = {
  buildChat(config, req): HttpRequest {
    // A full ".../chat/completions?api-version=…" URL (a classic Azure deployment) is used as-is.
    const raw = config.baseUrl?.trim() ?? '';
    const url = !HOSTED_OPENAI_BASES[config.provider] && config.provider === 'custom' && /\/chat\/completions\?/.test(raw) ? raw : endpoint(baseOf(config), 'chat/completions');
    return {
      method: 'POST',
      url,
      body: {
        model: config.model,
        messages: toOpenAiMessages(req.system, req.messages),
        // Some servers reject `tool_choice` without tools (the connection check sends none).
        ...(req.tools.length
          ? {
              tools: req.tools.map((t) => ({
                type: 'function',
                function: { name: t.name, description: t.description, parameters: t.parameters },
              })),
              tool_choice: 'auto',
            }
          : {}),
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
    return { method: 'GET', url: endpoint(baseOf(config), 'models') };
  },

  parseListModels(json): ModelInfo[] {
    const data = (json as { data?: Array<{ id: string; name?: string }> })?.data ?? [];
    return data.map((m) => ({ id: m.id, label: m.name }));
  },
};

/** Cloudflare Workers AI: OpenAI-compatible chat, but no `/models` list at this base, so "Test connection" pings instead. */
export const cloudflare: ProviderAdapter = {
  buildChat: openai.buildChat,
  parseChat: openai.parseChat,
};
