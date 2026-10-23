import { describe, expect, it } from 'vitest';
import { deflateSync, zlibSync } from 'fflate';
import { importEmbedded, importer } from '@/io/import/embedded';
import {
  base64Encode, crc32, embedDiagramInPng, embedDiagramInSvg, latin1Encode, makePngChunk, readPngChunks, readPngText, utf8Encode,
} from '@/io/import/_shared';
import { serializeDoc } from '@/io/fileFormat';
import { createConnector, createShape } from '@/model/defaults';
import { isConnector, isShape, type Doc } from '@/model/types';

/** A valid 1×1 RGBA PNG. */
function tinyPng(extra: Uint8Array[] = []): Uint8Array {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, 1);
  v.setUint32(4, 1);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlibSync(new Uint8Array([0, 255, 0, 0, 255]));
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), makePngChunk('IHDR', ihdr), ...extra, makePngChunk('IDAT', idat), makePngChunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const model = (label: string) =>
  `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>` +
  `<mxCell id="a" value="${label}" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="10" y="10" width="120" height="60" as="geometry"/></mxCell>` +
  `<mxCell id="b" value="B" style="ellipse;" vertex="1" parent="1"><mxGeometry x="200" y="10" width="80" height="80" as="geometry"/></mxCell>` +
  `<mxCell id="e" edge="1" parent="1" source="a" target="b" style=""><mxGeometry relative="1" as="geometry"/></mxCell>` +
  `</root></mxGraphModel>`;
const mxfile = (...pages: string[]) => `<mxfile host="test">${pages.map((p, i) => `<diagram id="d${i}" name="P${i + 1}">${model(p)}</diagram>`).join('')}</mxfile>`;

const sampleDoc = (): Doc => {
  const a = createShape('rectangle', { x: 0, y: 0, w: 100, h: 50 }, {}, 'Hello');
  const b = createShape('ellipse', { x: 200, y: 0, w: 80, h: 80 }, {}, 'Wörld ✓');
  const c = createConnector({ elementId: a.id, side: 'auto', x: 100, y: 25 }, { elementId: b.id, side: 'auto', x: 200, y: 40 });
  return { elements: { [a.id]: a, [b.id]: b, [c.id]: c }, order: [a.id, b.id, c.id] };
};

describe('CRC32 and PNG chunks', () => {
  it('matches the standard check values', () => {
    expect(crc32(latin1Encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(latin1Encode('IEND'))).toBe(0xae426082);
  });

  it('writes chunks with valid CRCs', () => {
    const png = embedDiagramInPng(tinyPng(), '{"x":1}');
    for (const c of readPngChunks(png)) {
      const crc = new DataView(png.buffer, png.byteOffset).getUint32(c.offset + 8 + c.data.length);
      expect(crc).toBe(crc32(png, c.offset + 4, c.offset + 8 + c.data.length));
    }
    expect(readPngChunks(png).map((c) => c.type)).toEqual(['IHDR', 'iTXt', 'IDAT', 'IEND']);
    // Re-embedding replaces instead of duplicating.
    const again = embedDiagramInPng(png, '{"x":2}');
    expect(readPngText(again).filter((t) => t.keyword === 'opendraw').map((t) => t.text)).toEqual(['{"x":2}']);
  });
});

describe('editable images', () => {
  it('round-trips an OpenDraw document through PNG', async () => {
    const doc = sampleDoc();
    const png = embedDiagramInPng(tinyPng(), serializeDoc(doc));
    expect(importer.detect!(png, 'x.png')).toBe(true);
    const res = await importEmbedded(png, 'diagram.png');
    const d = res.pages[0].doc;
    expect(res.pages[0].name).toBe('diagram');
    expect(d.order).toEqual(doc.order);
    expect(Object.values(d.elements).filter(isShape).map((s) => s.text)).toEqual(['Hello', 'Wörld ✓']);
    expect(Object.values(d.elements).filter(isConnector)[0].target.elementId).toBe(doc.order[1]);
  });

  it('round-trips an OpenDraw document through SVG', async () => {
    const doc = sampleDoc();
    const svg = embedDiagramInSvg('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>', serializeDoc(doc));
    expect(svg).toMatch(/^<svg [^>]*data-opendraw="[A-Za-z0-9+/=]+">/);
    const twice = embedDiagramInSvg(svg, serializeDoc(doc));
    expect(twice.match(/data-opendraw/g)).toHaveLength(1);
    const res = await importEmbedded(twice, 'd.svg');
    expect(Object.values(res.pages[0].doc.elements).filter(isShape).map((s) => s.text)).toEqual(['Hello', 'Wörld ✓']);
  });

  it('reads draw.io PNGs (tEXt mxfile, URI-encoded)', async () => {
    const text = makePngChunk('tEXt', latin1Encode('mxfile\0' + encodeURIComponent(mxfile('Alpha'))));
    const res = await importEmbedded(tinyPng([text]), 'x.drawio.png');
    const d = res.pages[0].doc;
    const s = Object.values(d.elements).filter(isShape);
    expect(s.map((x) => x.text).sort()).toEqual(['Alpha', 'B']);
    expect(Object.values(d.elements).filter(isConnector)).toHaveLength(1);
  });

  it('reads draw.io PNGs with zTXt chunks', async () => {
    const body = zlibSync(latin1Encode(encodeURIComponent(mxfile('Zed'))));
    const data = new Uint8Array([...latin1Encode('mxfile'), 0, 0, ...body]);
    const res = await importEmbedded(tinyPng([makePngChunk('zTXt', data)]));
    expect(Object.values(res.pages[0].doc.elements).filter(isShape).some((s) => s.text === 'Zed')).toBe(true);
  });

  it('reads draw.io SVGs with plain and compressed content, one page per diagram', async () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" content="${esc(mxfile('One', 'Two'))}"><g/></svg>`;
    expect(importer.detect!(svg, 'a.svg')).toBe(true);
    const res = await importEmbedded(svg, 'a.svg');
    expect(res.pages.map((p) => p.name)).toEqual(['P1', 'P2']);
    expect(Object.values(res.pages[1].doc.elements).filter(isShape).some((s) => s.text === 'Two')).toBe(true);

    const packed = base64Encode(deflateSync(latin1Encode(encodeURIComponent(mxfile('Packed')))));
    const res2 = await importEmbedded(utf8Encode(`<svg xmlns="http://www.w3.org/2000/svg" content="${packed}"/>`), 'b.svg');
    expect(Object.values(res2.pages[0].doc.elements).filter(isShape).some((s) => s.text === 'Packed')).toBe(true);
  });

  it('reads draw.io PDFs that carry the XML in a string', async () => {
    const pdf = latin1Encode(`%PDF-1.7\n1 0 obj\n<< /Subject (${encodeURIComponent(mxfile('Pdf'))}) >>\nendobj\n%%EOF`);
    const res = await importEmbedded(pdf, 'x.pdf');
    expect(Object.values(res.pages[0].doc.elements).filter(isShape).some((s) => s.text === 'Pdf')).toBe(true);
  });

  it('rejects plain images', async () => {
    expect(importer.detect!(tinyPng(), 'x.png')).toBe(false);
    await expect(importEmbedded(tinyPng(), 'x.png')).rejects.toThrow(/does not contain/);
  });
});
