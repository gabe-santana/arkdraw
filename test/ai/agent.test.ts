import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAssistant, type AgentEvent } from '@/ai/generate/agent';
import { resetIconCache, searchIcons } from '@/ai/generate/icons';
import type { ChatRequest, ChatResponse } from '@/ai/providers/types';

const providers = [{ id: 'aws', name: 'AWS', count: 3, categories: ['compute'] }];
const awsIndex = {
  provider: 'aws',
  name: 'AWS',
  icons: [
    { id: 'amazon-ec2', name: 'Amazon EC2', category: 'compute', file: 'compute/amazon-ec2.svg', keywords: ['vm', 'instance', 'server'] },
    { id: 'amazon-ec2-auto-scaling', name: 'Amazon EC2 Auto Scaling', category: 'compute', file: 'compute/amazon-ec2-auto-scaling.svg', keywords: ['scaling'] },
    { id: 'amazon-rds', name: 'Amazon RDS', category: 'database', file: 'database/amazon-rds.svg', keywords: ['sql', 'postgres', 'mysql'] },
  ],
};

function mockIcons(installed = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (!installed) return new Response('not found', { status: 404 });
      if (url.endsWith('icons/providers.json')) return new Response(JSON.stringify(providers));
      if (url.endsWith('icons/aws/index.json')) return new Response(JSON.stringify(awsIndex));
      return new Response('not found', { status: 404 });
    }),
  );
}

const reply = (r: Partial<ChatResponse>): ChatResponse => ({ text: '', toolCalls: [], stopReason: 'tool_use', native: undefined, ...r });

beforeEach(() => resetIconCache());
afterEach(() => vi.unstubAllGlobals());

describe('searchIcons', () => {
  it('ranks the plain service icon first', async () => {
    mockIcons();
    const hits = await searchIcons('EC2');
    expect(hits[0].icon).toBe('aws/compute/amazon-ec2.svg');
    expect((await searchIcons('postgres'))[0].icon).toBe('aws/database/amazon-rds.svg');
    expect(await searchIcons('EC2', 'azure')).toEqual([]);
  });

  it('degrades gracefully when no packs are installed', async () => {
    mockIcons(false);
    expect(await searchIcons('EC2')).toEqual([]);
  });
});

describe('runAssistant', () => {
  it('runs the tool loop: search icons, fix an invalid spec, then accept', async () => {
    mockIcons();
    const requests: ChatRequest[] = [];
    const script: ChatResponse[] = [
      reply({ toolCalls: [{ id: 'a', name: 'search_icons', args: { query: 'EC2' } }] }),
      reply({ toolCalls: [{ id: 'b', name: 'submit_diagram', args: { type: 'cloud', nodes: [{ id: 'x', kind: 'icon', text: 'EC2', icon: 'aws/compute/amazon-ec2.svg' }], edges: [{ from: 'x', to: 'nope' }] } }] }),
      reply({
        text: 'Here you go.',
        toolCalls: [{ id: 'c', name: 'submit_diagram', args: { type: 'cloud', nodes: [{ id: 'x', kind: 'icon', text: 'EC2', icon: 'aws/compute/amazon-ec2.svg' }, { id: 'y', kind: 'icon', text: 'Bogus', icon: 'aws/x/fake.svg' }], edges: [] } }],
      }),
    ];
    const events: AgentEvent[] = [];
    const chat = vi.fn(async (_c: unknown, r: ChatRequest) => {
      requests.push(structuredClone(r));
      return script.shift()!;
    });
    const result = await runAssistant({ config: { provider: 'anthropic', model: 'claude-opus-5-5' }, prompt: 'One EC2', mode: 'generate', chat, onEvent: (e) => events.push(e) });
    expect(chat).toHaveBeenCalledTimes(3);
    expect(result.kind).toBe('spec');
    if (result.kind !== 'spec') return;
    expect(result.spec.nodes[0].icon).toBe('aws/compute/amazon-ec2.svg');
    expect(result.spec.nodes[1].kind).toBe('rectangle'); // unknown icon replaced
    expect(result.warnings.join()).toMatch(/not found/);
    expect(result.message).toBe('Here you go.');
    // Tool results were fed back.
    const toolMsg = requests[1].messages[2];
    expect(toolMsg.role).toBe('tool');
    if (toolMsg.role === 'tool') expect(JSON.parse(toolMsg.results[0].content).matches[0].icon).toBe('aws/compute/amazon-ec2.svg');
    const errMsg = requests[2].messages[4];
    expect(errMsg.role === 'tool' && errMsg.results[0].isError).toBe(true);
    expect(requests[0].tools.map((t) => t.name)).toEqual(['search_icons', 'submit_diagram']);
    expect(events.some((e) => e.type === 'step' && e.label.includes('Searching icons'))).toBe(true);
  });

  it('nudges once when the model answers in prose, then fails clearly', async () => {
    mockIcons(false);
    const chat = vi.fn(async () => reply({ text: 'Sure! Here is a diagram: A -> B', stopReason: 'end' }));
    await expect(runAssistant({ config: { provider: 'ollama', model: 'qwen3' }, prompt: 'A to B', mode: 'generate', chat })).rejects.toThrow(/A -> B/);
    expect(chat).toHaveBeenCalledTimes(2);
    const tools = (chat.mock.calls[0] as unknown as [unknown, ChatRequest])[1].tools.map((t) => t.name);
    expect(tools).toEqual(['submit_diagram']); // no icon tool without packs
  });

  it('returns validated edit operations in edit mode', async () => {
    mockIcons(false);
    const doc = {
      elements: {
        s1: { id: 's1', type: 'shape' as const, kind: 'rectangle', x: 0, y: 0, w: 100, h: 50, text: 'A', style: {} as never, groupIds: [] },
      },
      order: ['s1'],
    };
    const chat = vi.fn(async (_c: unknown, r: ChatRequest) => {
      expect(r.messages[0].role === 'user' && r.messages[0].text).toContain('"id":"s1"');
      expect(r.tools.map((t) => t.name)).toContain('submit_edits');
      return reply({ toolCalls: [{ id: 'e', name: 'submit_edits', args: { summary: 'Rename', ops: [{ op: 'update_node', id: 's1', text: 'B' }] } }] });
    });
    const result = await runAssistant({ config: { provider: 'openai', model: 'gpt-5' }, prompt: 'rename to B', mode: 'edit', doc, selection: ['s1'], chat });
    expect(result).toMatchObject({ kind: 'ops', summary: 'Rename', ops: [{ op: 'update_node', id: 's1', text: 'B' }] });
  });
});
