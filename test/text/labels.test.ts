import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createConnector, createShape, DEFAULT_STYLE } from '@/model/defaults';
import type { Doc, ShapeElement } from '@/model/types';
import { shapeLabelBox, labelPadding } from '@/text/labelLayout';
import { detectRtl, isRtl } from '@/text/direction';
import { fontStack, isGoogleFont } from '@/text/fonts';
import { localizedText, docLangs, editsTranslation } from '@/text/translations';
import { clearedFormatting, clearFormatting } from '@/text/clearFormatting';
import { fontFromDrawio, richLabelFromDrawio } from '@/text/drawioText';
import { webFontsUsed } from '@/text/exportFonts';
import { exportDrawioPages, importDrawioPages } from '@/io/drawio';
import { TextBlock } from '@/shapes/TextLines';
import { useEditor } from '@/store/editor';

const box = (el: ShapeElement) => shapeLabelBox(el)!;

describe('label position & spacing', () => {
  const el = createShape('rectangle', { x: 100, y: 100, w: 120, h: 60 }, {}, 'L');

  it('places corner labels outside the matching corner', () => {
    const tl = box({ ...el, style: { ...el.style, labelPosition: 'top-left' } });
    expect(tl.box.x + tl.box.w).toBeLessThan(el.x);
    expect(tl.box.y).toBeLessThan(el.y);
    expect(tl.style).toMatchObject({ textAlign: 'right', verticalAlign: 'bottom' });
    const br = box({ ...el, style: { ...el.style, labelPosition: 'bottom-right' } });
    expect(br.box.x).toBeGreaterThan(el.x + el.w);
    expect(br.box.y).toBeGreaterThan(el.y + el.h);
    expect(br.style).toMatchObject({ textAlign: 'left', verticalAlign: 'top' });
  });

  it('keeps the original edge positions', () => {
    expect(box({ ...el, style: { ...el.style, labelPosition: 'bottom', spacing: 4 } }).box).toEqual({ x: 40, y: 170, w: 240, h: 0 });
    expect(box({ ...el, style: { ...el.style, labelPosition: 'top' } }).box.y).toBe(94);
  });

  it('adds per-side spacing to the global spacing', () => {
    expect(labelPadding({ spacing: 2, spacingTop: 3, spacingLeft: 10 })).toEqual({ top: 5, right: 2, bottom: 2, left: 12 });
    const inside = box({ ...el, style: { ...el.style, spacingLeft: 20, spacingTop: 10 } });
    const plain = box(el);
    expect(inside.box.x - plain.box.x).toBe(20);
    expect(inside.box.y - plain.box.y).toBe(10);
    expect(plain.box.w - inside.box.w).toBe(20);
  });
});

describe('text direction', () => {
  it('detects RTL from the first strong character', () => {
    expect(detectRtl('שלום world')).toBe(true);
    expect(detectRtl('123 مرحبا')).toBe(true);
    expect(detectRtl('hello שלום')).toBe(false);
    expect(isRtl({ textDirection: 'auto' }, 'مرحبا')).toBe(true);
    expect(isRtl({ textDirection: 'rtl' }, 'abc')).toBe(true);
    expect(isRtl({}, 'مرحبا')).toBe(false);
  });

  it('flips the anchor of RTL plain labels so alignment stays visual', () => {
    const svg = renderToStaticMarkup(createElement(TextBlock, { box: { x: 0, y: 0, w: 100, h: 20 }, text: 'abc', style: { ...DEFAULT_STYLE, textAlign: 'left', textDirection: 'rtl' } }));
    expect(svg).toContain('direction="rtl"');
    expect(svg).toContain('text-anchor="end"');
  });

  it('draws the label border', () => {
    const svg = renderToStaticMarkup(createElement(TextBlock, { box: { x: 0, y: 0, w: 100, h: 20 }, text: 'abc', style: { ...DEFAULT_STYLE, labelBorderColor: '#dc2626' } }));
    expect(svg).toMatch(/<rect[^>]*fill="none"[^>]*stroke="#dc2626"/);
  });
});

describe('fonts', () => {
  it('maps built-in keys, Google and custom fonts to stacks', () => {
    expect(fontStack('mono')).toContain('monospace');
    expect(fontStack('Roboto')).toBe('"Roboto", sans-serif');
    expect(fontStack('Fira Code')).toBe('"Fira Code", monospace');
    expect(fontStack('My Font"; }')).toBe('"My Font", sans-serif');
    expect(isGoogleFont('open sans')).toBe(true);
  });

  it('collects Google Fonts used by labels for export embedding', () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 }, { fontFamily: 'Roboto' }, 'Hi');
    const b = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 }, { richText: true }, 'x <span style="font-family:Lato">yz</span>');
    const used = webFontsUsed([a, b]);
    expect([...used.keys()].sort()).toEqual(['Lato', 'Roboto']);
    expect(used.get('Roboto')).toBe('Hi');
  });

  it('reads mxGraph font names', () => {
    expect(fontFromDrawio('Helvetica')).toBe('sans');
    expect(fontFromDrawio('Courier New')).toBe('mono');
    expect(fontFromDrawio('Architects Daughter')).toBe('hand');
    expect(fontFromDrawio('Roboto')).toBe('Roboto');
  });
});

