import { zlibSync } from 'fflate';
import { makePngChunk } from '@/io/import/_shared';
import { createConnector, createShape } from '@/model/defaults';
import type { Doc, Page } from '@/model/types';

/** A small diagram: rectangle → ellipse, a diamond (rotated), a text label, a connector. */
export function sampleDoc(label = 'Hello'): Doc {
  const a = createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }, { fill: '#dbeafe', stroke: '#1d4ed8', radius: 8, bold: true }, label);
  const b = createShape('ellipse', { x: 240, y: -10, w: 80, h: 80 }, { fill: '#fef3c7' }, 'Wörld ✓ <&>');
  const d = createShape('diamond', { x: 100, y: 160, w: 100, h: 80 }, { strokeStyle: 'dashed' }, 'Decide?');
  d.rotation = 30;
  const t = createShape('text', { x: 260, y: 160, w: 120, h: 30 }, {}, 'Just text');
  const c = createConnector({ elementId: a.id, side: 'auto', x: 120, y: 30 }, { elementId: b.id, side: 'auto', x: 240, y: 30 }, { text: 'calls' });
  const free = createConnector({ x: 0, y: 260 }, { x: 200, y: 300 }, { routing: 'straight' });
  const els = [a, b, d, t, c, free];
  return { elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) };
}

export function samplePages(n = 3): Page[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `page-${i + 1}`,
    name: `Page ${i + 1} — ${['Overview', 'Details', 'Notes'][i % 3]}`,
    doc: sampleDoc(`Box on page ${i + 1}`),
    settings: { background: null, paper: 'A4', landscape: false, pageView: false },
  }));
}

/** A valid 1×1 RGBA PNG. */
export function tinyPng(): Uint8Array {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, 1);
  v.setUint32(4, 1);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlibSync(new Uint8Array([0, 255, 0, 0, 255]));
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), makePngChunk('IHDR', ihdr), makePngChunk('IDAT', idat), makePngChunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Element texts in z-order (for comparing docs). */
export const texts = (doc: Doc) => doc.order.map((id) => doc.elements[id].text);
