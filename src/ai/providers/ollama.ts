/**
 * Ollama adapter (native `/api/chat`, non-streaming). Runs fully offline
 * against a local model; pick one that supports tool calling
 * (e.g. qwen3, llama3.1+, mistral-small).
 */
import type { ChatMessage, ChatResponse, HttpRequest, ModelInfo, ProviderAdapter, ProviderConfig, StopReason, ToolCall } from './types';
import { joinUrl, parseArgs } from './openai';
import { AiError } from './types';

export const OLLAMA_DEFAULT_BASE = 'http://localhost:11434';

const baseOf = (c: ProviderConfig) => c.baseUrl || OLLAMA_DEFAULT_BASE;

type OllamaToolCall = { function: { name: string; arguments: unknown } };

function toOllamaMessages(system: string, messages: ChatMessage[]) {
  const out: unknown[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') {
      out.push(
        m.native && typeof m.native === 'object'
          ? m.native
          : {
              role: 'assistant',
              content: m.text,
              ...(m.toolCalls.length ? { tool_calls: m.toolCalls.map((c) => ({ function: { name: c.name, arguments: c.args ?? {} } })) } : {}),
            },
      );
    } else {
      for (const r of m.results) out.push({ role: 'tool', tool_name: r.name, content: r.isError ? `Error: ${r.content}` : r.content });
    }
  }
  return out;
}

export const ollama: ProviderAdapter = {
  buildChat(config, req): HttpRequest {
    return {
      method: 'POST',
      url: joinUrl(baseOf(config), 'api/chat'),
      body: {
        model: config.model,
        stream: false,
        messages: toOllamaMessages(req.system, req.messages),
        tools: req.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
        options: { num_ctx: 32768 },
      },
    };
  },

  parseChat(json): ChatResponse {
    const res = json as { message?: { content?: string; tool_calls?: OllamaToolCall[] }; done_reason?: string; error?: string };
    if (res?.error) throw new AiError(res.error);
    const msg = res?.message ?? {};
    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((c, i) => ({ id: `ollama_${i}`, name: c.function.name, args: parseArgs(c.function.arguments) }));
    let stopReason: StopReason = res?.done_reason === 'length' ? 'max_tokens' : 'end';
    if (toolCalls.length) stopReason = 'tool_use';
    const native = { role: 'assistant', content: msg.content ?? '', ...(msg.tool_calls?.length ? { tool_calls: msg.tool_calls } : {}) };
    return { text: msg.content ?? '', toolCalls, stopReason, native };
  },

  buildListModels(config): HttpRequest {
    return { method: 'GET', url: joinUrl(baseOf(config), 'api/tags') };
  },

  parseListModels(json): ModelInfo[] {
    const models = (json as { models?: Array<{ name: string; model?: string }> })?.models ?? [];
    return models.map((m) => ({ id: m.name || m.model || '' })).filter((m) => m.id);
  },
};
