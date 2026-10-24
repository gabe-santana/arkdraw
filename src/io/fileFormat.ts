/**
 * The `.opendraw` file format: pretty-printed JSON, so diagrams diff cleanly
 * in git. Parsing is forgiving — unknown fields are kept, missing style keys
 * are filled from defaults, and invalid elements are skipped instead of
 * failing the whole file.
 */
import type { ConnectorElement, DiagramElement, Doc, DocumentMeta, Layer, Page, PageSettings, ShapeElement } from '@/model/types';
import { uid } from '@/lib/id';
import { DEFAULT_CONNECTOR_STYLE, DEFAULT_STYLE } from '@/model/defaults';

export const FILE_FORMAT = 'opendraw';
export const FILE_VERSION = 2;
export const FILE_EXTENSION = 'opendraw';

interface FilePage {
  id: string;
  name: string;
  settings: PageSettings;
  layers?: Layer[];
  /** Page-level key/value data (Edit Data on pages). */
  data?: Record<string, string>;
  /** Elements in z-order, back to front. */
  elements: DiagramElement[];
}

export interface ArkDrawFile {
  format: typeof FILE_FORMAT;
  version: number;
  generator: string;
  savedAt: string;
  /** File properties (title, author, description, timestamps, document data). */
  meta?: DocumentMeta;
  pages: FilePage[];
}

const DEFAULT_SETTINGS: PageSettings = { background: null, paper: 'A4', landscape: false, pageView: false };

export function serializePages(pages: Page[], meta?: DocumentMeta): string {
  const file: ArkDrawFile = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    generator: `ArkDraw ${__APP_VERSION__}`,
    savedAt: new Date().toISOString(),
    ...(meta && Object.keys(meta).length ? { meta } : {}),
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      settings: p.settings,
      ...(p.doc.layers ? { layers: p.doc.layers } : {}),
      ...(p.data && Object.keys(p.data).length ? { data: p.data } : {}),
      elements: p.doc.order.map((id) => p.doc.elements[id]).filter(Boolean),
    })),
  };
  return JSON.stringify(file, null, 2) + '\n';
}

/** Single-page convenience (clipboard, tests). */
export const serializeDoc = (doc: Doc): string =>
  serializePages([{ id: 'page-1', name: 'Page 1', doc, settings: DEFAULT_SETTINGS }]);

export class FileFormatError extends Error {}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

const isVec = (v: unknown): v is { x: number; y: number } =>
  !!v && typeof v === 'object' && Number.isFinite((v as { x: unknown }).x) && Number.isFinite((v as { y: unknown }).y);
const ROUTINGS = ['orthogonal', 'straight', 'curved', 'elbow-h', 'elbow-v', 'entity', 'isometric'];

function normalizeEndpoint(e: unknown): ConnectorElement['source'] {
  const o = (e ?? {}) as Record<string, unknown>;
  return {
    ...(typeof o.elementId === 'string' ? { elementId: o.elementId } : {}),
    ...(typeof o.side === 'string' ? { side: o.side as ConnectorElement['source']['side'] } : {}),
    ...(isVec(o.fixed) ? { fixed: { x: o.fixed.x, y: o.fixed.y } } : {}),
    ...(isVec(o.fixedOffset) ? { fixedOffset: { x: o.fixedOffset.x, y: o.fixedOffset.y } } : {}),
    ...(typeof o.edgeT === 'number' && Number.isFinite(o.edgeT) ? { edgeT: o.edgeT } : {}),
    x: num(o.x),
    y: num(o.y),
  };
}

function normalizeElement(raw: unknown): DiagramElement | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  const groupIds = Array.isArray(o.groupIds) ? o.groupIds.filter((g): g is string => typeof g === 'string') : [];
  const text = typeof o.text === 'string' ? o.text : '';
  if (o.type === 'shape') {
    if (typeof o.kind !== 'string') return null;
    return {
      ...(o as unknown as ShapeElement),
      x: num(o.x),
      y: num(o.y),
      w: Math.max(1, num(o.w, 100)),
      h: Math.max(1, num(o.h, 60)),
      text,
      groupIds,
      style: { ...DEFAULT_STYLE, ...((o.style as object) ?? {}) },
    };
  }
  if (o.type === 'connector') {
    return {
      ...(o as unknown as ConnectorElement),
      source: normalizeEndpoint(o.source),
      target: normalizeEndpoint(o.target),
      routing: ROUTINGS.includes(o.routing as string) ? (o.routing as ConnectorElement['routing']) : 'orthogonal',
      startArrow: (o.startArrow as ConnectorElement['startArrow']) ?? 'none',
      endArrow: (o.endArrow as ConnectorElement['endArrow']) ?? 'triangle',
      text,
      groupIds,
      style: { ...DEFAULT_CONNECTOR_STYLE, ...((o.style as object) ?? {}) },
    };
  }
  return null;
}

function docFromElements(raw: unknown[], layers?: Layer[]): Doc {
  const elements: Record<string, DiagramElement> = {};
  const order: string[] = [];
  for (const r of raw) {
    const el = normalizeElement(r);
    if (!el || elements[el.id]) continue;
    elements[el.id] = el;
    order.push(el.id);
  }
  // Drop dangling references.
  for (const id of order) {
    const el = elements[id];
    if (el.type === 'shape' && el.containerId && !elements[el.containerId]) elements[id] = { ...el, containerId: undefined };
    if (el.type === 'connector') {
      for (const end of ['source', 'target'] as const) {
        const cur = elements[id] as ConnectorElement;
        if (cur[end].elementId && !elements[cur[end].elementId!]) {
          elements[id] = { ...cur, [end]: { x: cur[end].x, y: cur[end].y } };
        }
      }
    }
  }
  const validLayers = Array.isArray(layers) && layers.length ? layers.filter((l) => l && typeof l.id === 'string') : undefined;
  return validLayers?.length ? { elements, order, layers: validLayers } : { elements, order };
}

/** Parses any supported version into pages. */
export function parsePages(text: string): Page[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new FileFormatError('This file is not valid JSON.');
  }
  const file = data as Partial<ArkDrawFile> & { elements?: unknown[] };
  if (!file || file.format !== FILE_FORMAT) throw new FileFormatError('This is not an ArkDraw diagram.');
  if ((file.version ?? 1) > FILE_VERSION) {
    console.warn(`Diagram was saved by a newer ArkDraw (format v${file.version}); some features may be missing.`);
  }
  // v1: a single flat element list.
  if (Array.isArray(file.elements) && !Array.isArray(file.pages)) {
    return [{ id: uid(), name: 'Page 1', doc: docFromElements(file.elements), settings: { ...DEFAULT_SETTINGS } }];
  }
  if (!Array.isArray(file.pages) || !file.pages.length) throw new FileFormatError('This diagram has no pages.');
  return file.pages.map((p, i) => ({
    id: typeof p.id === 'string' ? p.id : uid(),
    name: typeof p.name === 'string' ? p.name : `Page ${i + 1}`,
    settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
    doc: docFromElements(Array.isArray(p.elements) ? p.elements : [], p.layers),
    ...(p.data && typeof p.data === 'object' ? { data: p.data } : {}),
  }));
}

/** File properties of a serialized diagram (undefined for older files or non-JSON). */
export function parseMeta(text: string): DocumentMeta | undefined {
  try {
    const meta = (JSON.parse(text) as Partial<ArkDrawFile>)?.meta;
    return meta && typeof meta === 'object' ? meta : undefined;
  } catch {
    return undefined;
  }
}

/** First page only (clipboard, single-page callers). */
export const parseDoc = (text: string): Doc => parsePages(text)[0].doc;
