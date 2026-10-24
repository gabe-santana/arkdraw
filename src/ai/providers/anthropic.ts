/**
 * Anthropic Messages API adapter (raw HTTP: the request is executed by the
 * Rust side, which injects `x-api-key` from the OS keychain).
 *
 * Notes for current Claude models:
 * - Thinking is adaptive/on by default — we omit `thinking` entirely and pass
 *   every assistant content block (thinking, fallback, tool_use…) back verbatim.
 * - Forced `tool_choice` (`any`/`tool`) is rejected by newer models, so we use
 *   `auto` and steer from the system prompt.
 * - Sampling params (`temperature`…) are not sent.
 * - Server-side refusal fallbacks are opted into where supported.
 */
import type {
  ChatMessage,
  ChatResponse,
  HttpRequest,
  ModelInfo,
  ListingAdapter,
  ProviderConfig,
  StopReason,
  ToolCall,
} from './types';
import { AiError } from './types';
import { t } from '@/i18n';

export const ANTHROPIC_BASE = 'https://api.anthropic.com';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** Models that accept `output_config.effort`. */
const EFFORT_MODELS = /^claude-(?:(?:fable|mythos|opus|sonnet|haiku)-5|opus-4-[5-8]|sonnet-4-6)/;
/** Models with server-side `fallbacks: "default"` on the Claude API. */
const FALLBACK_MODELS = /^claude-(?:opus-5|fable-5-1|mythos-5-1|sonnet-5-5)(?:$|-)/;

type Block = { type: string; [k: string]: unknown };

function toAnthropicMessages(messages: ChatMessage[]) {
  const out: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.text });
    } else if (m.role === 'assistant') {
      const content: Block[] = Array.isArray(m.native)
        ? (m.native as Block[])
        : [
            ...(m.text ? [{ type: 'text', text: m.text }] : []),
            ...m.toolCalls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.args ?? {} })),
          ];
      out.push({ role: 'assistant', content });
    } else {
      out.push({
        role: 'user',
        content: m.results.map((r) => ({
          type: 'tool_result',
          tool_use_id: r.id,
          content: r.content,
          ...(r.isError ? { is_error: true } : {}),
        })),
      });
    }
  }
  return out;
}

export const anthropic: ListingAdapter = {
  buildChat(config: ProviderConfig, req): HttpRequest {
    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: 16000,
      system: req.system,
      messages: toAnthropicMessages(req.messages),
      tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
      tool_choice: { type: 'auto' },
    };
    const headers: Record<string, string> = {};
    if (EFFORT_MODELS.test(config.model)) body.output_config = { effort: 'medium' };
    if (FALLBACK_MODELS.test(config.model)) {
      body.fallbacks = 'default';
      headers['anthropic-beta'] = ANTHROPIC_FALLBACK_BETA;
    }
    return { method: 'POST', url: `${ANTHROPIC_BASE}/v1/messages`, body, headers };
  },

  parseChat(json): ChatResponse {
    const res = json as { content?: Block[]; stop_reason?: string; stop_details?: { category?: string } | null };
    if (!res || !Array.isArray(res.content)) throw new AiError(t('ai.error.unexpectedResponse', { provider: 'Anthropic' }));
    if (res.stop_reason === 'refusal') {
      const cat = res.stop_details?.category;
      throw new AiError(cat ? t('ai.error.declinedCategory', { category: cat }) : t('ai.error.declined'));
    }
    const toolCalls: ToolCall[] = [];
    let text = '';
    for (const b of res.content) {
      if (b.type === 'text' && typeof b.text === 'string') text += b.text;
      else if (b.type === 'tool_use') toolCalls.push({ id: String(b.id), name: String(b.name), args: b.input });
    }
    const map: Record<string, StopReason> = { end_turn: 'end', tool_use: 'tool_use', max_tokens: 'max_tokens', stop_sequence: 'end' };
    return { text, toolCalls, stopReason: map[res.stop_reason ?? ''] ?? 'other', native: res.content };
  },

  buildListModels(): HttpRequest {
    return { method: 'GET', url: `${ANTHROPIC_BASE}/v1/models?limit=100` };
  },

  parseListModels(json): ModelInfo[] {
    const data = (json as { data?: Array<{ id: string; display_name?: string }> })?.data ?? [];
    return data.map((m) => ({ id: m.id, label: m.display_name }));
  },
};
