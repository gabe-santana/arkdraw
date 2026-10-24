import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anthropic } from '@/ai/providers/anthropic';
import { openai } from '@/ai/providers/openai';
import { gemini } from '@/ai/providers/gemini';
import { ollama } from '@/ai/providers/ollama';
import type { ChatMessage, ChatRequest, ChatTool } from '@/ai/providers/types';
import { chat, deleteKey, hasKey, keyRejectedError, saveKey, testConnection } from '@/ai/transport';
import { checkKeyPrefix } from '@/ai/providers';
import { bedrock } from '@/ai/providers/bedrock';
import { vertex } from '@/ai/providers/gemini';
import { azureBase, cloudflare, normalizeBaseUrl } from '@/ai/providers/openai';

const tool: ChatTool = {
  name: 'submit_diagram',
  description: 'Submit',
  parameters: { type: 'object', properties: { nodes: { type: 'array', items: { type: 'object', additionalProperties: false } } }, required: ['nodes'] },
};

const history: ChatMessage[] = [
  { role: 'user', text: 'Draw a login flow' },
  { role: 'assistant', text: '', toolCalls: [{ id: 'call_1', name: 'submit_diagram', args: { nodes: [] } }] },
  { role: 'tool', results: [{ id: 'call_1', name: 'submit_diagram', content: 'Invalid', isError: true }] },
];
const req: ChatRequest = { system: 'SYS', messages: history, tools: [tool] };

describe('Anthropic adapter', () => {
  it('builds a Messages API request', () => {
    const r = anthropic.buildChat({ provider: 'anthropic', model: 'claude-opus-5-5' }, req);
    expect(r.url).toBe('https://api.anthropic.com/v1/messages');
    const body = r.body as Record<string, any>;
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.system).toBe('SYS');
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(body.tools[0]).toMatchObject({ name: 'submit_diagram', input_schema: tool.parameters });
    expect(body.thinking).toBeUndefined();
    expect(body.temperature).toBeUndefined();
    expect(body.output_config).toEqual({ effort: 'medium' });
    expect(body.fallbacks).toBe('default');
    expect(r.headers?.['anthropic-beta']).toBe('server-side-fallback-2026-07-01');
    expect(body.messages[1]).toEqual({ role: 'assistant', content: [{ type: 'tool_use', id: 'call_1', name: 'submit_diagram', input: { nodes: [] } }] });
    expect(body.messages[2]).toEqual({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'Invalid', is_error: true }] });
  });

  it('does not send effort/fallbacks to models without them', () => {
    const r = anthropic.buildChat({ provider: 'anthropic', model: 'claude-haiku-4-5' }, req);
    const body = r.body as Record<string, unknown>;
    expect(body.output_config).toBeUndefined();
    expect(body.fallbacks).toBeUndefined();
    expect(r.headers?.['anthropic-beta']).toBeUndefined();
  });

  it('parses tool calls and replays thinking blocks verbatim', () => {
    const content = [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: 'Drawing it.' },
      { type: 'tool_use', id: 'tu_1', name: 'search_icons', input: { query: 'EC2' } },
    ];
    const res = anthropic.parseChat({ content, stop_reason: 'tool_use' });
    expect(res.text).toBe('Drawing it.');
    expect(res.toolCalls).toEqual([{ id: 'tu_1', name: 'search_icons', args: { query: 'EC2' } }]);
    expect(res.stopReason).toBe('tool_use');
    const next = anthropic.buildChat({ provider: 'anthropic', model: 'claude-opus-5-5' }, {
      ...req,
      messages: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: res.text, toolCalls: res.toolCalls, native: res.native }],
    });
    expect((next.body as any).messages[1].content).toBe(content);
  });

  it('turns refusals into errors', () => {
    expect(() => anthropic.parseChat({ content: [], stop_reason: 'refusal', stop_details: { category: 'cyber' } })).toThrow(/declined.*cyber/);
  });
});

