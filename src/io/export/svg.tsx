/**
 * Standalone SVG rendering of a diagram, shared by every exporter.
 * Uses the exact same element renderers as the canvas.
 */
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import interFontUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline';
import type { DiagramElement, Doc, Layer, Rect } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { ConnectorBody, labelLayout, LabelVarsContext, ShapeBody, SvgDefs, type AnimFrame, type LabelVars } from '@/canvas/ElementBodies';
import { IconHrefContext, iconUrl } from '@/shapes/IconImage';
import { getShapeDef } from '@/shapes/registry';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { boundsOfPoints, unionRects } from '@/lib/geometry';
import { effectiveReveal } from '@/animation/timeline';

export type Appearance = 'light' | 'dark' | 'auto';

export interface SvgExportOptions {
  /** Restrict to these ids (plus connectors between them). Default: everything. */
  ids?: string[];
  padding?: number;
  /** CSS color, or null for transparent. */
  background: string | null;
  /** Embed the Inter font so text renders identically everywhere. */
  embedFont?: boolean;
  /** Animation frame (GIF export). */
  frame?: AnimFrame;

  // --- Optional extras (all default to the previous behaviour) ------------
  /** Export exactly this world-space area (padding is added around it) instead of the content bounds. */
  area?: Rect;
  /** Draw the editor grid behind the diagram, with this spacing in px. */
  grid?: number | false;
  /** light = real colors; dark = canvas-style inverted colors; auto = follows prefers-color-scheme. */
  appearance?: Appearance;
  /**
   * Elements on hidden layers / in collapsed containers:
   * `omit` (default, like the canvas), `hide` (rendered with display:none — for
   * viewers that toggle layers), `show` (export everything).
   */
  hiddenLayers?: 'omit' | 'hide' | 'show';
  /** Wrap each layer's elements in `<g data-layer="id" data-layer-name="…">`. */
  layerGroups?: boolean;
  /** Hyperlinks: `anchor` wraps external links in `<a href>`; `data` adds `data-link` (HTML viewer); `none`. Default `anchor`. */
  links?: 'anchor' | 'data' | 'none';
  /** Values for %placeholders% in labels. */
  labelVars?: LabelVars;
  /** Page-level "shadow on every shape". */
  pageShadow?: boolean;
  /** No XML prolog / namespaces (for inlining into HTML). */
  inline?: boolean;
  /** Prefix for every id in the output, so several SVGs can share one HTML document. */
  idPrefix?: string;
}

export interface RenderedSvg {
  svg: string;
  width: number;
  height: number;
  /** World-space origin of the output (top-left, before padding). */
  origin?: { x: number; y: number };
}

/** Elements to export, in z-order. */
export function exportSubset(doc: Doc, ids?: string[]): DiagramElement[] {
  if (!ids?.length) return doc.order.map((id) => doc.elements[id]).filter(Boolean);
  const set = new Set(ids);
  // Include container contents and connectors whose ends are both included.
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of doc.order) {
      const el = doc.elements[id];
      if (set.has(id)) continue;
      if (isShape(el) && el.containerId && set.has(el.containerId)) {
        set.add(id);
        grew = true;
      }
    }
  }
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (isConnector(el) && el.source.elementId && el.target.elementId && set.has(el.source.elementId) && set.has(el.target.elementId)) set.add(id);
  }
  return doc.order.filter((id) => set.has(id)).map((id) => doc.elements[id]).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Layers & visibility (mirrors store/editor.ts without depending on the store)
// ---------------------------------------------------------------------------

const IMPLICIT_LAYER: Layer = { id: 'layer-1', name: 'Background', visible: true, locked: false };

export const docLayers = (doc: Doc): Layer[] => (doc.layers?.length ? doc.layers : [IMPLICIT_LAYER]);

export function layerOfElement(doc: Doc, el: DiagramElement): Layer {
  const layers = docLayers(doc);
  return layers.find((l) => l.id === el.layerId) ?? layers[0];
}

/** Inside a collapsed container (any ancestor). */
function collapsedAway(doc: Doc, el: DiagramElement): boolean {
  let parentId = isShape(el) ? el.containerId : undefined;
  for (let guard = 0; parentId && guard < 50; guard++) {
    const parent = doc.elements[parentId];
    if (!isShape(parent)) break;
    if (parent.collapsed) return true;
    parentId = parent.containerId;
  }
  return false;
}

