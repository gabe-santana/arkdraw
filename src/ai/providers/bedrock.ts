/**
 * Amazon Bedrock Converse API adapter, authenticated with a Bedrock API key
 * (a bearer token, injected by the transport). Requests go to the regional
 * runtime host. A bearer key can't list foundation models (that's the
 * control-plane API), so "Test connection" pings with a tiny chat instead.
 */
import type { ChatMessage, ChatResponse, HttpRequest, ProviderAdapter, StopReason, ToolCall } from './types';
import { AiError } from './types';
import { t } from '@/i18n';

/** Regions with Bedrock, most used first (the first is the default). */
export const BEDROCK_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-2', 'ca-central-1', 'sa-east-1',
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'eu-south-1', 'eu-south-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2',
];

/** Same rule as the desktop backend: `us-east-1`, `ap-southeast-2`, `us-gov-west-1`… */
export const isAwsRegion = (r: string) => /^[a-z]{2}(-[a-z]+)+-\d$/.test(r);

type Block = {
  text?: string;
  toolUse?: { toolUseId: string; name: string; input: unknown };
  toolResult?: { toolUseId: string; content: Array<{ text: string }>; status?: 'error' };
  [k: string]: unknown;
};

function toMessages(messages: ChatMessage[]) {
  const out: Array<{ role: 'user' | 'assistant'; content: Block[] }> = [];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: [{ text: m.text }] });
    else if (m.role === 'assistant') {
      const content: Block[] = Array.isArray(m.native)
        ? (m.native as Block[])
        : [
            // Converse rejects empty text blocks.
            ...(m.text ? [{ text: m.text }] : []),
            ...m.toolCalls.map((c) => ({ toolUse: { toolUseId: c.id, name: c.name, input: c.args ?? {} } })),
          ];
      out.push({ role: 'assistant', content });
    } else {
      out.push({
        role: 'user',
        content: m.results.map((r) => ({
          toolResult: { toolUseId: r.id, content: [{ text: r.content || '(empty)' }], ...(r.isError ? { status: 'error' as const } : {}) },
        })),
      });
    }
  }
  return out;
}

export const bedrock: ProviderAdapter = {
  buildChat(config, req): HttpRequest {
    const region = config.params?.region?.trim() || BEDROCK_REGIONS[0];
    if (!isAwsRegion(region)) throw new AiError(t('ai.error.bedrockRegion'));
    return {
      method: 'POST',
      url: `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(config.model)}/converse`,
      body: {
        system: [{ text: req.system }],
        messages: toMessages(req.messages),
        // Claude's default output limit on Bedrock is too small for a whole diagram.
        ...(config.model.includes('anthropic.') ? { inferenceConfig: { maxTokens: 16000 } } : {}),
        ...(req.tools.length
          ? { toolConfig: { tools: req.tools.map((tool) => ({ toolSpec: { name: tool.name, description: tool.description, inputSchema: { json: tool.parameters } } })) } }
          : {}),
      },
    };
  },

  parseChat(json): ChatResponse {
    const res = json as { output?: { message?: { content?: Block[] } }; stopReason?: string };
    const content = res?.output?.message?.content;
    if (!Array.isArray(content)) throw new AiError(t('ai.error.unexpectedResponse', { provider: 'Amazon Bedrock' }));
    let text = '';
    const toolCalls: ToolCall[] = [];
    for (const b of content) {
      if (typeof b.text === 'string') text += b.text;
      if (b.toolUse) toolCalls.push({ id: b.toolUse.toolUseId, name: b.toolUse.name, args: b.toolUse.input ?? {} });
    }
    const map: Record<string, StopReason> = {
      end_turn: 'end',
      stop_sequence: 'end',
      tool_use: 'tool_use',
      max_tokens: 'max_tokens',
      guardrail_intervened: 'refusal',
      content_filtered: 'refusal',
    };
    let stopReason = map[res.stopReason ?? ''] ?? 'other';
    if (toolCalls.length) stopReason = 'tool_use';
    if (stopReason === 'refusal' && !toolCalls.length) throw new AiError(t('ai.error.declined'));
    // Replay the content blocks as returned (keeps reasoning blocks and tool-use ids intact).
    return { text, toolCalls, stopReason, native: content };
  },
};
