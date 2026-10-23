/**
 * Provider-neutral chat + tool-calling types.
 *
 * Every adapter maps this small vocabulary onto its own wire format. Assistant
 * turns keep the provider's raw message (`native`) so it can be replayed
 * verbatim on the next request — Anthropic thinking blocks and Gemini thought
 * signatures must round-trip unchanged.
 */

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'custom';

/** A JSON Schema object (the subset every provider understands). */
export type JsonSchema = Record<string, unknown>;

export interface ChatTool {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface ToolResult {
  id: string;
  name: string;
  /** JSON-serialisable result, or an error message when `isError`. */
  content: string;
  isError?: boolean;
}

export type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls: ToolCall[]; native?: unknown }
  | { role: 'tool'; results: ToolResult[] };

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  tools: ChatTool[];
}

export type StopReason = 'end' | 'tool_use' | 'max_tokens' | 'refusal' | 'other';

export interface ChatResponse {
  text: string;
  toolCalls: ToolCall[];
  stopReason: StopReason;
  /** Raw assistant message to replay on the next turn. */
  native: unknown;
}

/** What an adapter needs to know about the user's configuration. */
export interface ProviderConfig {
  provider: ProviderId;
  model: string;
  /** Required for `ollama` and `custom`; ignored by hosted providers. */
  baseUrl?: string;
}

export interface HttpRequest {
  method: 'GET' | 'POST';
  url: string;
  body?: unknown;
  /** Non-auth headers. Auth is always injected by the transport. */
  headers?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  body: string;
}

export interface ModelInfo {
  id: string;
  label?: string;
}

export interface ProviderAdapter {
  buildChat(config: ProviderConfig, req: ChatRequest): HttpRequest;
  parseChat(json: unknown): ChatResponse;
  buildListModels(config: ProviderConfig): HttpRequest;
  parseListModels(json: unknown): ModelInfo[];
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}
