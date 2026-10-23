import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectorElement, Doc, ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { isHidden, newPage, useEditor } from '@/store/editor';
import { applyVisibility, buildActionLink, parseActionLink, resolveTargets, revealAll, runActionLink, type ActionHost } from '@/automation/linkActions';
import { placeholderLookup } from '@/automation/placeholders';
import { parallelEdgesPatches, parseLayoutJson, runLayoutSteps } from '@/automation/layouts';
import { anonymizeDoc, anonymizeText, neighbourhood } from '@/automation/plugins';
import { parseConfig, resolveLibraryIds } from '@/automation/configuration';
import { iframeSnippet, imageSnippet, markdownImage, viewerUrl } from '@/automation/embedSnippets';
import { extractDrawioXml, hasDrawioXml, drawioXmlFor, elementsFromDrawioXml } from '@/automation/clipboardXml';
import { documentStats, metaForSave, updateDocMeta } from '@/automation/fileProperties';
import { enableMathLabels } from '@/automation/urlParams';
import { MERMAID_KEY, mermaidGroupOf, regenerateMermaid, withMermaidSource } from '@/automation/mermaidRegen';
import { layoutSheets, pagesToPrint } from '@/app/print';
import { parseMeta, parsePages, serializePages } from '@/io/fileFormat';
import { exportDrawioPages, importDrawioPages } from '@/io/drawio';
import { parseLaunchParams } from '@/web/launch';
import { decodeShareUrl } from '@/io/export/share';

const shape = (id: string, x: number, y: number, extra: Partial<ShapeElement> = {}): ShapeElement => ({ ...createShape('rectangle', { x, y, w: 100, h: 60 }, {}, id.toUpperCase()), id, ...extra });
const conn = (id: string, a: string, b: string): ConnectorElement => ({ ...createConnector({ elementId: a, x: 0, y: 0 }, { elementId: b, x: 0, y: 0 }), id });
const docOf = (...els: Array<ShapeElement | ConnectorElement>): Doc => ({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) });

describe('custom link actions', () => {
  const doc = docOf(shape('a', 0, 0, { tags: ['db'] }), shape('b', 200, 0), shape('c', 400, 0, { tags: ['db'] }), conn('ab', 'a', 'b'));
  const docL: Doc = { ...doc, layers: [{ id: 'L1', name: 'Base', visible: true, locked: false }, { id: 'L2', name: 'Notes', visible: true, locked: false }] };

  it('parses draw.io action JSON and builds it back', () => {
    const link = 'data:action/json,{"actions":[{"toggle":{"cells":["a"]}},{"highlight":{"tags":["db"],"color":"#f00"}},{"open":"data:page/id,p2"}]}';
    const actions = parseActionLink(link)!;
    expect(actions.map((a) => a.kind)).toEqual(['toggle', 'highlight', 'open']);
    expect(parseActionLink(buildActionLink(actions))).toEqual(actions);
    expect(parseActionLink('data:action/json,{nope')).toBeNull();
  });

  it('resolves cells, tags, layers, * and exclusions', () => {
    expect(resolveTargets(doc, { tags: ['db'] }).elements).toEqual(['a', 'c']);
    expect(resolveTargets(docL, { cells: ['L2', 'b'] })).toEqual({ elements: ['b'], layers: ['L2'] });
    expect(resolveTargets(doc, { cells: ['*'], excludeCells: ['ab'] }).elements).toEqual(['a', 'b', 'c']);
  });

  it('hides shapes with their connectors, toggles back, and hides layers', () => {
    const hidden = applyVisibility(doc, { elements: ['a'], layers: [] }, 'hide');
    expect(hidden.elements.a.hidden).toBe(true);
    expect(hidden.elements.ab.hidden).toBe(true);
    expect(isHidden(hidden, hidden.elements.a)).toBe(true);
    const back = applyVisibility(hidden, { elements: ['a'], layers: [] }, 'toggle');
    expect(back.elements.a.hidden).toBeUndefined();
    expect(revealAll(hidden).elements.ab.hidden).toBeUndefined();
    const layerOff = applyVisibility(docL, { elements: [], layers: ['L2'] }, 'toggle');
    expect(layerOff.layers![1].visible).toBe(false);
  });

  it('runs actions in order against a host', () => {
    let cur = doc;
    const host: ActionHost = { getDoc: () => cur, setDoc: (d) => (cur = d), select: vi.fn(), highlight: vi.fn(), scrollTo: vi.fn(), open: vi.fn() };
    const ok = runActionLink(buildActionLink([{ kind: 'hide', targets: { tags: ['db'] } }, { kind: 'select', targets: { cells: ['b'] } }, { kind: 'open', url: 'data:page/id,p2' }]), host);
    expect(ok).toBe(true);
    expect(cur.elements.c.hidden).toBe(true);
    expect(host.select).toHaveBeenCalledWith(['b']);
    expect(host.open).toHaveBeenCalledWith('page:p2');
  });
});