/** Elements to draw, in render order (by layer, then z-order). */
function drawable(doc: Doc, els: DiagramElement[], hidden: 'omit' | 'hide' | 'show'): DiagramElement[] {
  const layers = docLayers(doc);
  const rank = new Map(layers.map((l, i) => [l.id, i]));
  return els
    .filter((el) => !collapsedAway(doc, el) && (hidden !== 'omit' || layerOfElement(doc, el).visible))
    .map((el, i) => ({ el, i, r: rank.get(layerOfElement(doc, el).id) ?? 0 }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.el);
}

/** Visual bounds including labels below shapes, arrowheads and connector labels. */
export function visualBounds(doc: Doc, els: DiagramElement[]): Rect | null {
  const rects: Rect[] = [];
  for (const el of els) {
    if (isShape(el)) {
      rects.push({ x: el.x, y: el.y, w: el.w, h: el.h });
      if (el.text && getShapeDef(el.kind).textPlacement === 'below') {
        rects.push({ x: el.x - 40, y: el.y + el.h, w: el.w + 80, h: el.style.fontSize * 2.8 });
      }
      if (el.style.shadow) rects.push({ x: el.x, y: el.y, w: el.w, h: el.h + 12 });
    } else {
      const g = connectorGeometryInDoc(el, doc.elements);
      const b = boundsOfPoints(g.samples);
      const pad = 12 + el.style.strokeWidth * 2;
      rects.push({ x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 });
      if (el.text) {
        const l = labelLayout(el);
        rects.push({ x: g.label.x - l.w / 2 - 8, y: g.label.y - l.h / 2 - 4, w: l.w + 16, h: l.h + 8 });
      }
    }
  }
  return unionRects(rects);
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

/** Caveat (the hand-drawn font) is loaded on demand: most diagrams never use it. */
let caveatCss: string | null = null;

/** Loads optional fonts needed by `els` so the (synchronous) renderer can embed them. */
export async function loadExportFonts(els: DiagramElement[]): Promise<void> {
  if (caveatCss || !els.some((e) => e.style.fontFamily === 'hand')) return;
  try {
    const [r400, r700] = await Promise.all([
      import('@fontsource/caveat/files/caveat-latin-400-normal.woff2?inline'),
      import('@fontsource/caveat/files/caveat-latin-700-normal.woff2?inline'),
    ]);
    caveatCss =
      `@font-face{font-family:Caveat;font-style:normal;font-weight:400;src:url(${r400.default}) format("woff2");}` +
      `@font-face{font-family:Caveat;font-style:normal;font-weight:700;src:url(${r700.default}) format("woff2");}`;
  } catch {
    /* fonts are a nicety */
  }
}

/** @font-face rules for the fonts used by `els` (Inter always when there is text). */
export function fontFaceCss(els: DiagramElement[]): string {
  if (!els.some((e) => e.text)) return '';
  let css = `@font-face{font-family:"Inter Variable";font-style:normal;font-weight:100 900;src:url(${interFontUrl}) format("woff2");}`;
  if (caveatCss && els.some((e) => e.text && e.style.fontFamily === 'hand')) css += caveatCss;
  return css;
}

// ---------------------------------------------------------------------------
// Appearance (dark / auto) — the same invert filter the canvas uses
// ---------------------------------------------------------------------------

const DARK_RULES =
  '.od-art{filter:invert(0.92) hue-rotate(180deg) saturate(1.15)}' +
  '.od-art .od-keep-color{filter:invert(1) hue-rotate(180deg) saturate(0.87)}';

export function appearanceCss(appearance: Appearance | undefined): string {
  if (appearance === 'dark') return DARK_RULES;
  if (appearance === 'auto') return `@media (prefers-color-scheme: dark){${DARK_RULES}}`;
  return '';
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const isExternalLink = (href: string) => /^(https?:|mailto:|tel:|#)/i.test(href);

function withLink(el: DiagramElement, mode: SvgExportOptions['links'], node: ReactNode): ReactNode {
  if (!el.link || mode === 'none') return node;
  if (mode === 'data') {
    return (
      <g key={el.id} data-link={el.link} className="od-link">
        {node}
      </g>
    );
  }
  if (!isExternalLink(el.link)) return node;
  return (
    <a key={el.id} href={el.link} target="_blank" rel="noopener noreferrer">
      {node}
    </a>
  );
}

function GridPattern({ id, size, b, color }: { id: string; size: number; b: Rect; color: string }) {
  const major = size * 5;
  return (
    <>
      <defs>
        <pattern id={`${id}-minor`} width={size} height={size} patternUnits="userSpaceOnUse">
          <path d={`M ${size} 0 L 0 0 0 ${size}`} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={0.5} />
        </pattern>
        <pattern id={id} width={major} height={major} patternUnits="userSpaceOnUse">
          <rect width={major} height={major} fill={`url(#${id}-minor)`} />
          <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={0.75} />
        </pattern>
      </defs>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={`url(#${id})`} pointerEvents="none" />
    </>
  );
}

/** Prefixes every id (and its references) so several SVGs can live in one HTML document. */
export function prefixSvgIds(svg: string, prefix: string): string {
  const ids = new Set<string>();
  svg.replace(/\sid="([^"]+)"/g, (_, id: string) => (ids.add(id), ''));
  if (!ids.size) return svg;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alt = [...ids].sort((a, b) => b.length - a.length).map(esc).join('|');
  return svg
    .replace(new RegExp(`(\\sid=")(${alt})"`, 'g'), `$1${prefix}$2"`)
    .replace(new RegExp(`url\\(#(${alt})\\)`, 'g'), `url(#${prefix}$1)`)
    .replace(new RegExp(`(href=")#(${alt})"`, 'g'), `$1#${prefix}$2"`);
}

export function renderSvg(doc: Doc, opts: SvgExportOptions, resolveIcon = iconUrl): RenderedSvg {
  const hiddenMode = opts.hiddenLayers ?? 'omit';
  const els = drawable(doc, exportSubset(doc, opts.ids), hiddenMode);
  const pad = opts.padding ?? 24;
  const b = opts.area ?? visualBounds(doc, els) ?? { x: 0, y: 0, w: 100, h: 100 };
  const width = Math.ceil(b.w + pad * 2);
  const height = Math.ceil(b.h + pad * 2);
  const lookup = (id: string) => doc.elements[id];
  const fonts = opts.embedFont !== false ? fontFaceCss(els) : '';
  const css = fonts + appearanceCss(opts.appearance);
  const ox = pad - b.x;
  const oy = pad - b.y;
  const world = { x: b.x - pad, y: b.y - pad, w: width, h: height };

  const renderEl = (el: DiagramElement) =>
    withLink(
      el,
      opts.links ?? 'anchor',
      isShape(el) ? (
        <ShapeBody key={el.id} el={el} frame={opts.frame} pageShadow={opts.pageShadow} />
      ) : (
        <ConnectorBody
          key={el.id}
          el={el}
          lookup={lookup}
          geometry={connectorGeometryInDoc(el, doc.elements)}
          labelBg={opts.background ?? '#ffffff'}
          frame={opts.frame}
          revealStep={effectiveReveal(el, doc)}
        />
      ),
    );

  let content: ReactNode;
  if (opts.layerGroups || hiddenMode === 'hide') {
    const runs: Array<{ layer: Layer; els: DiagramElement[] }> = [];
    for (const el of els) {
      const layer = layerOfElement(doc, el);
      const last = runs[runs.length - 1];
      if (last && last.layer.id === layer.id) last.els.push(el);
      else runs.push({ layer, els: [el] });
    }
    // Empty layers still get a group so viewers can list them.
    if (opts.layerGroups) for (const l of docLayers(doc)) if (!runs.some((r) => r.layer.id === l.id)) runs.push({ layer: l, els: [] });
    content = runs.map((r, i) => (
      <g
        key={`${r.layer.id}-${i}`}
        data-layer={opts.layerGroups ? r.layer.id : undefined}
        data-layer-name={opts.layerGroups ? r.layer.name : undefined}
        style={r.layer.visible ? undefined : { display: 'none' }}
      >
        {r.els.map(renderEl)}
      </g>
    ));
  } else {
    content = els.map(renderEl);
  }

  const body = renderToStaticMarkup(
    <IconHrefContext.Provider value={resolveIcon}>
      <LabelVarsContext.Provider value={opts.labelVars ?? { pageName: 'Page 1', pageNumber: 1, pageCount: 1, fileName: 'Diagram' }}>
        <svg
          xmlns={opts.inline ? undefined : 'http://www.w3.org/2000/svg'}
          xmlnsXlink={opts.inline ? undefined : 'http://www.w3.org/1999/xlink'}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          {css && <style>{css}</style>}
          <SvgDefs />
          <g className={opts.appearance && opts.appearance !== 'light' ? 'od-art' : undefined}>
            {opts.background && <rect width={width} height={height} fill={opts.background} />}
            <g transform={`translate(${ox} ${oy})`}>
              {opts.grid ? <GridPattern id="od-grid" size={opts.grid} b={world} color="#94a3b8" /> : null}
              {content}
            </g>
          </g>
        </svg>
      </LabelVarsContext.Provider>
    </IconHrefContext.Provider>,
  );
  const svg = opts.idPrefix ? prefixSvgIds(body, opts.idPrefix) : body;
  return { svg: opts.inline ? svg : `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, width, height, origin: { x: b.x, y: b.y } };
}

// ---------------------------------------------------------------------------
// Vendor icons → data URIs, so exported files are self-contained.
// ---------------------------------------------------------------------------

const iconCache = new Map<string, string>();

async function toDataUri(path: string): Promise<string> {
  const cached = iconCache.get(path);
  if (cached) return cached;
  if (path.startsWith('data:')) return path;
  const res = await fetch(iconUrl(path));
  if (!res.ok) throw new Error(`Could not load ${path}`);
  const blob = await res.blob();
  const uri = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  iconCache.set(path, uri);
  return uri;
}

/** Inlines every vendor icon used by `els` and returns a resolver for renderSvg. */
export async function inlineIcons(els: DiagramElement[]): Promise<(path: string) => string> {
  const paths = [...new Set(els.filter(isShape).map((e) => e.icon).filter((p): p is string => !!p && !p.startsWith('data:')))];
  await Promise.all(paths.map((p) => toDataUri(p).catch(() => '')));
  return (path) => iconCache.get(path) || iconUrl(path);
}

export async function renderSvgStandalone(doc: Doc, opts: SvgExportOptions): Promise<RenderedSvg> {
  const els = exportSubset(doc, opts.ids);
  const [resolver] = await Promise.all([inlineIcons(els), opts.embedFont !== false ? loadExportFonts(els) : Promise.resolve()]);
  return renderSvg(doc, opts, resolver);
}
