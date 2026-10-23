import { describe, expect, it } from 'vitest';
import type { ConnectorElement, DiagramElement, ShapeElement } from '@/model/types';
import { convertSvg, evenOddToNonzero, looksLikeSvg, parsePathData, parseTransform, segBounds, svgToElements, apply, parseColor, parseCss } from '@/io/import/svgShapes';
import { parseStencil } from '@/stencils/parse';
import { renderStencil } from '@/stencils/render';
import { DEFAULT_STYLE } from '@/model/defaults';

const shapes = (els: DiagramElement[]) => els.filter((e): e is ShapeElement => e.type === 'shape');
const conns = (els: DiagramElement[]) => els.filter((e): e is ConnectorElement => e.type === 'connector');
const close = (a: number, b: number, eps = 0.05) => expect(Math.abs(a - b)).toBeLessThanOrEqual(eps);

/** A Feather-style stroke icon: 24×24 viewBox shown at 48×48. */
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" color="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="8" x2="12" y2="12"/>
  <polyline points="8 16 12 18 16 16"/>
  <path d="M7 7h10"/>
</svg>`;

const TRANSFORMS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <g transform="translate(100,50)">
    <g transform="scale(2)">
      <rect id="box" x="10" y="10" width="20" height="10" rx="2" fill="#ff0000" stroke="#000" stroke-width="1"/>
    </g>
  </g>
  <rect x="40" y="40" width="20" height="20" transform="rotate(45 50 50)" fill="green"/>
  <rect x="0" y="0" width="10" height="10" transform="matrix(1 0 0.5 1 200 200)" fill="#123456"/>
  <ellipse cx="0" cy="0" rx="20" ry="10" transform="translate(300 100) scale(1.5)" fill="rgb(255, 128, 0)" fill-opacity="0.5"/>
</svg>`;

const CURVES = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <path d="M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z" fill="#ccc"/>
  <path d="M0 0 C 0 100 100 100 100 0" fill="none" stroke="#111" stroke-dasharray="4 2"/>
  <path d="M10 150 Q 30 120 50 150 T 90 150" fill="none" stroke="blue"/>
  <path d="m110 110 l20 0 0 20 -20 0z" fill="#abc"/>
</svg>`;

const TEXT = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
  <text x="150" y="40" font-size="20" font-family="Georgia, serif" fill="#333333" text-anchor="middle" font-weight="bold">Hello<tspan x="150" dy="24">World</tspan></text>
  <g transform="translate(10 100) scale(2)"><text y="10" style="font-size:8px;fill:#e11d48;font-style:italic">Scaled</text></g>
  <text x="20" y="180" font-family="Courier New">mono</text>
</svg>`;

