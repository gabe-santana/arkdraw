import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initEmbedMode, isEmbedded, type EmbedHost } from '@/web/embed';
import { newPage, useEditor } from '@/store/editor';
import { parsePages, serializePages } from '@/io/fileFormat';
import type { ShapeElement } from '@/model/types';
import { DEFAULT_STYLE } from '@/model/defaults';

const shape = (id: string, x = 0): ShapeElement => ({
  id,
  type: 'shape',
  kind: 'rectangle',
  x,
  y: 0,
  w: 120,
  h: 60,
  text: id,
  groupIds: [],
  style: { ...DEFAULT_STYLE },
});

const diagramJson = () =>
  serializePages([
    { ...newPage('One', { elements: { a: shape('a') }, order: ['a'] }), id: 'p1' },
    { ...newPage('Two', { elements: { b: shape('b') }, order: ['b'] }), id: 'p2' },
  ]);

const DRAWIO = `<mxfile><diagram name="Imported"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="2" value="Hello" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="10" y="20" width="120" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

let posted: Array<{ msg: unknown; origin: string }>;
let parent: EmbedHost['parent'];
let stop: (() => void) | null = null;

/** Starts embed mode and waits for the init announcement. */
async function start(opts: Parameters<typeof initEmbedMode>[0] = {}) {
  stop = initEmbedMode({ host: { self: window, parent }, ui: false, autosaveDelay: 20, ...opts });
  await tick();
}

function send(data: unknown, { from = parent, origin = 'https://host.example.com' }: { from?: unknown; origin?: string } = {}) {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: from as MessageEventSource }));
}

const events = () => posted.map((p) => (typeof p.msg === 'string' ? JSON.parse(p.msg) : p.msg) as Record<string, unknown>);
const last = () => events().at(-1)!;

beforeEach(() => {
  posted = [];
  parent = { postMessage: vi.fn((msg: unknown, origin: string) => posted.push({ msg, origin })) };
  useEditor.getState().newDoc();
});

afterEach(() => {
  stop?.();
  stop = null;
});

describe('embed mode', () => {
  it('announces itself with an init event', async () => {
    await start();
    expect(isEmbedded()).toBe(true);
    await tick();
    expect(events()).toEqual([{ event: 'init' }]);
  });

  it('loads OpenDraw JSON (string or object) and replies with a load event', async () => {
    await start();
    send({ action: 'load', json: diagramJson(), title: 'Arch', id: 7 });
    await tick();
    const s = useEditor.getState();
    expect(s.pages.map((p) => p.name)).toEqual(['One', 'Two']);
    expect(s.file.name).toBe('Arch');
    expect(last()).toEqual({ event: 'load', pages: 2, title: 'Arch', id: 7 });

    send({ action: 'load', json: JSON.parse(diagramJson()) });
    await tick();
    expect(useEditor.getState().pages).toHaveLength(2);
  });

  it('loads mxGraph XML and blank documents', async () => {
    await start();
    send({ action: 'load', xml: DRAWIO });
    await tick();
    const doc = useEditor.getState().doc;
    expect(doc.order).toHaveLength(1);
    expect(doc.elements[doc.order[0]].text).toBe('Hello');

    send({ action: 'load', xml: '' });
    await tick();
    expect(useEditor.getState().doc.order).toHaveLength(0);
  });

  it('exports json and drawio', async () => {
    await start();
    send({ action: 'load', json: diagramJson() });
    await tick();

    send({ action: 'export', format: 'json', id: 'x1' });
    await tick();
    const json = last();
    expect(json).toMatchObject({ event: 'export', format: 'json', mime: 'application/json', id: 'x1' });
    expect(parsePages(json.data as string).map((p) => p.name)).toEqual(['One', 'Two']);

    send({ action: 'export', format: 'drawio' });
    await tick(80);
    const xml = last();
    expect(xml).toMatchObject({ event: 'export', format: 'drawio' });
    expect(xml.data as string).toContain('<mxfile');
  });

  it('reports errors for bad requests', async () => {
    await start();
    send({ action: 'export', format: 'bmp', id: 3 });
    await tick();
    expect(last()).toMatchObject({ event: 'error', action: 'export', id: 3 });
    send({ action: 'teleport' });
    await tick();
    expect(last()).toMatchObject({ event: 'error', action: 'teleport' });
    send({ action: 'load', json: '{"format":"nope"}' });
    await tick();
    expect(last()).toMatchObject({ event: 'error', action: 'load' });
  });

  it('ignores messages that are not from the parent window', async () => {
    await start();
    await tick();
    const before = posted.length;
    send({ action: 'export', format: 'json' }, { from: window });
    send({ action: 'export', format: 'json' }, { from: { postMessage() {} } });
    send({ action: 'export', format: 'json' }, { from: null });
    send('not json');
    send({ hello: 'world' });
    await tick();
    expect(posted.length).toBe(before);
  });

  it('only talks to the configured origin', async () => {
    await start({ parentOrigin: 'https://host.example.com' });
    await tick();
    expect(posted[0].origin).toBe('https://host.example.com');
    send({ action: 'export', format: 'json' }, { origin: 'https://evil.example.net' });
    await tick();
    expect(posted).toHaveLength(1);
    send({ action: 'export', format: 'json' });
    await tick();
    expect(posted).toHaveLength(2);
    expect(posted[1].origin).toBe('https://host.example.com');
  });

  it('pins the first origin that talks to it', async () => {
    await start();
    send({ action: 'exit' }, { origin: 'https://first.example.com' });
    await tick();
    expect(posted.at(-1)!.origin).toBe('https://first.example.com');
    const n = posted.length;
    send({ action: 'exit' }, { origin: 'https://second.example.com' });
    await tick();
    expect(posted.length).toBe(n);
  });

  it('answers JSON strings with JSON strings (mxGraph protocol)', async () => {
    await start();
    send(JSON.stringify({ action: 'exit' }));
    await tick();
    expect(typeof posted.at(-1)!.msg).toBe('string');
    expect(last()).toEqual({ event: 'exit', modified: false });
  });

  it('intercepts Ctrl/⌘+S and posts a save event', async () => {
    await start();
    send({ action: 'load', json: diagramJson(), title: 'Arch' });
    await tick();
    const other = vi.fn();
    document.addEventListener('keydown', other);
    const e = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(e);
    document.removeEventListener('keydown', other);
    expect(e.defaultPrevented).toBe(true);
    expect(other).not.toHaveBeenCalled();
    const save = last();
    expect(save).toMatchObject({ event: 'save', title: 'Arch', exit: false });
    expect(parsePages(save.json as string)).toHaveLength(2);
  });

  it('posts debounced autosave events only when enabled and changed', async () => {
    await start({ autosave: true });
    send({ action: 'load', json: diagramJson() });
    await tick(60);
    expect(events().some((e) => e.event === 'autosave')).toBe(false);

    const s = useEditor.getState();
    s.loadPages(s.allPages().map((p, i) => (i === 0 ? { ...p, doc: { elements: { z: shape('z') }, order: ['z'] } } : p)), { path: null, name: 'Arch' });
    await tick(60);
    const auto = events().filter((e) => e.event === 'autosave');
    expect(auto).toHaveLength(1);
    expect(parsePages(auto[0].json as string)[0].doc.order).toEqual(['z']);
  });

  it('marks the document saved on {action:"status", modified:false}', async () => {
    await start();
    send({ action: 'load', json: diagramJson() });
    await tick();
    const s = useEditor.getState();
    useEditor.setState({ doc: { ...s.doc, order: [...s.doc.order] } });
    send({ action: 'exit' });
    await tick();
    expect(last()).toEqual({ event: 'exit', modified: true });
    send({ action: 'status', modified: false });
    send({ action: 'exit' });
    await tick();
    expect(last()).toEqual({ event: 'exit', modified: false });
  });

  it('stops listening after cleanup', async () => {
    await start();
    await tick();
    stop!();
    stop = null;
    expect(isEmbedded()).toBe(false);
    const n = posted.length;
    send({ action: 'exit' });
    await tick();
    expect(posted.length).toBe(n);
  });
});