describe('placeholders with parent lookup', () => {
  it('walks containers, then layer, page and document', () => {
    const outer = shape('outer', 0, 0, { data: { team: 'Core' } });
    const inner = shape('inner', 10, 10, { containerId: 'outer' });
    const doc: Doc = { ...docOf(outer, inner), layers: [{ id: 'L', name: 'L', visible: true, locked: false, data: { env: 'prod' } }] };
    const look = placeholderLookup(doc, { owner: 'Ada' }, { title: 'Spec', data: { version: '2' } });
    expect(look('team', inner)).toBe('Core');
    expect(look('env', inner)).toBe('prod');
    expect(look('owner', inner)).toBe('Ada');
    expect(look('version', inner)).toBe('2');
    expect(look('title', inner)).toBe('Spec');
    expect(look('missing', inner)).toBeUndefined();
  });
});

describe('file format: page data, layer data, hidden and file properties', () => {
  it('round-trips through .opendraw', () => {
    const page = { ...newPage('P', { ...docOf(shape('a', 0, 0, { hidden: true })), layers: [{ id: 'L', name: 'L', visible: true, locked: false, data: { k: 'v' } }] }), data: { owner: 'Ada' } };
    const text = serializePages([page], { title: 'T', author: 'A', created: '2026-01-01T00:00:00.000Z' });
    const [back] = parsePages(text);
    expect(back.data).toEqual({ owner: 'Ada' });
    expect(back.doc.layers?.[0].data).toEqual({ k: 'v' });
    expect(back.doc.elements.a.hidden).toBe(true);
    expect(parseMeta(text)).toMatchObject({ title: 'T', author: 'A' });
    expect(parseMeta('{"format":"opendraw","pages":[]}')).toBeUndefined();
  });

  it('round-trips layer data and hidden cells through draw.io', async () => {
    const doc: Doc = {
      ...docOf(shape('a', 0, 0, { layerId: 'L1' }), shape('b', 200, 0, { layerId: 'L2', hidden: true })),
      layers: [{ id: 'L1', name: 'Base', visible: true, locked: false }, { id: 'L2', name: 'Notes', visible: true, locked: false, data: { owner: 'Ada' } }],
    };
    const xml = await exportDrawioPages([{ name: 'P', doc }]);
    expect(xml).toContain('<object label="Notes" id="L2" owner="Ada">');
    const [p] = await importDrawioPages(xml);
    expect(p.doc.layers?.find((l) => l.id === 'L2')?.data).toEqual({ owner: 'Ada' });
    expect(p.doc.elements.b.hidden).toBe(true);
    expect(p.doc.elements.a.hidden).toBeUndefined();
  });

  it('stamps created once and modified on save; stats count elements', () => {
    useEditor.getState().loadPages([newPage('P', docOf(shape('a', 0, 0), shape('b', 200, 0), conn('ab', 'a', 'b')))], { path: null, name: 'x', meta: { created: '2020-01-01T00:00:00.000Z' } });
    const meta = metaForSave(new Date('2026-05-05T00:00:00Z'));
    expect(meta.created).toBe('2020-01-01T00:00:00.000Z');
    expect(meta.modified).toBe('2026-05-05T00:00:00.000Z');
    updateDocMeta({ title: 'Hello' });
    expect(useEditor.getState().docMeta.title).toBe('Hello');
    expect(useEditor.getState().file.savedMeta).toBe('');
    expect(documentStats(useEditor.getState().allPages())).toMatchObject({ pages: 1, shapes: 2, connectors: 1 });
  });
});