describe('translations', () => {
  const el = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 }, {}, 'Hello');
  el.data = { label_de: 'Hallo', label_pt: 'Olá', owner: 'x' };

  it('picks the label for the diagram language', () => {
    expect(localizedText(el, undefined)).toBe('Hello');
    expect(localizedText(el, 'de')).toBe('Hallo');
    expect(localizedText(el, 'pt-BR')).toBe('Olá');
    expect(localizedText(el, 'fr')).toBe('Hello');
    expect(docLangs([el])).toEqual(['de', 'pt']);
    expect(editsTranslation(el, 'de')).toBe('label_de');
    expect(editsTranslation(el, 'fr')).toBeNull();
  });
});

describe('clear formatting', () => {
  beforeEach(() => useEditor.getState().newDoc());

  it('resets text style keys and strips inline formatting in one undo step', () => {
    const el = createShape('rectangle', { x: 0, y: 0, w: 100, h: 50 }, { bold: true, fontSize: 30, textColor: '#dc2626', underline: true, labelBorderColor: '#000', richText: true }, '**a** <span style="color:red">b*</span>');
    expect(clearedFormatting(el).text).toBe('a b\\*');
    const s = useEditor.getState();
    s.addElements([el]);
    s.select([el.id]);
    clearFormatting();
    const after = useEditor.getState().doc.elements[el.id];
    expect(after.style).toMatchObject({ bold: false, fontSize: DEFAULT_STYLE.fontSize, textColor: DEFAULT_STYLE.textColor, richText: true });
    expect(after.style.underline).toBeUndefined();
    expect(after.style.labelBorderColor).toBeUndefined();
    useEditor.getState().undo();
    expect(useEditor.getState().doc.elements[el.id].style.bold).toBe(true);
  });
});

describe('mxGraph round-trip of text styles', () => {
  it('exports and re-imports formatted labels, positions, spacing, direction, fonts and translations', async () => {
    const a = createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }, {
      richText: true, labelPosition: 'top-left', spacing: 3, spacingTop: 4, spacingLeft: 7, textDirection: 'rtl', labelBorderColor: '#dc2626',
      labelBackground: '#fef08a', fontFamily: 'Roboto', underline: true,
    }, 'H<sub>2</sub>O is **wet** <span style="color:#2563eb">blue</span>');
    a.data = { label_de: 'Wasser <ist> nass' };
    const b = createShape('rectangle', { x: 300, y: 0, w: 120, h: 60 }, {}, 'plain 2*3');
    const c = createConnector({ elementId: a.id, x: 0, y: 0 }, { elementId: b.id, x: 0, y: 0 }, { text: '<b>x</b>', style: { ...DEFAULT_STYLE, fill: 'none', richText: true } });
    const doc: Doc = { elements: { [a.id]: a, [b.id]: b, [c.id]: c }, order: [a.id, b.id, c.id] };
    const xml = await exportDrawioPages([{ name: 'P', doc }]);
    expect(xml).toContain('labelPosition=left;');
    expect(xml).toContain('verticalLabelPosition=top;');
    expect(xml).toContain('spacingTop=4;');
    expect(xml).toContain('textDirection=rtl;');
    expect(xml).toContain('labelBorderColor=#dc2626;');
    expect(xml).toContain('fontFamily=Roboto;');
    expect(xml).toContain('fontSource=');
    const [page] = await importDrawioPages(xml);
    const ra = page.doc.elements[a.id] as ShapeElement;
    expect(ra.style).toMatchObject({ richText: true, labelPosition: 'top-left', spacing: 3, spacingTop: 4, spacingLeft: 7, textDirection: 'rtl', labelBorderColor: '#dc2626', labelBackground: '#fef08a', fontFamily: 'Roboto', underline: true });
    expect(ra.text).toBe(a.text);
    expect(ra.data?.label_de).toBe('Wasser <ist> nass');
    const rb = page.doc.elements[b.id];
    expect(rb.text).toBe('plain 2*3');
    expect(rb.style.richText).toBeUndefined();
    const rc = page.doc.elements[c.id];
    expect(rc.text).toBe('**x**');
    expect(rc.style.richText).toBe(true);
  });

  it('only marks imported html labels as formatted when they carry formatting', () => {
    expect(richLabelFromDrawio('plain<br>text', true, DEFAULT_STYLE)).toBeNull();
    expect(richLabelFromDrawio('<b>x</b>', true, DEFAULT_STYLE)).toBe('**x**');
    expect(richLabelFromDrawio('a <b>b', false, DEFAULT_STYLE)).toBe('a **b**');
  });
});