describe('OpenAI adapter', () => {
  it('builds chat completions with function tools', () => {
    const r = openai.buildChat({ provider: 'openai', model: 'gpt-5' }, req);
    expect(r.url).toBe('https://api.openai.com/v1/chat/completions');
    const body = r.body as Record<string, any>;
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYS' });
    expect(body.messages[2].tool_calls[0]).toEqual({ id: 'call_1', type: 'function', function: { name: 'submit_diagram', arguments: '{"nodes":[]}' } });
    expect(body.messages[3]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: 'Error: Invalid' });
    expect(body.tools[0]).toEqual({ type: 'function', function: { name: 'submit_diagram', description: 'Submit', parameters: tool.parameters } });
  });

  it('uses the custom base URL (and full URLs as-is)', () => {
    expect(openai.buildChat({ provider: 'custom', model: 'm', baseUrl: 'https://openrouter.ai/api/v1/' }, req).url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const azure = 'https://x.openai.azure.com/openai/deployments/d/chat/completions?api-version=2024-10-21';
    expect(openai.buildChat({ provider: 'custom', model: 'm', baseUrl: azure }, req).url).toBe(azure);
    expect(() => openai.buildChat({ provider: 'custom', model: 'm' }, req)).toThrow(/base URL/);
  });

  it('parses tool calls with JSON-string arguments', () => {
    const res = openai.parseChat({
      choices: [
        {
          finish_reason: 'tool_calls',
          message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'search_icons', arguments: '{"query":"S3"}' } }] },
        },
      ],
    });
    expect(res.toolCalls).toEqual([{ id: 'c1', name: 'search_icons', args: { query: 'S3' } }]);
    expect(res.stopReason).toBe('tool_use');
    const bad = openai.parseChat({ choices: [{ message: { tool_calls: [{ id: 'c', type: 'function', function: { name: 'x', arguments: '{oops' } }] } }] });
    expect(bad.toolCalls[0].args).toEqual({ __invalidJson: '{oops' });
  });

  it('lists models', () => {
    expect(openai.parseListModels({ data: [{ id: 'gpt-5' }] })).toEqual([{ id: 'gpt-5', label: undefined }]);
  });
});

describe('Gemini adapter', () => {
  it('builds generateContent with function declarations and a cleaned schema', () => {
    const r = gemini.buildChat({ provider: 'gemini', model: 'gemini-2.5-pro' }, req);
    expect(r.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent');
    expect(r.url).not.toContain('key=');
    const body = r.body as Record<string, any>;
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'SYS' }] });
    const decl = body.tools[0].functionDeclarations[0];
    expect(JSON.stringify(decl.parameters)).not.toContain('additionalProperties');
    expect(body.contents[1]).toEqual({ role: 'model', parts: [{ functionCall: { name: 'submit_diagram', args: { nodes: [] } } }] });
    expect(body.contents[2].parts[0].functionResponse).toEqual({ id: 'call_1', name: 'submit_diagram', response: { error: 'Invalid' } });
  });

  it('parses function calls and keeps parts (thought signatures) for replay', () => {
    const parts = [{ text: 'thinking…', thought: true }, { functionCall: { name: 'search_icons', args: { query: 'GKE' } }, thoughtSignature: 'abc' }];
    const res = gemini.parseChat({ candidates: [{ content: { parts }, finishReason: 'STOP' }] });
    expect(res.text).toBe('');
    expect(res.toolCalls[0]).toMatchObject({ name: 'search_icons', args: { query: 'GKE' } });
    expect(res.stopReason).toBe('tool_use');
    expect(res.native).toBe(parts);
  });
});

describe('Ollama adapter', () => {
  it('builds /api/chat requests and parses object arguments', () => {
    const r = ollama.buildChat({ provider: 'ollama', model: 'qwen3' }, req);
    expect(r.url).toBe('http://localhost:11434/api/chat');
    expect((r.body as any).stream).toBe(false);
    expect((r.body as any).messages[3]).toEqual({ role: 'tool', tool_name: 'submit_diagram', content: 'Error: Invalid' });
    const res = ollama.parseChat({ message: { content: '', tool_calls: [{ function: { name: 'submit_diagram', arguments: { nodes: [] } } }] }, done: true });
    expect(res.toolCalls[0]).toMatchObject({ name: 'submit_diagram', args: { nodes: [] } });
    expect(ollama.parseListModels({ models: [{ name: 'qwen3:8b' }] })).toEqual([{ id: 'qwen3:8b' }]);
  });
});