describe('layouts', () => {
  const doc = docOf(shape('a', 0, 0), shape('b', 300, 0), conn('c1', 'a', 'b'), conn('c2', 'b', 'a'), conn('c3', 'a', 'b'));

  it('spreads parallel connectors symmetrically', () => {
    const p = parallelEdgesPatches(doc, [], 20);
    expect(Object.keys(p)).toEqual(['c1', 'c2', 'c3']);
    expect(p.c1.waypoints?.[0].y).toBe(10);
    expect(p.c2.waypoints).toBeUndefined();
    expect(p.c3.waypoints?.[0].y).toBe(50);
  });

  it('maps draw.io layout JSON and runs it', () => {
    const steps = parseLayoutJson('[{"layout":"mxHierarchicalLayout","config":{"orientation":"west","intraCellSpacing":30}},{"layout":"mxParallelEdgeLayout"}]');
    expect(steps.map((s) => s.id)).toEqual(['flow-horizontal', 'parallel-edges']);
    expect(steps[0].options.nodeSpacing).toBe(30);
    expect(() => parseLayoutJson('[{"layout":"nope"}]')).toThrow(/unknown layout/);
    const { changed } = runLayoutSteps(doc, [], steps);
    expect(changed).toContain('c1');
  });
});

describe('plugins', () => {
  it('explores one hop of neighbours', () => {
    const doc = docOf(shape('a', 0, 0), shape('b', 200, 0), shape('c', 400, 0), conn('ab', 'a', 'b'), conn('bc', 'b', 'c'));
    expect(neighbourhood(doc, 'a').sort()).toEqual(['a', 'ab', 'b']);
  });

  it('anonymizes text but keeps placeholders and structure', () => {
    expect(anonymizeText('Hello World 42, %name%!')).toBe('Xxxxx Xxxxx 00, %name%!');
    const doc = anonymizeDoc(docOf(shape('a', 0, 0, { data: { k: 'Secret' }, tooltip: 'Tip' })));
    expect(doc.elements.a.text).toBe('X');
    expect(doc.elements.a.data).toEqual({ k: 'Xxxxxx' });
    expect(doc.elements.a.tooltip).toBe('Xxx');
  });
});

describe('configuration', () => {
  it('validates keys and types', () => {
    expect(parseConfig('{"defaultVertexStyle":{"fill":"#fff"},"customPresetColors":["#000"],"gridSize":8}').config).toMatchObject({ gridSize: 8 });
    const bad = parseConfig('{"defaultVertexStyle":{"fill":3,"nope":1},"what":1,"gridSize":0}');
    expect(bad.config).toBeNull();
    expect(bad.errors.length).toBe(4);
    expect(parseConfig('{oops').errors[0]).toMatch(/Invalid JSON/);
  });

  it('maps draw.io library names', () => {
    expect(resolveLibraryIds('general;er;uml;nonexistent')).toEqual(['general', 'erd', 'uml']);
  });
});

