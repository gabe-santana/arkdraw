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
 * - `connector-crosses-text`: a connector's line runs through a label (another connector's included).
 * - `connector-crosses-shape`: a connector runs through a shape that is not one of its ends
 *   (containers and shapes holding an end excepted).
 * - `connector-label-overlap`: a connector's label covers a label, or hides a good part of a shape.
 */
import type { ConnectorElement, Doc, Rect, ShapeElement, Vec } from '@/model/types';
import { isShape } from '@/model/types';

export { labelInkBox, segmentHitsRect };
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { containsPoint, containsRect, inflate, intersects, segmentHitsRect } from '@/lib/geometry';
import { connectorLabelBox, hasOutsideLabel, labelInkBox, shapeLabelBox } from '@/text/labelLayout';
import { isContainerShape } from '@/interaction/container';
import { getShapeDef } from '@/shapes/registry';

export type LayoutIssueKind =
  | 'text-overflow'
  | 'text-outside-container'
  | 'text-overlap'
  | 'shape-over-text'
  | 'connector-crosses-text'
  | 'connector-crosses-shape'
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
/** A connector label hiding more than this share of a shape hides the shape. */
const HIDDEN_SHARE = 0.25;

const overlap = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > TOLERANCE && h > TOLERANCE ? { x, y, w, h } : null;
};

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
    // Only text that sits in another shape can spill out of it: text elements and captions (a shape's own label overflowing is text-overflow).
    const placed = s.kind === 'text' || hasOutsideLabel(s);
    for (const o of shapes) {
      if (o.id === s.id || o.kind === 'text' || o.rotation) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      if (placed && containsPoint(r, anchor) && !containsRect(inflate(r, TOLERANCE), ink)) {
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

  const geos = new Map(conns.map((c) => [c.id, connectorGeometryInDoc(c, doc.elements)]));
  const labels = conns.filter((c) => c.text).map((c) => ({ c, box: connectorLabelBox(c, geos.get(c.id)!.label) }));
  const crosses = (pts: Vec[], r: Rect) => {
    // Shrunk a bit: a line ending on a border is not a crossing.
    const q = inflate(r, -TOLERANCE);
    return q.w > 0 && q.h > 0 && pts.some((p, k) => k > 0 && segmentHitsRect(pts[k - 1], p, q));
  };
  const inside = (e: ShapeElement | undefined, o: ShapeElement) => !!e && containsRect(o, e);

  for (const c of conns) {
    const pts = geos.get(c.id)!.samples;
    // The line is cut under these (avoidText), so the text stays readable.
    const cut = geos.get(c.id)!.holes ?? [];
    for (const { s, ink } of texts) {
      if (crosses(pts, ink) && !cut.some((h) => containsRect(h, ink))) issues.push({ kind: 'connector-crosses-text', ids: [s.id, c.id], rect: ink });
    }
    for (const l of labels) {
      if (l.c.id !== c.id && crosses(pts, l.box)) issues.push({ kind: 'connector-crosses-text', ids: [l.c.id, c.id], rect: l.box });
    }
    // Cards in the way: not its ends, nor containers or shapes holding an end (routes may cross those).
    const ends = [c.source.elementId, c.target.elementId].map((id) => (id ? doc.elements[id] : undefined)).filter(isShape);
    for (const o of shapes) {
      if (o.kind === 'text' || o.rotation || isContainerShape(o) || ends.some((e) => e.id === o.id || inside(e, o))) continue;
      if (crosses(pts, o)) issues.push({ kind: 'connector-crosses-shape', ids: [o.id, c.id], rect: { x: o.x, y: o.y, w: o.w, h: o.h } });
    }
  }

  for (const { c, box: lab } of labels) {
    for (const { s, ink } of texts) {
      const hit = overlap(lab, ink);
      if (hit) issues.push({ kind: 'connector-label-overlap', ids: [s.id, c.id], rect: hit });
    }
    for (const o of shapes) {
      if (o.kind === 'text' || o.rotation) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      // A label sitting inside a card or container is fine, and so is one over a strip of a big card's
      // edge (the card still reads); one hiding a good part of a node (an icon, a badge) is not.
      if (isContainerShape(o) || containsRect(r, lab) || !intersects(r, lab)) continue;
      const hit = overlap(r, lab);
      if (hit && hit.w * hit.h > HIDDEN_SHARE * o.w * o.h) issues.push({ kind: 'connector-label-overlap', ids: [o.id, c.id], rect: hit });
    }
  }
  return issues;
}