describe('browser transport (no Tauri)', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps keys in memory and injects provider auth headers', async () => {
    expect(await hasKey('anthropic')).toBe(false);
    await saveKey('anthropic', '  sk-ant-test  ');
    expect(await hasKey('anthropic')).toBe(true);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: 'tool_use', id: 't', name: 'submit_diagram', input: {} }], stop_reason: 'tool_use' }), { status: 200 }),
    );
    const res = await chat({ provider: 'anthropic', model: 'claude-opus-5-5' }, req);
    expect(res.toolCalls[0].name).toBe('submit_diagram');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('sk-ant-test');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
    expect(init.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(init.headers['anthropic-beta']).toBe('server-side-fallback-2026-07-01');
    await deleteKey('anthropic');
    expect(await hasKey('anthropic')).toBe(false);
  });

  it('uses bearer / api-key / x-goog-api-key styles', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ data: [], models: [] }), { status: 200 }));
    await saveKey('openai', 'sk-1');
    await testConnection({ provider: 'openai', model: 'gpt-5' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-1');
    await saveKey('gemini', 'AIza1');
    await testConnection({ provider: 'gemini', model: 'gemini-2.5-pro' });
    expect(fetchMock.mock.calls[1][1].headers['x-goog-api-key']).toBe('AIza1');
    await saveKey('custom', 'az-key', { baseUrl: 'https://x.openai.azure.com/openai/v1', auth: 'api-key' });
    await testConnection({ provider: 'custom', model: 'm', baseUrl: 'https://x.openai.azure.com/openai/v1' });
    expect(fetchMock.mock.calls[2][0]).toBe('https://x.openai.azure.com/openai/v1/models');
    expect(fetchMock.mock.calls[2][1].headers['api-key']).toBe('az-key');
  });

  it('surfaces readable HTTP errors', async () => {
    await saveKey('openai', 'bad');
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Incorrect API key provided' } }), { status: 401 }));
    await expect(testConnection({ provider: 'openai', model: 'gpt-5' })).rejects.toThrow(/rejected by OpenAI/);
  });

  it('tests providers that cannot list models with a one-word chat', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ output: { message: { content: [{ text: 'OK' }] } }, stopReason: 'end_turn' }), { status: 200 }));
    await saveKey('bedrock', 'ABSKkey');
    expect(await testConnection({ provider: 'bedrock', model: 'us.amazon.nova-pro-v1:0', params: { region: 'eu-west-1' } })).toEqual([]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://bedrock-runtime.eu-west-1.amazonaws.com/model/us.amazon.nova-pro-v1%3A0/converse');
    expect(init.headers.Authorization).toBe('Bearer ABSKkey');
    expect(JSON.parse(init.body).toolConfig).toBeUndefined();
  });

  it('requires a key for hosted providers', async () => {
    await deleteKey('gemini');
    await expect(chat({ provider: 'gemini', model: 'gemini-2.5-pro' }, req)).rejects.toThrow(/Gemini API key/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('hosted OpenAI-compatible providers', () => {
  it('send each provider to its official base URL', () => {
    expect(openai.buildChat({ provider: 'xai', model: 'grok-4' }, req).url).toBe('https://api.x.ai/v1/chat/completions');
    expect(openai.buildChat({ provider: 'groq', model: 'm' }, req).url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(openai.buildChat({ provider: 'zai', model: 'glm-4.6' }, req).url).toBe('https://api.z.ai/api/paas/v4/chat/completions');
    // A base URL in the settings can't redirect a hosted provider elsewhere.
    expect(openai.buildChat({ provider: 'deepseek', model: 'm', baseUrl: 'https://evil.example' }, req).url).toBe('https://api.deepseek.com/v1/chat/completions');
  });
});

describe('key checks', () => {
  it('flags keys pasted for the wrong service, without judging unknown formats', () => {
    expect(checkKeyPrefix('xai', 'xai-abc')).toBeNull();
    expect(checkKeyPrefix('xai', 'grok_abc')).toEqual({ kind: 'grokApp' });
    expect(checkKeyPrefix('openai', 'sk-ant-abc')).toEqual({ kind: 'otherProvider', other: 'anthropic' });
    expect(checkKeyPrefix('anthropic', 'sk-ant-abc')).toBeNull();
    expect(checkKeyPrefix('deepseek', 'sk-abc')).toBeNull();
    expect(checkKeyPrefix('gemini', 'hello')).toEqual({ kind: 'unexpected', prefix: 'AIza' });
    expect(checkKeyPrefix('together', 'anything')).toBeNull();
    expect(checkKeyPrefix('openai', '')).toBeNull();
  });

  it('turns an invalid-key response into a friendly message and keeps the raw text', () => {
    const err = keyRejectedError('xai', 400, JSON.stringify({ error: 'Incorrect API key provided: gr***wk.' }));
    expect(err?.message).toContain('console.x.ai');
    expect(err?.detail).toContain('Incorrect API key');
    expect(keyRejectedError('xai', 429, 'Incorrect API key')).toBeNull();
    expect(keyRejectedError('openai', 400, '{"error":{"message":"Bad tool schema"}}')).toBeNull();
  });
});

describe('pasted base URLs', () => {
  it('drops endpoints copied along with the base', () => {
    expect(normalizeBaseUrl('https://r.services.ai.azure.com/openai/v1/responses')).toBe('https://r.services.ai.azure.com/openai/v1');
    expect(normalizeBaseUrl('https://openrouter.ai/api/v1/chat/completions/')).toBe('https://openrouter.ai/api/v1');
    expect(normalizeBaseUrl('http://localhost:1234/v1/')).toBe('http://localhost:1234/v1');
    expect(normalizeBaseUrl('https://x.example/v1/models?api-version=1')).toBe('https://x.example/v1?api-version=1');
  });

  it('lists models and chats at the right URLs for a pasted /responses endpoint', () => {
    const cfg = { provider: 'custom' as const, model: 'm', baseUrl: 'https://r.services.ai.azure.com/openai/v1/responses' };
    expect(openai.buildListModels(cfg).url).toBe('https://r.services.ai.azure.com/openai/v1/models');
    expect(openai.buildChat(cfg, req).url).toBe('https://r.services.ai.azure.com/openai/v1/chat/completions');
  });
});

describe('cloud platforms', () => {
  it('Azure: any resource URL becomes its OpenAI-compatible v1 base', () => {
    expect(azureBase('https://r.services.ai.azure.com/openai/v1/responses')).toBe('https://r.services.ai.azure.com/openai/v1');
    expect(azureBase('https://r.openai.azure.com')).toBe('https://r.openai.azure.com/openai/v1');
    expect(azureBase('https://r.cognitiveservices.azure.com/openai/deployments/x/chat/completions?api-version=1')).toBe('https://r.cognitiveservices.azure.com/openai/v1');
    expect(() => azureBase('https://example.com')).toThrow();
    expect(() => azureBase('http://r.openai.azure.com')).toThrow();
    expect(openai.buildChat({ provider: 'azure', model: 'my-gpt5', baseUrl: 'https://r.openai.azure.com/' }, req).url).toBe('https://r.openai.azure.com/openai/v1/chat/completions');
  });

  it('Cloudflare: account-scoped OpenAI-compatible base', () => {
    const id = '0123456789abcdef0123456789abcdef';
    expect(cloudflare.buildChat({ provider: 'cloudflare', model: '@cf/openai/gpt-oss-120b', params: { accountId: id } }, req).url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${id}/ai/v1/chat/completions`,
    );
    expect(() => cloudflare.buildChat({ provider: 'cloudflare', model: 'm', params: { accountId: 'nope' } }, req)).toThrow(/account ID/);
    expect(cloudflare.buildListModels).toBeUndefined();
  });

  it('Vertex: Gemini wire format at the publisher-model endpoint', () => {
    const r = vertex.buildChat({ provider: 'vertex', model: 'gemini-2.5-pro' }, req);
    expect(r.url).toBe('https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-pro:generateContent');
    expect((r.body as { contents: unknown[] }).contents).toHaveLength(3);
  });

  it('Bedrock: builds a Converse request', () => {
    const r = bedrock.buildChat({ provider: 'bedrock', model: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', params: { region: 'us-west-2' } }, req);
    expect(r.url).toBe('https://bedrock-runtime.us-west-2.amazonaws.com/model/us.anthropic.claude-sonnet-4-5-20250929-v1%3A0/converse');
    const body = r.body as { system: unknown; messages: Array<{ role: string; content: unknown[] }>; toolConfig: { tools: unknown[] }; inferenceConfig?: unknown };
    expect(body.system).toEqual([{ text: 'SYS' }]);
    expect(body.messages).toEqual([
      { role: 'user', content: [{ text: 'Draw a login flow' }] },
      { role: 'assistant', content: [{ toolUse: { toolUseId: 'call_1', name: 'submit_diagram', input: { nodes: [] } } }] },
      { role: 'user', content: [{ toolResult: { toolUseId: 'call_1', content: [{ text: 'Invalid' }], status: 'error' } }] },
    ]);
    expect(body.toolConfig.tools).toEqual([{ toolSpec: { name: 'submit_diagram', description: 'Submit', inputSchema: { json: tool.parameters } } }]);
    expect(body.inferenceConfig).toEqual({ maxTokens: 16000 });
    expect(() => bedrock.buildChat({ provider: 'bedrock', model: 'm', params: { region: 'mars' } }, req)).toThrow(/region/);
  });

  it('Bedrock: parses tool use and replays the message natively', () => {
    const content = [{ reasoningContent: { reasoningText: { text: 'hmm' } } }, { text: 'Here.' }, { toolUse: { toolUseId: 'tu1', name: 'submit_diagram', input: { nodes: [] } } }];
    const res = bedrock.parseChat({ output: { message: { role: 'assistant', content } }, stopReason: 'tool_use' });
    expect(res).toMatchObject({ text: 'Here.', stopReason: 'tool_use', toolCalls: [{ id: 'tu1', name: 'submit_diagram', args: { nodes: [] } }] });
    const next = bedrock.buildChat({ provider: 'bedrock', model: 'm' }, { ...req, messages: [{ role: 'assistant', text: 'Here.', toolCalls: res.toolCalls, native: res.native }] });
    expect((next.body as { messages: Array<{ content: unknown }> }).messages[0].content).toBe(content);
    expect(bedrock.parseChat({ output: { message: { content: [{ text: 'Done' }] } }, stopReason: 'max_tokens' }).stopReason).toBe('max_tokens');
    expect(() => bedrock.parseChat({ message: 'Bad' })).toThrow();
  });
});