describe('embed snippets', () => {
  it('builds a viewer URL that decodes back to the diagram', () => {
    const pages = [newPage('P', docOf(shape('a', 0, 0)))];
    const url = viewerUrl(pages, { base: 'https://example.com/app/', toolbar: false });
    expect(url).toMatch(/^https:\/\/example\.com\/app\/\?viewer=1&toolbar=0#R/);
    expect(decodeShareUrl(url)[0].doc.elements.a).toBeTruthy();
    expect(iframeSnippet(url, { width: '100%', height: '400', title: 'A "b"' })).toContain('title="A &quot;b&quot;"');
    expect(imageSnippet('data:x', { alt: 'd', link: 'https://l' })).toMatch(/^<a href="https:\/\/l"/);
    expect(markdownImage('data:x', { alt: 'd' })).toBe('![d](data:x)');
  });
});

describe('print layout', () => {
  it('fits, tiles across N×M sheets, and scales', () => {
    expect(layoutSheets(1000, 500, 190, 277, { mode: 'fit' }).tiles).toHaveLength(1);
    const sheets = layoutSheets(1000, 200, 190, 277, { mode: 'sheets', cols: 3, rows: 1 });
    expect(sheets.tiles).toHaveLength(3);
    expect(sheets.cw).toBeCloseTo(570);
    // 100% of 2000px ≈ 529mm wide → 3 sheets of 190mm.
    expect(layoutSheets(2000, 100, 190, 277, { mode: 'scale', percent: 100 }).tiles).toHaveLength(3);
  });

  it('selects page ranges and skips empty pages', () => {
    const pages = [newPage('1', docOf(shape('a', 0, 0))), newPage('2'), newPage('3', docOf(shape('b', 0, 0)))];
    expect(pagesToPrint(pages, pages[0].id, { from: 2, to: 3 }).map((p) => p.name)).toEqual(['3']);
    expect(pagesToPrint(pages, pages[2].id, 'current').map((p) => p.name)).toEqual(['3']);
  });
});

describe('clipboard XML interop', () => {
  it('extracts plain, escaped and URL-encoded draw.io XML', () => {
    const xml = '<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>';
    expect(extractDrawioXml(`<meta charset="utf-8">${xml}`)).toBe(xml);
    expect(extractDrawioXml(xml.replace(/</g, '&lt;').replace(/>/g, '&gt;'))).toBe(xml);
    expect(extractDrawioXml(encodeURIComponent(xml))).toBe(xml);
    expect(hasDrawioXml('just text')).toBe(false);
  });

  it('copies elements as mxGraphModel that imports back', async () => {
    const els = [shape('a', 0, 0), shape('b', 200, 0), conn('ab', 'a', 'b')];
    const xml = await drawioXmlFor(els);
    expect(xml.startsWith('<mxGraphModel')).toBe(true);
    const back = await elementsFromDrawioXml(xml);
    expect(back.filter((e) => e.type === 'shape')).toHaveLength(2);
    expect(back.filter((e) => e.type === 'connector')).toHaveLength(1);
  });
});

describe('URL parameters', () => {
  it('parses lang, libs, clibs, grid, math and ui', () => {
    const p = parseLaunchParams('https://x.test/?lang=de&libs=general;uml&clibs=Uhttps%3A%2F%2Fa.test%2Fl.xml;Ujavascript%3Aalert(1)&grid=0&math=1&ui=dark');
    expect(p).toMatchObject({ lang: 'de', libs: 'general;uml', clibs: ['https://a.test/l.xml'], grid: false, math: true, ui: 'dark' });
    expect(parseLaunchParams('https://x.test/')).toMatchObject({ grid: null, math: null, clibs: [] });
  });

  it('math=1 turns on typesetting for LaTeX labels only', () => {
    const doc = docOf(shape('a', 0, 0, { text: 'Energy $$E=mc^2$$' }), shape('b', 0, 0, { text: 'plain' }));
    const out = enableMathLabels(doc);
    expect(out.elements.a.style.math).toBe(true);
    expect(out.elements.b.style.math).toBeUndefined();
    expect(enableMathLabels(out)).toBe(out);
  });
});

describe('Mermaid regeneration', () => {
  beforeEach(() => useEditor.getState().loadPages([newPage('P')], { path: null, name: 'x' }));

  it('keeps the source and replaces the group in place', async () => {
    const { importer } = await import('@/io/import/mermaid');
    const res = await importer.run('flowchart TD\n  A --> B');
    const page = res.pages[0];
    const els = withMermaidSource('mermaid', 'flowchart TD\n  A --> B', page.doc.order.map((id) => page.doc.elements[id]));
    expect(els[0].data?.[MERMAID_KEY]).toContain('A --> B');
    useEditor.getState().addElements(els);
    const anchor = els[1].id;
    expect(mermaidGroupOf(useEditor.getState().doc, anchor)?.members).toHaveLength(els.length);
    const before = useEditor.getState().past.length;
    await regenerateMermaid(anchor, 'flowchart TD\n  A --> B --> C');
    const s = useEditor.getState();
    expect(s.past.length).toBe(before + 1);
    const shapes = s.doc.order.map((id) => s.doc.elements[id]).filter((e) => e.type === 'shape');
    expect(shapes.length).toBeGreaterThanOrEqual(3);
    expect(mermaidGroupOf(s.doc, s.doc.order[0])?.source).toContain('--> C');
  });
});
