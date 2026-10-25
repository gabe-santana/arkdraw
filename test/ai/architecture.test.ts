import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARCHITECTURE_TOPICS, architectureGuide, reviewArchitecture } from '@/ai/generate/architecture';
import { runAssistant, type AgentEvent } from '@/ai/generate/agent';
import { resetIconCache } from '@/ai/generate/icons';
import type { ChatRequest, ChatResponse } from '@/ai/providers/types';
import type { DiagramSpec } from '@/ai/generate/spec';

const reply = (r: Partial<ChatResponse>): ChatResponse => ({ text: '', toolCalls: [], stopReason: 'tool_use', native: undefined, ...r });

/** Two regions, each with an app; logs from B go to A's workspace; SQL replicates A → B. */
const twoRegions = (logsLabel = 'logs'): DiagramSpec => ({
  type: 'cloud',
  nodes: [
    { id: 'ra', kind: 'container', text: 'Região A (Primária)' },
    { id: 'rb', kind: 'container', text: 'Region B (secondary)' },
    { id: 'env_b', kind: 'container', text: 'Container Apps Env', parent: 'rb' },
    { id: 'app_a', kind: 'rectangle', text: 'Orders Service', parent: 'ra' },
    { id: 'app_b', kind: 'rectangle', text: 'Orders Service (R2)', parent: 'env_b' },
    { id: 'logs_a', kind: 'rectangle', text: 'Log Analytics', parent: 'ra' },
    { id: 'sql_a', kind: 'cylinder', text: 'Azure SQL (Primary)', parent: 'ra' },
    { id: 'sql_b', kind: 'cylinder', text: 'Azure SQL (Replica)', parent: 'rb' },
    { id: 'fd', kind: 'rectangle', text: 'Front Door' },
  ],
  edges: [
    { from: 'app_a', to: 'logs_a', label: 'logs' },
    { from: 'app_b', to: 'logs_a', label: logsLabel },
    { from: 'sql_a', to: 'sql_b', label: 'geo-replication' },
    { from: 'fd', to: 'app_a' },
    { from: 'fd', to: 'app_b' },
  ],
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetIconCache();
});

describe('architecture review', () => {
  it('flags a region depending on the other one, not replication or global routing', () => {
    const notes = reviewArchitecture(twoRegions());
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/Orders Service \(R2\).*Log Analytics.*crosses regions/);
  });

  it('accepts links that say they replicate or fail over', () => {
    expect(reviewArchitecture(twoRegions('log replication'))).toEqual([]);
  });

  it('flags a data store on a public path', () => {
    const notes = reviewArchitecture({ type: 'cloud', nodes: [{ id: 'u', kind: 'rectangle', text: 'Users' }, { id: 'db', kind: 'cylinder', text: 'Orders DB' }], edges: [{ from: 'u', to: 'db' }] });
    expect(notes.join()).toMatch(/public path/);
  });

  it('has a guide for every topic it offers', () => {
    for (const topic of ARCHITECTURE_TOPICS) expect(architectureGuide(topic)?.length).toBeGreaterThan(100);
    expect(architectureGuide('nope')).toBeNull();
  });
});

describe('assistant with the architecture review', () => {
  const run = async (script: ChatResponse[]) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })));
    const requests: ChatRequest[] = [];
    const events: AgentEvent[] = [];
    const chat = vi.fn(async (_c: unknown, r: ChatRequest) => {
      requests.push(structuredClone(r));
      return script.shift()!;
    });
    const result = await runAssistant({ config: { provider: 'anthropic', model: 'claude-opus-5-5' }, prompt: 'Two regions', mode: 'generate', chat, onEvent: (e) => events.push(e) });
    return { result, requests, events, calls: chat.mock.calls.length };
  };

  it('keeps the diagram when the model explains the choice', async () => {
    const { result, requests, events, calls } = await run([
      reply({ toolCalls: [{ id: 'g', name: 'get_architecture_guide', args: { topic: 'observability' } }] }),
      reply({ toolCalls: [{ id: 's', name: 'submit_diagram', args: twoRegions() }] }),
      reply({ text: 'Logs are centralized in region A; ask for a workspace per region for resilience.', stopReason: 'end' }),
    ]);
    expect(calls).toBe(3);
    expect(result.kind).toBe('spec');
    expect(result.message).toMatch(/centralized in region A/);
    // The guide and the review notes went back to the model.
    const guide = requests[1].messages.at(-1);
    expect(guide?.role === 'tool' && guide.results[0].content).toMatch(/Log Analytics workspace and Application Insights per region/);
    const review = requests[2].messages.at(-1);
    expect(review?.role === 'tool' && review.results[0].content).toMatch(/architecture review notes/);
    expect(events.some((e) => e.type === 'step' && e.kind === 'check' && /architecture/i.test(e.label))).toBe(true);
  });

  it('takes the fixed diagram when the model resubmits, without a second review', async () => {
    const fixed = twoRegions();
    fixed.nodes.push({ id: 'logs_b', kind: 'rectangle', text: 'Log Analytics', parent: 'rb' });
    fixed.edges[1] = { from: 'app_b', to: 'logs_b', label: 'logs' };
    const { result, calls } = await run([
      reply({ toolCalls: [{ id: 's1', name: 'submit_diagram', args: twoRegions() }] }),
      reply({ text: 'Each region keeps its own logs.', toolCalls: [{ id: 's2', name: 'submit_diagram', args: fixed }] }),
    ]);
    expect(calls).toBe(2);
    expect(result.kind === 'spec' && result.spec.nodes.some((n) => n.id === 'logs_b')).toBe(true);
  });
});
