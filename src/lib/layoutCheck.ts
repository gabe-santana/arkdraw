/**
 * Layout lint: finds text that will not read well once drawn. Pure and
 * read-only (it never moves anything), so the AI generator, tests, scripts and
 * a future CLI flag can all run it on a document.
 *
 * Checks, on the rendered geometry (label boxes from src/text/labelLayout.ts,
 * the same wrapping as the renderer, routes from connectorGeometryInDoc):
 * - `text-overflow`: a label's text does not fit its own box.
 * - `text-outside-container`: text that starts inside a shape spills over its edge.
 * - `text-overlap`: two labels' text overlap.
 * - `shape-over-text`: a filled shape drawn above a label covers part of it.
 * - `connector-crosses-text`: a connector's line runs through a label.
 * - `connector-label-overlap`: a connector's label covers a label or a shape.
 */
import type { ConnectorElement, Doc, Rect, ShapeElement, Vec } from '@/model/types';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { containsPoint, containsRect, inflate, intersects } from '@/lib/geometry';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { shapeLabelBox } from '@/text/labelLayout';
import { needsRich, richSize } from '@/text/RichTextBlock';
import { labelLayout } from '@/canvas/ElementBodies';
import { isContainerShape } from '@/interaction/container';
import { getShapeDef } from '@/shapes/registry';

export type LayoutIssueKind =
  | 'text-overflow'
  | 'text-outside-container'
  | 'text-overlap'
  | 'shape-over-text'
  | 'connector-crosses-text'
  | 'connector-label-overlap';

export interface LayoutIssue {
  kind: LayoutIssueKind;
  /** The element whose text is affected first, then the other element involved (if any). */
  ids: [string] | [string, string];
  /** Where the problem is (world coordinates). */
  rect: Rect;
}

/** Overlaps smaller than this (px) are ignored: anti-aliasing, rounding. */
const TOLERANCE = 1;
/** Text may exceed its box by this much (px) before it counts as overflow: line-height rounding. */
const OVERFLOW_SLACK = 2;

/**
 * Bounds of the text a shape's label actually draws (not its box): aligned in
 * the label box like TextBlock / RichTextBlock do, so unwrapped or too-long
 * text sticks out of the box. Unrotated shapes only; null when nothing shows.
 */
export function labelInkBox(el: ShapeElement): Rect | null {
  if (!el.text || el.hidden || el.rotation) return null;
  const layout = shapeLabelBox(el);
  if (!layout || layout.style.verticalText) return null;
  const { box, style } = layout;
  const wrap = style.wrap !== false;
  let w: number;
  let h: number;
  if (needsRich(el.text, style)) {
    ({ w, h } = richSize(el.text, box.w, style, wrap));
  } else {
    const lines = wrap ? wrapText(el.text, box.w, style) : el.text.split('\n');
    w = Math.max(0, ...lines.map((l) => measureText(l, style)));
    h = lines.length * lineHeight(style.fontSize);
  }
  if (w <= 0 || h <= 0) return null;
  const x = style.textAlign === 'left' ? box.x : style.textAlign === 'right' ? box.x + box.w - w : box.x + (box.w - w) / 2;
  const y = style.verticalAlign === 'top' ? box.y : style.verticalAlign === 'bottom' ? box.y + box.h - h : box.y + (box.h - h) / 2;
  return { x, y, w, h };
}

const overlap = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > TOLERANCE && h > TOLERANCE ? { x, y, w, h } : null;
};

