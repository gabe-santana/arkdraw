/**
 * Where a dragged connector end lands: a shape connection point, an exact
 * outline point (Shift), a floating shape attachment, another connector
 * (connect-to-edge) or free space. Shared by the connect and endpoint drags.
 */
import { create } from 'zustand';
import type { Doc, Endpoint, ShapeElement, Vec } from '@/model/types';
import { isShape } from '@/model/types';
import {
  attachToShape, connectorAtPoint, dependentConnectors, endpointOnEdge, endpointPreview, fractionToWorld,
} from '@/lib/connectionPoints';
import { isHidden, isLocked } from '@/store/editor';

/** True while an existing connector's end is being dragged (the overlay then shows drop targets). */
export const useEndpointDrag = create<{ active: boolean }>(() => ({ active: false }));

/** Screen px within which an end snaps to a connection point. */
export const POINT_SNAP = 18;
/** Screen px within which an end attaches to a connector it is dropped on. */
const EDGE_SNAP = 7;

export interface Drop {
  ep: Endpoint;
  /** Where the end will visibly sit. */
  preview: Vec;
  /** Attached element (shape or connector), if any. */
  targetId: string | null;
}

/**
 * Resolves a drop at `p`. `shape` is the shape under the pointer (already
 * filtered by the caller); `selfConn` is the connector being edited, which
 * (with everything hanging off it) can't become its own target.
 */
export function resolveDrop(doc: Doc, p: Vec, shape: ShapeElement | null, opts: { z: number; exact?: boolean; selfConn?: string }): Drop {
  if (shape) {
    const ep = attachToShape(shape, p, POINT_SNAP / opts.z, !!opts.exact);
    // Snapped to a point (or Shift): the shape wins over any connector passing by.
    if (ep.fixed || (ep.side && ep.side !== 'auto')) return { ep, preview: endpointPreview(shape, ep, p), targetId: shape.id };
  }
  const exclude = opts.selfConn ? dependentConnectors(doc, opts.selfConn) : new Set<string>();
  const hit = connectorAtPoint(doc, p, EDGE_SNAP / opts.z, exclude, (el) => !isLocked(doc, el) && !isHidden(doc, el) && el.behavior?.connectable !== false);
  if (hit) return { ep: endpointOnEdge(hit.conn, hit.t, hit.point), preview: hit.point, targetId: hit.conn.id };
  if (shape) return { ep: { elementId: shape.id, side: 'auto', x: p.x, y: p.y }, preview: p, targetId: shape.id };
  return { ep: { x: p.x, y: p.y }, preview: p, targetId: null };
}

/** Start endpoint when a drag begins on a connection-point marker (`data-cpoint`). */
export function endpointFromPointMarker(target: Element, doc: Doc): Endpoint | null {
  const node = target.closest('[data-cpoint]');
  if (!node) return null;
  const el = doc.elements[node.getAttribute('data-cpoint-el') ?? ''];
  const [x, y] = (node.getAttribute('data-cpoint') ?? '').split(',').map(Number);
  if (!isShape(el) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const at = fractionToWorld(el, { x, y });
  return { elementId: el.id, side: 'auto', fixed: { x, y }, x: at.x, y: at.y };
}