/** Roughly what Illustrator exports for a logo. */
const LOGO = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 27.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 200 100" style="enable-background:new 0 0 200 100;" xml:space="preserve">
<style type="text/css">
	.st0{fill:#E30613;}
	.st1{fill:none;stroke:#1D1D1B;stroke-width:2;stroke-miterlimit:10;}
	.st2{fill:url(#SVGID_1_);}
	#ring{fill-rule:evenodd;}
</style>
<defs>
  <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" style="stop-color:#FFDD00"/>
    <stop offset="1" style="stop-color:#FF0000"/>
  </linearGradient>
  <clipPath id="c"><rect width="10" height="10"/></clipPath>
</defs>
<g opacity="0.8">
  <path class="st0" d="M10,10h40v40H10V10z"/>
  <path id="ring" class="st0" d="M60 10h40v40H60z M70 20v20h20V20z"/>
</g>
<path class="st1" d="M110,30c0-11,9-20,20-20s20,9,20,20" clip-path="url(#c)"/>
<rect x="160" y="10" width="30" height="30" class="st2"/>
<image x="10" y="60" width="20" height="20" xlink:href="data:image/png;base64,iVBORw0KGgo="/>
<use xlink:href="#ring" x="0" y="45"/>
</svg>`;

describe('svgShapes primitives', () => {
  it('parses transform lists left to right', () => {
    const m = parseTransform('translate(10,20) scale(2)');
    expect(apply(m, { x: 1, y: 1 })).toEqual({ x: 12, y: 22 });
    const r = parseTransform('rotate(90 10 10)');
    const p = apply(r, { x: 20, y: 10 });
    close(p.x, 10);
    close(p.y, 20);
  });

  it('parses path data incl. compact arc flags and implicit commands', () => {
    const segs = parsePathData('M0 0L10 0 10 10a5 5 0 0110 0z');
    expect(segs[0]).toEqual({ t: 'M', p: { x: 0, y: 0 } });
    expect(segs.filter((s) => s.t === 'L')).toHaveLength(2);
    expect(segs.filter((s) => s.t === 'C').length).toBeGreaterThanOrEqual(2);
    expect(segs[segs.length - 1]).toEqual({ t: 'Z' });
    // A half circle above y=10 (sweep=1 from (10,10) to (20,10)) reaches y=5.
    close(segBounds(parsePathData('M10 10a5 5 0 0110 0')).y, 5, 0.01);
  });

  it('stops at bad path data but keeps what parsed', () => {
    expect(parsePathData('M0 0 L10 10 L oops')).toHaveLength(2);
    expect(parsePathData('M5 5')).toEqual([]);
  });

  it('computes tight cubic bounds', () => {
    const b = segBounds(parsePathData('M0 0 C 0 100 100 100 100 0'));
    close(b.h, 75);
    close(b.w, 100);
  });

  it('normalises colours', () => {
    expect(parseColor('#abc')).toEqual({ color: '#aabbcc', alpha: 1 });
    expect(parseColor('rgba(255,0,0,0.5)')).toEqual({ color: '#ff0000', alpha: 0.5 });
    expect(parseColor('Navy')).toEqual({ color: '#000080', alpha: 1 });
    expect(parseColor('none')).toBeNull();
  });

  it('parses simple CSS rules and skips complex selectors', () => {
    const rules = parseCss('/* c */ .a{fill:red} rect.b, #c { stroke : blue !important } g > path{fill:x} @media print{.a{fill:green}}');
    expect(rules.map((r) => r.decls)).toEqual([{ fill: 'red' }, { stroke: 'blue' }, { stroke: 'blue' }]);
    expect(rules[2].ids).toEqual(['c']);
  });

  it('rewrites even-odd holes for nonzero filling', () => {
    // Both contours clockwise: nonzero would fill the hole.
    const segs = parsePathData('M0 0H100V100H0Z M25 25H75V75H25Z');
    const out = evenOddToNonzero(segs);
    const area = (from: number) => {
      const pts = out.slice(from, from + 4).map((s) => (s as { p: { x: number; y: number } }).p);
      let a = 0;
      for (let i = 0; i < pts.length; i++) a += pts[i].x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * pts[i].y;
      return Math.sign(a);
    };
    expect(area(0)).not.toBe(area(5));
  });

  it('detects SVG markup', () => {
    expect(looksLikeSvg('<?xml version="1.0"?>\n<!-- x -->\n<svg viewBox="0 0 1 1"></svg>')).toBe(true);
    expect(looksLikeSvg('<div>no</div>')).toBe(false);
  });
});

describe('svgToElements', () => {
  it('converts a stroke icon, scaling the viewBox and resolving currentColor', () => {
    const { elements, width, height } = convertSvg(ICON);
    expect([width, height]).toEqual([48, 48]);
    const [circle] = shapes(elements);
    expect(circle.kind).toBe('ellipse');
    expect([circle.x, circle.y, circle.w, circle.h]).toEqual([4, 4, 40, 40]);
    expect(circle.style.fill).toBe('none');
    expect(circle.style.stroke).toBe('#2563eb');
    expect(circle.style.strokeWidth).toBe(4);
    const [line, poly] = conns(elements);
    expect(line.routing).toBe('straight');
    expect([line.source.x, line.source.y, line.target.x, line.target.y]).toEqual([24, 16, 24, 24]);
    expect(line.endArrow).toBe('none');
    expect(poly.waypoints).toEqual([{ x: 24, y: 36 }]);
    const path = shapes(elements).find((s) => s.kind === 'stencil')!;
    expect([path.x, path.y, path.w, path.h]).toEqual([14, 14, 20, 1]);
    // Round caps survive inside the stencil.
    expect(path.stencil).toContain('<linecap cap="round"/>');
    // One group for the whole import; z-order follows the document.
    expect(new Set(elements.map((e) => e.groupIds.join()))).toHaveProperty('size', 1);
    expect(elements[0].groupIds).toHaveLength(1);
    expect(elements.map((e) => (e.type === 'shape' ? e.kind : 'connector'))).toEqual(['ellipse', 'connector', 'connector', 'stencil']);
  });

  it('flattens nested group transforms, rotation, skew and matrix', () => {
    const els = shapes(svgToElements(TRANSFORMS));
    const box = els.find((e) => e.name === 'box')!;
    expect(box.kind).toBe('rectangle');
    expect([box.x, box.y, box.w, box.h]).toEqual([120, 70, 40, 20]);
    expect(box.style.radius).toBe(4);
    expect(box.style.strokeWidth).toBe(2);
    expect(box.style.fill).toBe('#ff0000');

    const rotated = els[1];
    expect(rotated.kind).toBe('rectangle');
    expect(rotated.rotation).toBe(45);
    expect([rotated.x, rotated.y, rotated.w, rotated.h]).toEqual([40, 40, 20, 20]);
    expect(rotated.style.fill).toBe('#008000');

    // Skew can't be a rotated box: it becomes a stencil parallelogram.
    const skewed = els[2];
    expect(skewed.kind).toBe('stencil');
    expect([skewed.x, skewed.y, skewed.w, skewed.h]).toEqual([200, 200, 15, 10]);
    expect(skewed.style.fill).toBe('#123456');

    const ell = els[3];
    expect(ell.kind).toBe('ellipse');
    expect([ell.x, ell.y, ell.w, ell.h]).toEqual([270, 85, 60, 30]);
    expect(ell.style.fill).toBe('#ff8000');
    expect(ell.style.fillOpacity).toBe(0.5);
  });

  it('turns paths with arcs and curves into valid stencils', () => {
    const els = shapes(svgToElements(CURVES));
    expect(els.every((e) => e.kind === 'stencil')).toBe(true);
    const [circle, wave, quad, square] = els;
    close(circle.x, 0, 0.1);
    close(circle.y, 0, 0.1);
    close(circle.w, 100, 0.1);
    close(circle.h, 100, 0.1);
    expect(circle.style.fill).toBe('#cccccc');
    expect(circle.style.stroke).toBe('none');
    close(wave.h, 75, 0.1);
    expect(wave.style.dashPattern).toBe('4 2');
    expect(wave.style.strokeStyle).toBe('dashed');
    expect(quad.style.stroke).toBe('#0000ff');
    close(quad.w, 80, 0.01);
    expect([square.x, square.y, square.w, square.h]).toEqual([110, 110, 20, 20]);
    for (const el of els) {
      const st = parseStencil(el.stencil!);
      expect(st.unsupported).toEqual([]);
      expect([st.w, st.h]).toEqual([el.w, el.h]);
      const prims = renderStencil(st, el.w, el.h, { ...DEFAULT_STYLE, ...el.style });
      expect(prims.length).toBe(1);
    }
    // The rendered circle fills with the shape's own (editable) fill colour.
    const prim = renderStencil(parseStencil(circle.stencil!), circle.w, circle.h, { ...DEFAULT_STYLE, ...circle.style })[0];
    expect(prim.type === 'path' && prim.fill).toBe('#cccccc');
  });

  it('converts text with tspans, anchors, fonts and scaling', () => {
    const els = shapes(svgToElements(TEXT));
    expect(els.every((e) => e.kind === 'text')).toBe(true);
    const [hello, scaled, mono] = els;
    expect(hello.text).toBe('Hello\nWorld');
    expect(hello.style.fontSize).toBe(20);
    expect(hello.style.fontFamily).toBe('serif');
    expect(hello.style.bold).toBe(true);
    expect(hello.style.textColor).toBe('#333333');
    expect(hello.style.textAlign).toBe('center');
    close(hello.x + hello.w / 2, 150, 0.01);
    expect(hello.y).toBeLessThan(40);
    expect(hello.h).toBeGreaterThan(40);

    expect(scaled.text).toBe('Scaled');
    expect(scaled.style.fontSize).toBe(16);
    expect(scaled.style.italic).toBe(true);
    expect(scaled.style.textColor).toBe('#e11d48');
    expect(scaled.x).toBe(10);
    expect(mono.style.fontFamily).toBe('mono');
    expect(mono.style.textAlign).toBe('left');
  });

  it('converts a typical exported logo (classes, gradients, even-odd, image, use)', () => {
    const { elements, warnings } = convertSvg(LOGO);
    const els = shapes(elements);
    expect(els.map((e) => e.kind)).toEqual(['stencil', 'stencil', 'stencil', 'rectangle', 'image', 'stencil']);
    const [red, ring, arc, grad, img, reused] = els;
    expect(red.style.fill).toBe('#e30613');
    expect(red.style.opacity).toBe(0.8);
    expect([red.x, red.y, red.w, red.h]).toEqual([10, 10, 40, 40]);
    expect(ring.name).toBe('ring');
    expect(arc.style.fill).toBe('none');
    expect(arc.style.stroke).toBe('#1d1d1b');
    expect(arc.style.strokeWidth).toBe(2);
    expect(grad.style.fill).toBe('#ffdd00');
    expect(img.icon).toMatch(/^data:image\/png/);
    expect([img.x, img.y, img.w, img.h]).toEqual([10, 60, 20, 20]);
    // <use> re-instances the ring 45 units lower, with the id rule's even-odd fill.
    expect([reused.x, reused.y]).toEqual([60, 55]);
    expect(warnings.join(' ')).toMatch(/Gradients/);
    expect(warnings.join(' ')).toMatch(/Clipping/);
    // The opacity group (2 members) nests inside the import's group.
    expect(red.groupIds).toHaveLength(2);
    expect(red.groupIds[0]).toBe(ring.groupIds[0]);
    expect(red.groupIds[1]).toBe(arc.groupIds[0]);
    expect(arc.groupIds).toHaveLength(1);
  });

  it('group mode merges sibling paths into one multi-colour stencil', () => {
    const els = shapes(svgToElements(LOGO, { mode: 'group' }));
    // The <g> pair merges; so do the two root-level siblings (arc + gradient rect).
    expect(els.map((e) => e.kind)).toEqual(['stencil', 'stencil', 'image', 'stencil']);
    const merged = els[0];
    expect([merged.x, merged.y, merged.w, merged.h]).toEqual([10, 10, 90, 40]);
    const prims = renderStencil(parseStencil(merged.stencil!), merged.w, merged.h, { ...DEFAULT_STYLE, ...merged.style });
    expect(prims).toHaveLength(2);
    expect(prims.every((p) => p.type === 'path' && p.fill === '#e30613')).toBe(true);
  });

  it('fits large drawings and centres them on a point', () => {
    const big = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#eee"/></svg>';
    const r = convertSvg(big, { fit: 400, center: { x: 0, y: 0 } });
    expect([r.width, r.height]).toEqual([400, 200]);
    const [rect] = shapes(r.elements);
    expect([rect.x, rect.y, rect.w, rect.h]).toEqual([-200, -100, 400, 200]);
    expect(rect.groupIds).toEqual([]);
  });

  it('honours display:none, fill="none" and inline styles', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="10" height="10" style="display:none"/>
      <g style="fill:#00ff00"><rect width="10" height="10" fill="red" style="fill:#0000ff;stroke:#000;stroke-opacity:.5"/><circle r="5" cx="50" cy="50"/></g>
      <rect x="20" width="10" height="10" fill="none"/>
    </svg>`;
    const els = shapes(svgToElements(svg));
    expect(els).toHaveLength(3);
    expect(els[0].style.fill).toBe('#0000ff');
    expect(els[0].style.strokeOpacity).toBe(0.5);
    expect(els[1].style.fill).toBe('#00ff00');
    expect(els[2].style.fill).toBe('none');
    expect(els[2].style.stroke).toBe('none');
  });

  it('rejects invalid SVG', () => {
    expect(() => svgToElements('<svg><g></svg>')).toThrow();
    expect(() => svgToElements('<html/>')).toThrow();
  });
});

describe('opening a plain SVG file', () => {
  it('imports it as editable shapes instead of failing', async () => {
    const { importEmbedded } = await import('@/io/import/embedded');
    const res = await importEmbedded(new TextEncoder().encode(LOGO), 'C:\\art\\logo.svg');
    expect(res.pages[0].name).toBe('logo');
    const els = Object.values(res.pages[0].doc.elements);
    expect(els.length).toBe(6);
    expect(res.pages[0].doc.order).toEqual(els.map((e) => e.id));
  });
});
