import { describe, expect, it } from 'vitest';
import { loadRuns, MAX_SAVED_RUNS, saveRuns, type SavedRun } from '@/ai/history';
import { parseAssistant, parsePages, serializePages } from '@/io/fileFormat';
import { newPage } from '@/store/editor';

const spec = { type: 'flowchart', nodes: [{ id: 'a', kind: 'process', text: 'A' }, { id: 'b', kind: 'process', text: 'B' }], edges: [{ from: 'a', to: 'b' }] };

const run = (prompt: string, extra: Partial<SavedRun> = {}): SavedRun => ({
  prompt,
  mode: 'generate',
  model: 'Claude Opus 5.5',
  at: '2026-10-24T12:00:00.000Z',
  status: 'done',
  steps: [{ id: 's1', label: 'Drawing the diagram', state: 'done', kind: 'think' }],
  ...extra,
});

describe('AI conversation saved with the file', () => {
  it('round-trips through the file, and only finished requests are saved', () => {
    const v = loadRuns([{ ...run('x'), result: { kind: 'spec', spec, warnings: [], message: '' } }]);
    const finished = { ...v[0], applied: 'insert' as const };
    const saved = saveRuns([finished, { ...run('still going'), status: 'running' }]);
    expect(saved.map((r) => r.prompt)).toEqual(['x']);

    const text = serializePages([newPage('Page 1')], undefined, saved);
    expect(parsePages(text)).toHaveLength(1);
    const back = loadRuns(parseAssistant(text));
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ prompt: 'x', status: 'done', applied: 'insert', model: 'Claude Opus 5.5' });
    expect(back[0].result?.kind).toBe('spec');
    // Saving what was loaded writes the same thing, so opening a file doesn't change it.
    expect(JSON.stringify(saveRuns(back))).toBe(JSON.stringify(saved));
  });

  it('keeps the file clean when there is no conversation', () => {
    expect(serializePages([newPage('Page 1')])).not.toContain('"assistant"');
    expect(serializePages([newPage('Page 1')], undefined, [])).not.toContain('"assistant"');
    expect(parseAssistant(serializePages([newPage('Page 1')]))).toBeUndefined();
    expect(parseAssistant('not json')).toBeUndefined();
  });

  it('keeps only the latest requests', () => {
    const many = Array.from({ length: MAX_SAVED_RUNS + 5 }, (_, i) => run(`p${i}`));
    const saved = saveRuns(many);
    expect(saved).toHaveLength(MAX_SAVED_RUNS);
    expect(saved.at(-1)?.prompt).toBe(`p${MAX_SAVED_RUNS + 4}`);
  });

  it('drops what a hand-edited or foreign file gets wrong', () => {
    const back = loadRuns([
      null,
      'text',
      { prompt: '', status: 'done' },
      { prompt: 'no status' },
      { prompt: 'bad spec', status: 'done', result: { kind: 'spec', spec: { nodes: 'x' } } },
      { prompt: 'odd step', status: 'error', error: 'Rate limited', steps: [{ id: 's', label: 'Working', state: 'running' }, { label: 'no id' }] },
      { prompt: 'edit', status: 'done', mode: 'edit', applied: 'sideways', result: { kind: 'ops', ops: [{ op: 'add_node' }, 7], summary: 1 } },
    ]);
    expect(back.map((r) => r.prompt)).toEqual(['bad spec', 'odd step', 'edit']);
    // A finished request whose result is unreadable has nothing to show.
    expect(back[0]).toMatchObject({ status: 'cancelled', result: undefined });
    expect(back[1].steps).toEqual([{ id: 's', label: 'Working', state: 'done', detail: undefined, kind: undefined, query: undefined, icon: undefined }]);
    expect(back[1].error).toBe('Rate limited');
    expect(back[2]).toMatchObject({ mode: 'edit', applied: undefined });
    expect(back[2].result).toMatchObject({ kind: 'ops', ops: [{ op: 'add_node' }], summary: '' });
    expect(loadRuns({ not: 'an array' })).toEqual([]);
  });
});
