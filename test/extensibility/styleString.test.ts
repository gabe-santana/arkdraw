/**
 * Edit Style in draw.io style-string form: emitting reuses the exporter,
 * applying diffs the parsed strings, unknown keys are preserved.
 */
import { describe, expect, it } from 'vitest';
import { createConnector, createShape } from '@/model/defaults';
import type { ConnectorElement, DiagramElement, ShapeElement } from '@/model/types';
import { applyDrawioStylePatch, diffDrawioStyle, formatDrawioStyle } from '@/extensibility/styleString';
import { EXTRA_STYLE_KEY, parseStylePairs } from '@/extensibility/styleExtras';
import { drawioStyleOf, exportDrawio } from '@/io/drawio';

const apply = <T extends DiagramElement>(el: T, text: string): T => ({ ...el, ...applyDrawioStylePatch(el, diffDrawioStyle(el, text), el.type) }) as T;
const pairs = (s: string) => Object.fromEntries(parseStylePairs(s.replace(/\n/g, ';')));

describe('draw.io style strings for the selection', () => {
  it('emits the same style the .drawio exporter writes, one key per line', () => {
    const el = createShape('ellipse', { x: 0, y: 0, w: 80, h: 40 }, { fill: '#dae8fc', stroke: '#6c8ebf', strokeStyle: 'dashed' });
    const text = formatDrawioStyle(el);
    expect(text.split('\n').every((l) => l.endsWith(';'))).toBe(true);
    expect(pairs(text)).toEqual(pairs(drawioStyleOf(el)));
    expect(pairs(text)).toMatchObject({ ellipse: '', fillColor: '#dae8fc', strokeColor: '#6c8ebf', dashed: '1' });
  });

  it('round-trips an unedited string without changing anything', () => {
    const el = createShape('rectangle', { x: 5, y: 5, w: 100, h: 50 }, { fill: '#fff2cc', radius: 8, shadow: true, underline: true });
    const patch = diffDrawioStyle(el, formatDrawioStyle(el));
    expect(patch.style).toEqual({});
    expect(patch.removeStyle).toEqual([]);
    expect(patch.fields).toEqual({});
    expect(patch.extras).toBe('');
    // OpenDraw-only keys (underline here) survive.
    expect(apply(el, formatDrawioStyle(el)).style).toEqual(el.style);
  });

  it('maps edited known keys back to OpenDraw fields', () => {
    const el = createShape('rectangle', { x: 0, y: 0, w: 100, h: 50 }, { fill: '#ffffff' });
    const text = formatDrawioStyle(el).replace('fillColor=#ffffff', 'fillColor=#f8cecc') + '\nrotation=30;\nshadow=1;\nfontStyle=3;';
    const out = apply(el, text);
    expect(out.style).toMatchObject({ fill: '#f8cecc', shadow: true, bold: true, italic: true });
    expect(out.rotation).toBe(30);
    expect(out.kind).toBe('rectangle');
  });

  it('changes the shape kind when the shape key changes', () => {
    const el = createShape('rectangle', { x: 0, y: 0, w: 100, h: 50 });
    expect(apply(el, formatDrawioStyle(el) + '\nshape=hexagon;').kind).toBe('hexagon');
  });

  it('keeps unknown keys in element data and re-exports them', async () => {
    const el = createShape('rectangle', { x: 0, y: 0, w: 100, h: 50 });
    const out = apply(el, formatDrawioStyle(el) + '\nmyPlugin=42;\nfooBar=x;');
    expect(out.data?.[EXTRA_STYLE_KEY]).toBe('myPlugin=42;fooBar=x;');
    // Shown again in the editor, and kept on a second edit.
    const again = formatDrawioStyle(out);
    expect(pairs(again)).toMatchObject({ myPlugin: '42', fooBar: 'x' });
    expect(apply(out, again).data?.[EXTRA_STYLE_KEY]).toBe('myPlugin=42;fooBar=x;');
    // Removing the key drops it.
    expect(apply(out, again.replace('myPlugin=42;', '').replace('fooBar=x;', '')).data).toBeUndefined();
    // Export writes them into the cell style, not as a UserObject attribute.
    const xml = await exportDrawio({ elements: { [out.id]: out }, order: [out.id] });
    expect(xml).toContain('myPlugin=42');
    expect(xml).not.toContain(EXTRA_STYLE_KEY);
  });

  it('edits connector routing and arrows', () => {
    const c = createConnector({ x: 0, y: 0 }, { x: 100, y: 0 }, { routing: 'orthogonal', endArrow: 'triangle' });
    const text = formatDrawioStyle(c).replace('endArrow=block', 'endArrow=diamond') + '\nedgeStyle=elbowEdgeStyle;\nelbow=vertical;';
    const out = apply(c, text) as ConnectorElement;
    expect(out.endArrow).toBe('diamond');
    expect(out.routing).toBe('elbow-v');
  });

  it('applies only to elements of the same type for non-style fields', () => {
    const shape = createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 });
    const conn = createConnector({ x: 0, y: 0 }, { x: 10, y: 0 });
    const patch = diffDrawioStyle(shape, formatDrawioStyle(shape) + '\nshape=hexagon;\nstrokeColor=#123456;');
    const forConn = applyDrawioStylePatch(conn, patch, 'shape') as Partial<ShapeElement>;
    expect(forConn.kind).toBeUndefined();
    expect(forConn.style?.stroke).toBe('#123456');
  });
});