/** Whether segment p→q passes through `r` (Liang–Barsky clipping). */
export function segmentHitsRect(p: Vec, q: Vec, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const edges: Array<[number, number]> = [
    [-dx, p.x - r.x],
    [dx, r.x + r.w - p.x],
    [-dy, p.y - r.y],
    [dy, r.y + r.h - p.y],
  ];
  for (const [pk, qk] of edges) {
    if (pk === 0) {
      if (qk < 0) return false;
      continue;
    }
    const t = qk / pk;
    if (pk < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

/** Lints one page. Hidden elements are skipped; the result is in z-order. */
export function checkLayout(doc: Doc): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const shapes: ShapeElement[] = [];
  const conns: ConnectorElement[] = [];
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (!el || el.hidden) continue;
    if (el.type === 'shape') shapes.push(el);
    else conns.push(el);
  }
  const z = new Map(doc.order.map((id, i) => [id, i]));
  const texts = shapes.map((s) => ({ s, ink: labelInkBox(s) })).filter((t): t is { s: ShapeElement; ink: Rect } => !!t.ink);
  const filled = (s: ShapeElement) => s.kind !== 'text' && s.style.fill !== 'none';

  for (const { s, ink } of texts) {
    const { box: own, style } = shapeLabelBox(s)!;
    // Inside labels may use the shape's padding, so they only overflow past the shape itself
    // (line-height rounding gets OVERFLOW_SLACK). Outside labels (icon captions) have a
    // zero-height box by design: only their width counts.
    const inside = (s.style.labelPosition ?? (getShapeDef(s.kind).textPlacement === 'below' ? 'bottom' : 'inside')) === 'inside';
    const fits = inside
      ? containsRect(inflate({ x: s.x, y: s.y, w: s.w, h: s.h }, OVERFLOW_SLACK), ink)
      : own.h > 0 ? containsRect(inflate(own, OVERFLOW_SLACK), ink) : ink.x >= own.x - OVERFLOW_SLACK && ink.x + ink.w <= own.x + own.w + OVERFLOW_SLACK;
    if (!fits) issues.push({ kind: 'text-overflow', ids: [s.id], rect: ink });

    // Where the text starts: a shape holding this point is the one the text belongs in.
    const align = style.textAlign;
    const anchor = { x: align === 'left' ? ink.x + TOLERANCE : align === 'right' ? ink.x + ink.w - TOLERANCE : ink.x + ink.w / 2, y: ink.y + ink.h / 2 };
    for (const o of shapes) {
      if (o.id === s.id || o.kind === 'text' || o.rotation) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      if (containsPoint(r, anchor) && !containsRect(inflate(r, TOLERANCE), ink)) {
        issues.push({ kind: 'text-outside-container', ids: [s.id, o.id], rect: ink });
      }
      // ponytail: only shapes above the label in z-order hide it; a translucent fill still counts.
      const hit = filled(o) && z.get(o.id)! > z.get(s.id)! ? overlap(r, ink) : null;
      if (hit) issues.push({ kind: 'shape-over-text', ids: [s.id, o.id], rect: hit });
    }
  }

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const hit = overlap(texts[i].ink, texts[j].ink);
      if (hit) issues.push({ kind: 'text-overlap', ids: [texts[i].s.id, texts[j].s.id], rect: hit });
    }
  }

  for (const c of conns) {
    const g = connectorGeometryInDoc(c, doc.elements);
    const pts = g.samples;
    for (const { s, ink } of texts) {
      // Shrunk a bit: a line ending on a text shape's border is not a crossing.
      const r = inflate(ink, -TOLERANCE);
      if (r.w <= 0 || r.h <= 0) continue;
      for (let k = 1; k < pts.length; k++) {
        if (segmentHitsRect(pts[k - 1], pts[k], r)) {
          issues.push({ kind: 'connector-crosses-text', ids: [s.id, c.id], rect: ink });
          break;
        }
      }
    }
    if (!c.text) continue;
    const { w, h } = labelLayout(c);
    // Padded like the label's background (ConnectorLabel in src/canvas/ElementBodies.tsx).
    const lab = { x: g.label.x - w / 2 - 6, y: g.label.y - h / 2 - 3, w: w + 12, h: h + 6 };
    for (const { s, ink } of texts) {
      const hit = overlap(lab, ink);
      if (hit) issues.push({ kind: 'connector-label-overlap', ids: [s.id, c.id], rect: hit });
    }
    for (const o of shapes) {
      if (o.kind === 'text' || o.rotation) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      // A label sitting inside a card or container is fine; one straddling a shape is not.
      if (isContainerShape(o) || containsRect(r, lab) || !intersects(r, lab)) continue;
      const hit = overlap(r, lab);
      if (hit) issues.push({ kind: 'connector-label-overlap', ids: [o.id, c.id], rect: hit });
    }
  }
  return issues;
}
