import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { exportVsdx, vsdxArrow, vsdxColor } from '@/io/vsdx/export';
import { importVsdx } from '@/io/import/vsdx';
import { isConnector, isShape } from '@/model/types';
import { samplePages } from './fixtures';

const parse = (xml: string) => {
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  expect(dom.getElementsByTagName('parsererror').length, xml.slice(0, 200)).toBe(0);
  return dom;
};

describe('VSDX export', () => {
  it('writes a complete OPC package with well-formed XML parts', async () => {
    const pages = samplePages(2);
    const zip = unzipSync(await exportVsdx(pages, { title: 'Test <diagram>' }));
    const names = Object.keys(zip);
    expect(names[0]).toBe('[Content_Types].xml');
    for (const part of [
      '_rels/.rels',
      'docProps/core.xml',
      'docProps/app.xml',
      'visio/document.xml',
      'visio/_rels/document.xml.rels',
      'visio/pages/pages.xml',
      'visio/pages/_rels/pages.xml.rels',
      'visio/pages/page1.xml',
      'visio/pages/page2.xml',
    ]) {
      expect(names).toContain(part);
    }
    for (const n of names) if (/\.(xml|rels)$/.test(n)) parse(strFromU8(zip[n]));

    // Every XML part is declared in [Content_Types].xml (or covered by a Default).
    const ct = parse(strFromU8(zip['[Content_Types].xml']));
    const overrides = Array.from(ct.getElementsByTagName('Override')).map((o) => o.getAttribute('PartName'));
    expect(overrides).toEqual(expect.arrayContaining(['/visio/document.xml', '/visio/pages/pages.xml', '/visio/pages/page1.xml', '/visio/pages/page2.xml']));
    expect(Array.from(ct.getElementsByTagName('Override')).find((o) => o.getAttribute('PartName') === '/visio/document.xml')?.getAttribute('ContentType')).toBe(
      'application/vnd.ms-visio.drawing.main+xml',
    );

    // Relationships resolve to existing parts.
    const docRel = parse(strFromU8(zip['_rels/.rels'])).getElementsByTagName('Relationship');
    expect(Array.from(docRel).some((r) => r.getAttribute('Target') === 'visio/document.xml' && /visio\/2010\/relationships\/document$/.test(r.getAttribute('Type')!))).toBe(true);
    const pageRels = Array.from(parse(strFromU8(zip['visio/pages/_rels/pages.xml.rels'])).getElementsByTagName('Relationship'));
    expect(pageRels.map((r) => r.getAttribute('Target'))).toEqual(['page1.xml', 'page2.xml']);

    // Pages carry names, sizes and a Rel to their part.
    const pagesDom = parse(strFromU8(zip['visio/pages/pages.xml']));
    const pageEls = Array.from(pagesDom.getElementsByTagName('Page'));
    expect(pageEls.map((p) => p.getAttribute('Name'))).toEqual(pages.map((p) => p.name));
    const width = Array.from(pageEls[0].getElementsByTagName('Cell')).find((c) => c.getAttribute('N') === 'PageWidth');
    expect(Number(width?.getAttribute('V'))).toBeGreaterThan(1);
    expect(pageEls[0].getElementsByTagName('Rel')[0].getAttribute('r:id')).toBe('rId1');
  });

  it('writes shapes with geometry, rotation, text and glued 1-D connectors', async () => {
    const [page] = samplePages(1);
    const zip = unzipSync(await exportVsdx([page]));
    const dom = parse(strFromU8(zip['visio/pages/page1.xml']));
    const shapes = Array.from(dom.getElementsByTagName('Shape'));
    expect(shapes).toHaveLength(page.doc.order.length);
    // Unique, positive IDs.
    const ids = shapes.map((s) => Number(s.getAttribute('ID')));
    expect(new Set(ids).size).toBe(ids.length);
    const cellOf = (s: Element, n: string) => Array.from(s.children).find((c) => c.tagName === 'Cell' && c.getAttribute('N') === n)?.getAttribute('V');
    // No duplicate cell names in any sheet.
    for (const s of shapes) {
      const ns = Array.from(s.children).filter((c) => c.tagName === 'Cell').map((c) => c.getAttribute('N'));
      expect(new Set(ns).size).toBe(ns.length);
    }
    const [rect, ellipse, diamond, text, conn] = shapes;
    expect(rect.getElementsByTagName('Text')[0].textContent).toBe('Box on page 1');
    expect(cellOf(rect, 'FillForegnd')).toBe('#DBEAFE');
    expect(Number(cellOf(rect, 'Rounding'))).toBeCloseTo(8 / 96, 4);
    expect(ellipse.getElementsByTagName('Text')[0].textContent).toBe('Wörld ✓ <&>');
    expect(Array.from(ellipse.getElementsByTagName('Row')).some((r) => r.getAttribute('T') === 'Ellipse')).toBe(true);
    expect(Number(cellOf(diamond, 'Angle'))).toBeCloseTo((-30 * Math.PI) / 180, 5);
    expect(cellOf(diamond, 'LinePattern')).toBe('2');
    expect(text.getElementsByTagName('Section').length).toBeGreaterThan(0);
    expect(Array.from(text.getElementsByTagName('Section')).some((s) => s.getAttribute('N') === 'Geometry')).toBe(false);
    // 1-D connector.
    for (const n of ['BeginX', 'BeginY', 'EndX', 'EndY']) expect(cellOf(conn, n)).toBeDefined();
    expect(cellOf(conn, 'ObjType')).toBe('2');
    expect(cellOf(conn, 'EndArrow')).not.toBe('0');
    const connects = Array.from(dom.getElementsByTagName('Connect'));
    expect(connects.map((c) => [c.getAttribute('FromSheet'), c.getAttribute('FromCell'), c.getAttribute('ToSheet')])).toEqual([
      [conn.getAttribute('ID'), 'BeginX', rect.getAttribute('ID')],
      [conn.getAttribute('ID'), 'EndX', ellipse.getAttribute('ID')],
    ]);
  });

  it('round-trips through the VSDX importer', async () => {
    const pages = samplePages(2);
    const res = importVsdx(await exportVsdx(pages));
    expect(res.pages.map((p) => p.name)).toEqual(pages.map((p) => p.name));
    const doc = res.pages[0].doc;
    const shapes = Object.values(doc.elements).filter(isShape);
    const conns = Object.values(doc.elements).filter(isConnector);
    expect(shapes.map((s) => s.text).sort()).toEqual(['Box on page 1', 'Decide?', 'Just text', 'Wörld ✓ <&>'].sort());
    expect(conns).toHaveLength(2);
    const rect = shapes.find((s) => s.text === 'Box on page 1')!;
    const ell = shapes.find((s) => s.text.startsWith('Wörld'))!;
    expect(ell.kind).toBe('ellipse');
    expect(rect.w).toBe(120);
    expect(rect.h).toBe(60);
    // Relative layout survives (ellipse 240px right of / 10px above the rectangle).
    expect(ell.x - rect.x).toBe(240);
    expect(ell.y - rect.y).toBe(-10);
    expect(shapes.find((s) => s.text === 'Decide?')!.rotation).toBeCloseTo(30, 1);
    const glued = conns.find((c) => c.source.elementId)!;
    expect(glued.source.elementId).toBe(rect.id);
    expect(glued.target.elementId).toBe(ell.id);
    expect(glued.text).toBe('calls');
  });

  it('maps colors and arrowheads', () => {
    expect(vsdxColor('#abc')).toBe('#AABBCC');
    expect(vsdxColor('rgb(255, 0, 16)')).toBe('#FF0010');
    expect(vsdxColor('none')).toBeNull();
    expect(vsdxArrow('none')).toBe(0);
    expect(vsdxArrow('triangle')).toBeGreaterThan(0);
  });
});
