import { beforeEach, describe, expect, it } from 'vitest';
import type { ConnectorElement, Doc, ElementStyle, PageSettings, ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { PAPER_SIZES, paperSize } from '@/canvas/paper';
import { exportDrawioPages, importDrawioPages, parseStyle } from '@/io/drawio';
import { newPage, useEditor } from '@/store/editor';
import { effectiveSettings, pageGridPatch } from '@/styling/pageGrid';
import { axisMetrics, dragTo, scrollMetrics } from '@/styling/scrollbarMath';
import { adaptFilter, darkStyle, parseHex, preAdapt } from '@/styling/darkColors';
import { customShadowId, hasCustomShadow, shadowFilterUrl, shadowParams } from '@/styling/shadow';
import { renderSvg } from '@/io/export/svg';
import { splitLightDark, styleExtrasFromDrawio, styleExtrasToDrawio } from '@/styling/drawioStyle';
import { STYLE_PRESETS, matchesPreset, presetPatches } from '@/styling/presets';
import { DIAGRAM_THEMES, themePatches } from '@/styling/themes';
import { applyTheme, isDiagramSketch, isImageUrl, sketchPatches, toggleDiagramSketch } from '@/styling/commands';

const docOf = (...els: Array<ShapeElement | ConnectorElement>): Doc => ({
  elements: Object.fromEntries(els.map((e) => [e.id, e])),
  order: els.map((e) => e.id),
});
const rect = (fill: string, stroke = '#111111') => createShape('rectangle', { x: 0, y: 0, w: 100, h: 60 }, { fill, stroke });

describe('paper sizes', () => {
  it('covers the mxGraph list', () => {
    for (const k of ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B4', 'B5', 'Letter', 'Legal', 'Tabloid', 'Ledger', 'Executive']) expect(PAPER_SIZES).toHaveProperty(k);
  });
  it('treats Ledger as naturally landscape', () => {
    const base: PageSettings = { background: null, paper: 'Ledger', landscape: false, pageView: true };
    const s = paperSize(base);
    expect(s.w).toBeGreaterThan(s.h);
    const t = paperSize({ ...base, paper: 'Tabloid' });
    expect(t.h).toBeGreaterThan(t.w);
    expect(paperSize({ ...base, paper: 'A0' })).toEqual({ w: 3179, h: 4494 });
  });
});

describe('per-page grid settings', () => {
  beforeEach(() => {
    localStorage.clear();
    useEditor.getState().newDoc();
  });

  it('picks only grid keys from a settings patch', () => {
    expect(pageGridPatch({ guides: false })).toBeNull();
    expect(pageGridPatch({ gridSize: 20, guides: false })).toEqual({ gridSize: 20 });
    const g = { grid: true, snap: false, guides: true, gridSize: 10, adaptColors: true, connectionPoints: true };
    expect(pageGridPatch({ gridSize: 20 }, g)).toEqual({ grid: true, snap: false, gridSize: 20 });
  });

  it('overlays page values on the global settings', () => {
    const g = { grid: true, snap: true, guides: true, gridSize: 10, adaptColors: true, connectionPoints: true };
    expect(effectiveSettings(g, { background: null, paper: 'A4', landscape: false, pageView: false, gridSize: 25, grid: false }).gridSize).toBe(25);
    expect(effectiveSettings(g, undefined)).toBe(g);
  });

  it('stores grid changes on the page and restores them when switching pages', () => {
    const s = useEditor.getState;
    const p1 = s().activePageId;
    s().updateSettings({ gridSize: 24, gridColor: '#ff0000' });
    expect(s().pages.find((p) => p.id === p1)!.settings.gridSize).toBe(24);
    s().addPage(); // inherits the global default (last choice)
    const p2 = s().activePageId;
    s().updateSettings({ gridSize: 8, grid: false });
    expect(s().settings.gridSize).toBe(8);
    s().switchPage(p1);
    expect(s().settings.gridSize).toBe(24);
    expect(s().settings.grid).toBe(true);
    expect(s().settings.gridColor).toBe('#ff0000');
    s().switchPage(p2);
    expect(s().settings.gridSize).toBe(8);
    expect(s().settings.grid).toBe(false);
  });

  it('applies the first page grid when loading pages', () => {
    const page = newPage('P');
    page.settings = { ...page.settings, gridSize: 40, snap: false };
    useEditor.getState().loadPages([page], { path: null, name: 'x' });
    expect(useEditor.getState().settings.gridSize).toBe(40);
    expect(useEditor.getState().settings.snap).toBe(false);
  });
});

describe('scrollbars', () => {
  it('puts the thumb inside the track and proportional to the view', () => {
    const m = axisMetrics(0, 1000, 0, 500, 400);
    expect(m.scrollable).toBe(true);
    expect(m.thumbStart).toBeGreaterThanOrEqual(0);
    expect(m.thumbStart + m.thumbSize).toBeLessThanOrEqual(400);
    expect(m.thumbSize).toBeLessThan(400);
  });
  it('drags the view by the scrolled fraction and clamps at the ends', () => {
    const m = axisMetrics(0, 1000, 0, 500, 400);
    expect(dragTo(m, 400, 1e6)).toBeCloseTo(m.max - m.viewSize);
    expect(dragTo(m, 400, -1e6)).toBeCloseTo(m.min);
    const half = dragTo(m, 400, (400 - m.thumbSize) / 2);
    expect(half).toBeCloseTo(m.viewMin + (m.max - m.min - m.viewSize) / 2);
  });
  it('maps the camera into world view ranges', () => {
    const r = scrollMetrics({ x: 0, y: 0, w: 2000, h: 100 }, { x: 0, y: 0, z: 1 }, { w: 800, h: 600 }, { w: 700, h: 500 });
    expect(r.x.viewMin).toBeCloseTo(0);
    expect(r.x.scrollable).toBe(true);
  });
});

describe('dark colors', () => {
  it('pre-compensates for the adapt filter (within its gamut)', () => {
    // Vivid dark colors fall outside what invert(0.92)+saturate can show; muted ones are exact.
    for (const c of ['#334155', '#1e293b', '#cbd5e1', '#64748b', '#475569']) {
      const shown = parseHex(adaptFilter(preAdapt(c)))!;
      const want = parseHex(c)!;
      for (let i = 0; i < 3; i++) expect(Math.abs(shown[i] - want[i])).toBeLessThan(0.03);
    }
  });
  it('swaps only the colors that have a dark override', () => {
    const el = rect('#ffffff');
    el.style.darkFill = '#1e293b';
    const s = darkStyle(el.style);
    expect(s.fill).toBe(preAdapt('#1e293b'));
    expect(s.stroke).toBe(el.style.stroke);
    expect(darkStyle(rect('#fff').style)).toEqual(rect('#fff').style);
  });
});

describe('shadow options', () => {
  it('uses a per-element filter only when customised', () => {
    const el = rect('#fff');
    expect(hasCustomShadow(el.style)).toBe(false);
    expect(shadowFilterUrl(el.id, el.style, 'od-shadow')).toBe('url(#od-shadow)');
    el.style.shadowBlur = 12;
    expect(shadowFilterUrl(el.id, el.style, 'od-shadow')).toContain('od-sh-');
    expect(shadowParams(el.style).blur).toBe(12);
  });
});

describe('connector shadows', () => {
  const line = (style: Partial<ElementStyle> = {}) => {
    const c = createConnector({ x: 0, y: 0 }, { x: 200, y: 0 });
    Object.assign(c.style, style);
    return c;
  };
  const exported = (c: ConnectorElement) => renderSvg(docOf(c), { background: null, embedFont: false }).svg;
  const filterTag = (svg: string, id: string) => svg.match(new RegExp(`<filter id="${id}"[^>]*>`))?.[0] ?? '';
  const attr = (tag: string, name: string) => Number(tag.match(new RegExp(` ${name}="([^"]+)"`))?.[1]);

  it('renders the drop shadow on the connector body', () => {
    const c = line({ shadow: true });
    const svg = exported(c);
    expect(svg).toContain(`filter="url(#${customShadowId(c.id)})"`);
    // A horizontal line has a zero-height bounding box, so the filter region must be in user space.
    const tag = filterTag(svg, customShadowId(c.id));
    expect(tag).toContain('filterUnits="userSpaceOnUse"');
    expect(attr(tag, 'x')).toBeLessThan(0);
    expect(attr(tag, 'y')).toBeLessThan(0);
    expect(attr(tag, 'x') + attr(tag, 'width')).toBeGreaterThan(200);
    expect(attr(tag, 'y') + attr(tag, 'height')).toBeGreaterThan(0);
  });

  it('uses the shadow options', () => {
    const c = line({ shadow: true, shadowColor: '#ff0000', shadowBlur: 9, shadowOffsetX: 3, shadowOffsetY: 6, shadowOpacity: 0.5 });
    const svg = exported(c);
    expect(svg).toMatch(/<feDropShadow dx="3" dy="6" stdDeviation="9" flood-color="#ff0000" flood-opacity="0.5"/);
  });

  it('leaves connectors without a shadow alone', () => {
    expect(exported(line())).not.toContain('od-sh-');
  });
});

describe('mxGraph round-trip', () => {
  it('parses light-dark() colors', () => {
    expect(splitLightDark('light-dark(#ffffff,#121212)')).toEqual(['#ffffff', '#121212']);
    expect(splitLightDark('#abc')).toEqual(['#abc', undefined]);
  });

  it('writes and reads shadow, dark color and sketch keys', () => {
    const el = rect('#dae8fc', '#6c8ebf');
    Object.assign(el.style, {
      shadow: true, shadowColor: '#ff0000', shadowBlur: 6, shadowOffsetX: 3, shadowOffsetY: 5, shadowOpacity: 0.4,
      darkFill: '#102030', darkText: '#eeeeee', sketch: true, sketchFill: 'zigzag', sketchRoughness: 2.5,
    });
    const m = new Map<string, string>([['fillColor', '#dae8fc'], ['strokeColor', '#6c8ebf'], ['fontColor', '#0f172a'], ['shadow', '1']]);
    styleExtrasToDrawio(m, el.style, false);
    expect(m.get('fillColor')).toBe('light-dark(#dae8fc,#102030)');
    expect(m.get('shadowOpacity')).toBe('40');
    expect(m.get('fillStyle')).toBe('zigzag');
    const back = styleExtrasFromDrawio(parseStyle([...m].map(([k, v]) => `${k}=${v}`).join(';')), false);
    expect(back).toMatchObject({ fill: '#dae8fc', darkFill: '#102030', darkText: '#eeeeee', shadowColor: '#ff0000', shadowBlur: 6, shadowOffsetX: 3, shadowOffsetY: 5, shadowOpacity: 0.4, sketch: true, sketchFill: 'zigzag', sketchRoughness: 2.5 });
  });

  it('survives a full export/import', async () => {
    const a = rect('#d5e8d4', '#82b366');
    Object.assign(a.style, { shadow: true, shadowBlur: 9, darkStroke: '#a0a0a0' });
    const [page] = await importDrawioPages(await exportDrawioPages([{ name: 'P', doc: docOf(a) }]));
    const b = page.doc.elements[a.id];
    expect(b.style.shadowBlur).toBe(9);
    expect(b.style.darkStroke).toBe('#a0a0a0');
    expect(b.style.stroke).toBe('#82b366');
  });
});

describe('presets and themes', () => {
  it('applies a preset (connectors keep their label color on dark presets)', () => {
    const s = rect('#fff');
    const c = createConnector({ x: 0, y: 0 }, { x: 10, y: 0 });
    const ink = STYLE_PRESETS.find((p) => p.id === 'ink')!;
    const out = presetPatches([s, c], ink);
    expect(out[s.id].style).toMatchObject({ fill: ink.fill, stroke: ink.stroke, textColor: '#ffffff' });
    expect(out[c.id].style!.textColor).toBe(c.style.textColor);
    expect(matchesPreset({ ...s, style: out[s.id].style! }, ink)).toBe(true);
  });

  it('recolors by role: equal fills stay equal, connectors take the line color', () => {
    const a = rect('#ff0000');
    const b = rect('#ff0000');
    const c = rect('#00ff00');
    const img = createShape('image', { x: 0, y: 0, w: 10, h: 10 });
    const line = createConnector({ x: 0, y: 0 }, { x: 10, y: 0 });
    const theme = DIAGRAM_THEMES.find((t) => t.id === 'ocean')!;
    const p = themePatches(docOf(a, b, c, img, line), theme);
    expect(p[a.id].style.fill).toBe(theme.fills[0]);
    expect(p[b.id].style.fill).toBe(theme.fills[0]);
    expect(p[c.id].style.fill).toBe(theme.fills[1]);
    expect(p[img.id]).toBeUndefined();
    expect(p[line.id].style.stroke).toBe(theme.line);
  });

  it('applies a theme and a diagram-wide sketch as single undo steps', () => {
    const s = useEditor.getState;
    s().newDoc();
    s().addElements([rect('#ff0000'), createConnector({ x: 0, y: 0 }, { x: 10, y: 0 })]);
    const before = s().doc;
    applyTheme('forest');
    expect(s().doc).not.toBe(before);
    s().undo();
    expect(s().doc).toBe(before);
    expect(isDiagramSketch()).toBe(false);
    toggleDiagramSketch();
    expect(isDiagramSketch()).toBe(true);
    expect(s().doc.order.every((id) => s().doc.elements[id].style.fontFamily === 'hand')).toBe(true);
    s().undo();
    expect(s().doc).toBe(before);
    expect(Object.keys(sketchPatches([rect('#fff')], false))).toHaveLength(0);
  });

  it('accepts only image URLs for the background', () => {
    expect(isImageUrl('https://x.test/a.png')).toBe(true);
    expect(isImageUrl('data:image/png;base64,AAA')).toBe(true);
    expect(isImageUrl('javascript:alert(1)')).toBe(false);
  });
});
