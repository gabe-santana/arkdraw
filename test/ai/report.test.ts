import { describe, expect, it } from 'vitest';
import { describeResult, REPORT_EMAIL, reportMailto, reportText, type AiReport } from '@/ai/report';
import type { AgentResult } from '@/ai/generate/agent';

const spec: AgentResult = {
  kind: 'spec',
  spec: { type: 'flowchart', title: 'Checkout', nodes: [{ id: 'a', kind: 'rectangle', text: 'Cart' }, { id: 'b', kind: 'rectangle', text: 'Pay' }], edges: [{ from: 'a', to: 'b', label: 'submit' }] },
  warnings: [],
  message: 'Two steps.',
};
const base: AiReport = { reason: 'offensive', details: ' rude label ', model: 'claude-opus-5-5', version: '0.1.0', platform: 'web' };

describe('AI content reports', () => {
  it('describes what the assistant drew or changed', () => {
    expect(describeResult(spec)).toBe('Title: Checkout\nLabels: Cart | Pay | submit\nReply: Two steps.');
    const ops: AgentResult = {
      kind: 'ops',
      ops: [{ op: 'update_node', id: 'a', text: 'Basket' }, { op: 'add_edge', edge: { from: 'a', to: 'b', label: 'retry' } }, { op: 'remove_node', id: 'c' }],
      summary: 'Renamed the cart',
      warnings: [],
      message: '',
    };
    expect(describeResult(ops)).toBe('Summary: Renamed the cart\nText: Basket | retry');
  });

  it('includes the request and output only when asked', () => {
    expect(reportText(base)).not.toMatch(/Cart|Request/);
    const text = reportText({ ...base, content: { prompt: 'checkout flow', result: spec } });
    expect(text).toMatch(/Reason: offensive\n\nDetails: rude label\n\nRequest: checkout flow\n\nGenerated:\nTitle: Checkout/);
    expect(text).toMatch(/Model: claude-opus-5-5\n\nArkDraw 0\.1\.0 \(web\)$/);
  });

  it('builds a mail link that stays short with long content', () => {
    const long = { ...base, content: { prompt: 'x'.repeat(5000), result: { ...spec, message: 'y'.repeat(5000) } } };
    const url = reportMailto(long);
    expect(url.startsWith(`mailto:${REPORT_EMAIL}?subject=`)).toBe(true);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body.length).toBeLessThanOrEqual(1900);
    // The model and version survive: only the long parts are cut.
    expect(body).toMatch(/ArkDraw 0\.1\.0 \(web\)$/);
  });
});
