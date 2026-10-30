/**
 * Pointer & wheel interaction state machine for the canvas.
 *
 * Gestures ():
 * - pan: Space-drag, middle/right-drag, hand tool, wheel; Ctrl/⌘+wheel or pinch zooms
 * - select: click, Shift-click, marquee (Alt+drag starts a marquee even on a shape)
 * - move: smart guides + grid snap (Alt disables snapping), Ctrl/⌘-drag clones,
 *   container re-parenting
 * - resize: 8 handles (Shift keeps ratio, Alt from center), works on rotated shapes
 * - rotate: rotation handle (Shift snaps to 15°)
 * - connectors: drag from anchor dots or blue quick-connect arrows; click an arrow
 *   to clone & connect; drag endpoints to re-attach; drag segments/waypoints to
 *   reshape (double-click a waypoint removes it); drag the label along the path
 * - Ctrl/⌘-click follows links; double-click blank canvas opens the shape picker
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { AnchorSide, ConnectorElement, DiagramElement, Doc, Endpoint, Rect, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import {
  anchorPoint, center, containsPoint, dist, distToSegment, inflate, intersects, rectFromPoints, rotatePoint,
  rotatedBounds, SIDE_NORMALS, unionRects,
} from '@/lib/geometry';
import { connectorGeometryInDoc, endpointPositions } from '@/lib/connectorGeometry';
import { straightenMove, straightenResize } from '@/assistants/straighten';
import {
  cloneElements, containedShapes, elementBounds, isHidden, isLocked, shapeRect, useEditor, type Guide,
} from '@/store/editor';
import { useUi } from '@/store/ui';
import { buildSnapTargets, snapRect, snapValue, type SnapTargets } from './snapping';
import { presetForTool } from './tools';
import { clientToWorld } from './viewport';
import { followLink } from './links';
import { endpointFromPointMarker, resolveDrop, resolveSelfDrop, useEndpointDrag } from './connectorDrop';
import { moveExtraLabel, openExtraLabelEditorAt } from './ExtraLabelEditor';
import { canDragSegment, dragSegment, segmentAt, segmentCursor, snapSegment } from '@/interaction/segmentDrag';
import { canPick, finishFreehandStroke, handleDoubleClick, isContainerShape, keepsAspect, pickMembers, strokePoint } from '@/interaction/canvasHooks';

const DRAG_THRESHOLD = 3;

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type Drag =
  | { type: 'pan'; client: Vec; cam: { x: number; y: number } }
  | { type: 'marquee'; origin: Vec; base: string[] }
  | {
      type: 'move';
      origin: Vec;
      clickedId: string;
      started: boolean;
      wasSelected: boolean;
      clone: boolean;
      ids: string[];
      start: Map<string, DiagramElement>;
      bounds: Rect;
      targets: SnapTargets;
    }
  | { type: 'resize'; handle: Handle; start: Map<string, ShapeElement>; bounds: Rect; targets: SnapTargets; single: ShapeElement | null }
  | { type: 'rotate'; id: string; start: number; center: Vec; startAngle: number }
  | { type: 'create'; origin: Vec; id: string | null; tool: string; targets: SnapTargets }
  | { type: 'freehand'; points: Vec[] }
  | { type: 'connect'; from: Endpoint; origin: Vec; quick: { side: AnchorSide; shapeId: string } | null; moved: boolean }
  | { type: 'endpoint'; connId: string; end: 'source' | 'target' }
  | { type: 'segment'; connId: string; index: number; base: Vec[]; origin: Vec; horizontal: boolean; mode: 'ortho' | 'insert'; started?: boolean; conn: ConnectorElement }
  | { type: 'waypoint'; connId: string; index: number }
  | { type: 'label'; connId: string; index?: number };

/** How close (screen px) the pointer must be to a connector segment to grab it. */
const SEGMENT_HIT_PX = 7;

/** Resize cursor when hovering a draggable segment of an orthogonal connector. */
function segmentHoverCursor(target: Element, p: Vec): string | null {
  const s = useEditor.getState();
  const id = target.closest('[data-segment]')?.getAttribute('data-conn') ?? target.closest('[data-el]')?.getAttribute('data-el');
  const conn = id ? s.doc.elements[id] : undefined;
  if (!isConnector(conn) || conn.routing !== 'orthogonal' || isLocked(s.doc, conn)) return null;
  const g = connectorGeometryInDoc(conn, s.doc.elements);
  const hit = segmentAt(g.points, p, SEGMENT_HIT_PX / s.camera.z);
  return hit && canDragSegment(conn, g.points, hit.index, s.doc.elements) ? segmentCursor(hit.horizontal) : null;
}

/** After a segment drag: keep only the bends the route really has, so it stays clean when shapes move. */
function tidyRoute(connId: string) {
  const s = useEditor.getState();
  const conn = s.doc.elements[connId];
  if (!isConnector(conn)) return;
  const pts = connectorGeometryInDoc(conn, s.doc.elements).points;
  const inner = pts.slice(1, -1);
  s.updateElements({ [connId]: { waypoints: inner.length ? inner : undefined } });
}

function snapOptions(alt: boolean) {
  const { settings, camera } = useEditor.getState();
  if (alt) return { guides: false, grid: null, threshold: 0 };
  return { guides: settings.guides, grid: settings.snap ? settings.gridSize : null, threshold: 6 / camera.z };
}

/** Topmost visible, unlocked shape under a world point, skipping `exclude`. */
export function shapeAtPoint(doc: Doc, p: Vec, exclude: Set<string> = new Set(), slop = 0): ShapeElement | null {
  for (let i = doc.order.length - 1; i >= 0; i--) {
    const el = doc.elements[doc.order[i]];
    if (!isShape(el) || exclude.has(el.id) || isLocked(doc, el) || isHidden(doc, el)) continue;
    if (el.behavior?.connectable === false) continue;
    const local = rotatePoint(p, center(el), -(el.rotation ?? 0));
    if (containsPoint(inflate(shapeRect(el), slop), local)) return el;
  }
  return null;
}

/** A self-loop drop at `p` back on the shape the other end (`from`, sitting at `fromAt`) is attached to. */
function selfLoopAt(doc: Doc, p: Vec, from: Endpoint, fromAt: Vec, exact: boolean) {
  const shape = from.elementId ? doc.elements[from.elementId] : undefined;
  if (!isShape(shape) || isLocked(doc, shape) || shape.behavior?.connectable === false) return null;
  const z = useEditor.getState().camera.z;
  if (shapeAtPoint(doc, p, new Set(), 6 / z)?.id !== shape.id) return null;
  return resolveSelfDrop(doc, p, shape, fromAt, { z, exact });
}

/** Where a new connector leaves its start, aiming at `toward` (a floating start picks the side facing it). */
function startPoint(doc: Doc, from: Endpoint, toward: Vec): Vec {
  if (!from.elementId || from.fixed || (from.side && from.side !== 'auto')) return { x: from.x, y: from.y };
  return endpointPositions(createConnector(from, { x: toward.x, y: toward.y }), (id) => doc.elements[id]).a.point;
}

/**
 * Where a dragged connector end lands: connection point, exact outline point (Shift), another connector,
 * a point made for it (micro-assistant, off with Alt: `assist.on`), or free.
 */
const dropAt = (doc: Doc, p: Vec, shape: ShapeElement | null, exact: boolean, selfConn?: string, assist?: { other?: Vec; on: boolean }) =>
  resolveDrop(doc, p, shape, { z: useEditor.getState().camera.z, exact, selfConn, other: assist?.other, assist: assist?.on ?? false });

function snapTargetsExcluding(doc: Doc, exclude: Set<string>): SnapTargets {
  const rects: Rect[] = [];
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (isShape(el) && !exclude.has(id) && !isHidden(doc, el)) rects.push(rotatedBounds(el));
  }
  return buildSnapTargets(rects);
}

/** Topmost diagram element under a client point (ignores overlay chrome). */
function elementIdAt(x: number, y: number): string | null {
  for (const node of document.elementsFromPoint(x, y)) {
    const id = node.closest('[data-el]')?.getAttribute('data-el');
    if (id) return id;
  }
  return null;
}

const attr = (target: Element, name: string) => target.closest(`[${name}]`)?.getAttribute(name) ?? null;

/** Clones `shape` one step away in `side` and connects the two (mxGraph blue arrows). */
export function cloneAndConnect(shapeId: string, side: AnchorSide) {
  const s = useEditor.getState();
  const src = s.doc.elements[shapeId];
  if (!isShape(src)) return;
  const gap = 60;
  const n = SIDE_NORMALS[side];
  const [clone] = cloneElements([src], { x: n.x * (src.w + gap), y: n.y * (src.h + gap) }) as ShapeElement[];
  clone.text = src.kind === 'text' ? src.text : '';
  clone.groupIds = [];
  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[side] as AnchorSide;
  const conn = createConnector({ elementId: src.id, side, x: 0, y: 0 }, { elementId: clone.id, side: opposite, x: 0, y: 0 });
  s.beginInteraction();
  s.addElements([clone, conn]);
  s.select([clone.id]);
  s.endInteraction();
}

export function useCanvasInteractions(ref: RefObject<HTMLDivElement | null>) {
  const drag = useRef<Drag | null>(null);
  const spaceDown = useRef(false);
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [freehand, setFreehand] = useState<Vec[] | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string | null>(null);

  // --- wheel: pan, Ctrl/⌘ (and trackpad pinch) zooms around the cursor -----
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = useEditor.getState();
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const factor = Math.min(1.25, Math.max(0.8, Math.exp(-e.deltaY * scale * 0.008)));
        s.zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, s.camera.z * factor);
      } else {
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
        s.panBy(-dx * scale, -dy * scale);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);

  // --- space-to-pan ----------------------------------------------------------
  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]');
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e) && !e.repeat) {
        spaceDown.current = true;
        setSpaceHeld(true);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const s = useEditor.getState();
      const ui = useUi.getState();
      if (ui.contextMenu || ui.shapePicker) ui.set({ contextMenu: null, shapePicker: null });
      const target = e.target as Element;
      if (target.closest('[data-text-editor]')) return;
      // Commit any in-progress text edit (the editor's blur also handles this).
      if (s.editingId) (document.activeElement as HTMLElement | null)?.blur();
      const p = clientToWorld(e.clientX, e.clientY);

      // Right button: pan on drag (context menu fires separately on release without movement).
      if (e.button === 2) {
        rightDragged = false;
        ref.current?.setPointerCapture(e.pointerId);
        drag.current = { type: 'pan', client: { x: e.clientX, y: e.clientY }, cam: { x: s.camera.x, y: s.camera.y } };
        return;
      }
      ref.current?.setPointerCapture(e.pointerId);

      if (e.button === 1 || spaceDown.current || s.tool === 'hand') {
        drag.current = { type: 'pan', client: { x: e.clientX, y: e.clientY }, cam: { x: s.camera.x, y: s.camera.y } };
        setPanning(true);
        return;
      }

      if (s.tool === 'freehand') {
        drag.current = { type: 'freehand', points: [strokePoint(p, e)] };
        setFreehand([p]);
        return;
      }

      const preset = presetForTool(s.tool);
      if (preset) {
        const o = snapOptions(e.altKey);
        drag.current = {
          type: 'create',
          origin: { x: snapValue(p.x, 'x', { xs: [], ys: [] }, o, [p.y, p.y]).v, y: snapValue(p.y, 'y', { xs: [], ys: [] }, o, [p.x, p.x]).v },
          id: null,
          tool: s.tool,
          targets: snapTargetsExcluding(s.doc, new Set()),
        };
        return;
      }

      // Collapse/expand toggle on containers.
      const collapse = attr(target, 'data-collapse');
      if (collapse) {
        s.toggleCollapse(collapse);
        return;
      }

      // Quick-connect arrows: click clones & connects, drag draws a connector.
      const quickSide = attr(target, 'data-quick') as AnchorSide | null;
      const quickEl = attr(target, 'data-quick-el');
      if (quickSide && quickEl) {
        const shape = s.doc.elements[quickEl] as ShapeElement;
        const from: Endpoint = { elementId: quickEl, side: quickSide, ...rotatePoint(anchorPoint(shapeRect(shape), quickSide), center(shape), shape.rotation ?? 0) };
        drag.current = { type: 'connect', from, origin: p, quick: { side: quickSide, shapeId: quickEl }, moved: false };
        return;
      }

      const anchor = target.closest('[data-anchor]');
      const pointStart = endpointFromPointMarker(target, s.doc);
      if (anchor || pointStart || s.tool === 'connector') {
        const elId = anchor?.getAttribute('data-anchor-el') ?? elementIdAt(e.clientX, e.clientY);
        const shape = elId ? s.doc.elements[elId] : undefined;
        const side = anchor?.getAttribute('data-anchor') as AnchorSide | null;
        // Connection-point marker → fixed start; on a connector → start on that edge; else free.
        const from: Endpoint = pointStart ?? (isShape(shape)
          ? { elementId: shape.id, side: side ?? 'auto', ...(side ? rotatePoint(anchorPoint(shapeRect(shape), side), center(shape), shape.rotation ?? 0) : p) }
          : dropAt(s.doc, p, null, false).ep);
        drag.current = { type: 'connect', from, origin: p, quick: null, moved: false };
        s.beginInteraction();
        useEditor.setState({ connectDraft: { from: { x: from.x, y: from.y }, to: p, targetId: null } });
        return;
      }

      if (attr(target, 'data-rotate')) {
        const id = s.selection[0];
        const el = s.doc.elements[id];
        if (isShape(el)) {
          s.beginInteraction();
          const c = center(el);
          drag.current = { type: 'rotate', id, start: el.rotation ?? 0, center: c, startAngle: Math.atan2(p.y - c.y, p.x - c.x) };
        }
        return;
      }

      const handle = attr(target, 'data-handle') as Handle | null;
      if (handle) {
        const shapes = s.selection.map((id) => s.doc.elements[id]).filter(isShape).filter((el) => !isLocked(s.doc, el) && el.behavior?.resizable !== false);
        if (shapes.length) {
          s.beginInteraction();
          const single = shapes.length === 1 && shapes[0].rotation ? shapes[0] : null;
          drag.current = {
            type: 'resize',
            handle,
            start: new Map(shapes.map((sh) => [sh.id, sh])),
            bounds: single ? shapeRect(single) : unionRects(shapes.map((sh) => rotatedBounds(sh)))!,
            targets: snapTargetsExcluding(s.doc, new Set(shapes.map((sh) => sh.id))),
            single,
          };
        }
        return;
      }

      const endpoint = target.closest('[data-endpoint]');
      if (endpoint) {
        s.beginInteraction();
        drag.current = { type: 'endpoint', connId: endpoint.getAttribute('data-endpoint-el')!, end: endpoint.getAttribute('data-endpoint') as 'source' | 'target' };
        return;
      }

      const waypoint = target.closest('[data-waypoint]');
      if (waypoint) {
        s.beginInteraction();
        drag.current = { type: 'waypoint', connId: waypoint.getAttribute('data-conn')!, index: Number(waypoint.getAttribute('data-waypoint')) };
        return;
      }

      const segment = target.closest('[data-segment]');
      if (segment) {
        const connId = segment.getAttribute('data-conn')!;
        const conn = s.doc.elements[connId] as ConnectorElement;
        const g = connectorGeometryInDoc(conn, s.doc.elements);
        const index = Number(segment.getAttribute('data-segment'));
        s.beginInteraction();
        if (conn.routing === 'straight' || conn.routing === 'curved') {
          // Insert a new waypoint between the existing points.
          const wps = conn.waypoints ?? [];
          const next = [...wps];
          next.splice(index, 0, p);
          s.updateElements({ [connId]: { waypoints: next } });
          drag.current = { type: 'waypoint', connId, index };
        } else {
          const a = g.points[index];
          const b = g.points[index + 1];
          drag.current = { type: 'segment', connId, index, base: g.points, origin: p, horizontal: Math.abs(a.y - b.y) < 0.5, mode: 'ortho', conn };
        }
        return;
      }

      if (target.closest('[data-label-handle]')) {
        s.beginInteraction();
        const lh = target.closest('[data-label-handle]')!;
        const index = lh.getAttribute('data-label-index');
        drag.current = { type: 'label', connId: lh.getAttribute('data-label-handle')!, index: index !== null ? Number(index) : undefined };
        return;
      }

      const elId = target.closest('[data-el]')?.getAttribute('data-el') ?? null;
      const el = elId ? s.doc.elements[elId] : undefined;

      // Ctrl/⌘-click on a linked element follows the link.
      if (el?.link && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        followLink(el.link);
        drag.current = null;
        return;
      }

      // Pressing a segment of an orthogonal connector drags that segment sideways.
      if (el && isConnector(el) && !isLocked(s.doc, el) && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const g = connectorGeometryInDoc(el, s.doc.elements);
        const hit = segmentAt(g.points, p, SEGMENT_HIT_PX / s.camera.z);
        if (hit && canDragSegment(el, g.points, hit.index, s.doc.elements)) {
          if (s.selection.length !== 1 || s.selection[0] !== el.id) s.select([el.id]);
          s.beginInteraction();
          drag.current = { type: 'segment', connId: el.id, index: hit.index, base: g.points, origin: p, horizontal: hit.horizontal, mode: 'ortho', conn: el };
          return;
        }
      }

      // Alt+drag always starts a marquee, even on top of a shape.
      if (el && !isLocked(s.doc, el) && !e.altKey) {
        const ids = e.ctrlKey || e.metaKey ? [el.id] : pickMembers(s.doc, el.id);
        const wasSelected = ids.every((id) => s.selection.includes(id));
        if (e.shiftKey) s.select(ids, true);
        else if (!wasSelected) s.select(ids);
        drag.current = {
          type: 'move',
          origin: p,
          clickedId: el.id,
          started: false,
          wasSelected,
          clone: e.ctrlKey || e.metaKey,
          ids: [],
          start: new Map(),
          bounds: { x: 0, y: 0, w: 0, h: 0 },
          targets: { xs: [], ys: [] },
        };
        return;
      }

      // Empty canvas (or Alt): marquee.
      const base = e.shiftKey ? s.selection : [];
      if (!e.shiftKey) s.clearSelection();
      drag.current = { type: 'marquee', origin: p, base };
    },
    [ref],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    const s = useEditor.getState();
    const p = clientToWorld(e.clientX, e.clientY);

    if (!d) {
      // Hover: reveal anchor dots / quick-connect arrows on the shape under the cursor.
      if (s.tool === 'select' || s.tool === 'connector') {
        const t = e.target as Element;
        // On a resize edge or corner the shape stays hovered, so its connection points stay
        // within reach on top of the edge (they start a connector; the rest of the edge resizes).
        const onFrame = !!t.closest('[data-handle]');
        const id = attr(t, 'data-anchor-el') ?? attr(t, 'data-quick-el') ?? t.closest('[data-el]')?.getAttribute('data-el') ?? (onFrame ? (s.hoverId ?? (s.selection.length === 1 ? s.selection[0] : null)) : null);
        const hover = id && isShape(s.doc.elements[id]) ? id : null;
        if (hover !== s.hoverId) useEditor.setState({ hoverId: hover });
        setHoverCursor(s.tool === 'select' ? segmentHoverCursor(t, p) : null);
      }
      return;
    }

    switch (d.type) {
      case 'pan': {
        if (Math.hypot(e.clientX - d.client.x, e.clientY - d.client.y) > 3) {
          rightDragged = true;
          setPanning(true);
        }
        s.setCamera({ ...s.camera, x: d.cam.x + e.clientX - d.client.x, y: d.cam.y + e.clientY - d.client.y });
        return;
      }
      case 'freehand': {
        const last = d.points[d.points.length - 1];
        if (dist(last, p) * s.camera.z < 2) return;
        d.points.push(strokePoint(p, e));
        setFreehand([...d.points]);
        return;
      }
      case 'marquee': {
        const r = rectFromPoints(d.origin, p);
        const hits = s.doc.order.filter((id) => {
          const el = s.doc.elements[id];
          if (isLocked(s.doc, el) || isHidden(s.doc, el) || !canPick(s.doc, id)) return false;
          const b = elementBounds(el, s.doc);
          // Shapes must be fully enclosed; connectors just touched.
          return isShape(el) ? r.x <= b.x && r.y <= b.y && r.x + r.w >= b.x + b.w && r.y + r.h >= b.y + b.h : intersects(r, b);
        });
        const withGroups = new Set(d.base);
        for (const id of hits) for (const m of pickMembers(s.doc, id)) withGroups.add(m);
        useEditor.setState({ marquee: r, selection: [...withGroups] });
        return;
      }
      case 'move': {
        if (!d.started) {
          if (dist(d.origin, p) * s.camera.z < DRAG_THRESHOLD) return;
          d.started = true;
          s.beginInteraction();
          let sel = s.selection.filter((id) => !isLocked(s.doc, s.doc.elements[id]) && s.doc.elements[id]?.behavior?.movable !== false);
          if (d.clone) {
            // Ctrl/⌘-drag duplicates, leaving the originals in place.
            const inside = containedShapes(s.doc, sel);
            const originals = s.doc.order.filter((id) => sel.includes(id) || inside.includes(id));
            const clones = cloneElements(originals.map((id) => s.doc.elements[id]), { x: 0, y: 0 });
            s.addElements(clones);
            sel = useEditor.getState().selection;
          }
          const doc = useEditor.getState().doc;
          const ids = [...new Set([...sel, ...containedShapes(doc, sel)])];
          d.ids = ids;
          d.start = new Map(ids.map((id) => [id, doc.elements[id]]));
          const shapes = sel.map((id) => doc.elements[id]).filter(isShape);
          d.bounds = unionRects(shapes.map((sh) => rotatedBounds(sh))) ?? { x: p.x, y: p.y, w: 0, h: 0 };
          d.targets = snapTargetsExcluding(doc, new Set(ids));
        }
        let dx = p.x - d.origin.x;
        let dy = p.y - d.origin.y;
        if (e.shiftKey) {
          // Constrain to the dominant axis.
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        let guides: Guide[] = [];
        if (d.bounds.w || d.bounds.h) {
          const snap = snapRect({ ...d.bounds, x: d.bounds.x + dx, y: d.bounds.y + dy }, d.targets, snapOptions(e.altKey));
          dx += snap.dx;
          dy += snap.dy;
          guides = snap.guides;
        }
        // Micro-assistant: a nearly straight connector pulls the shapes the rest of the way (wins over other snaps).
        if (!e.altKey) {
          const pull = straightenMove(s.doc, d.start, dx, dy, s.camera.z);
          if (pull.dx) guides = guides.filter((g) => g.axis !== 'x');
          if (pull.dy) guides = guides.filter((g) => g.axis !== 'y');
          dx += pull.dx;
          dy += pull.dy;
          guides = [...guides, ...pull.guides];
        }
        const patches: Record<string, Partial<DiagramElement>> = {};
        for (const [id, el] of d.start) {
          if (isShape(el)) patches[id] = { x: el.x + dx, y: el.y + dy };
          else if (isConnector(el)) {
            patches[id] = {
              source: el.source.elementId ? el.source : { ...el.source, x: el.source.x + dx, y: el.source.y + dy },
              target: el.target.elementId ? el.target : { ...el.target, x: el.target.x + dx, y: el.target.y + dy },
              waypoints: el.waypoints?.map((w) => ({ x: w.x + dx, y: w.y + dy })),
            } as Partial<ConnectorElement>;
          }
        }
        s.updateElements(patches);
        const doc = useEditor.getState().doc;
        const moved = { ...d.bounds, x: d.bounds.x + dx, y: d.bounds.y + dy };
        const drop = findContainer(doc, { x: moved.x + moved.w / 2, y: moved.y + moved.h / 2 }, new Set(d.ids));
        useEditor.setState({ guides, dropTargetId: drop?.id ?? null });
        return;
      }
      case 'rotate': {
        let deg = d.start + ((Math.atan2(p.y - d.center.y, p.x - d.center.x) - d.startAngle) * 180) / Math.PI;
        deg = ((deg % 360) + 360) % 360;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        else if (Math.abs(deg - Math.round(deg / 90) * 90) < 3) deg = Math.round(deg / 90) * 90; // gentle snap to right angles
        s.updateElements({ [d.id]: { rotation: deg % 360 || undefined } });
        return;
      }
      case 'resize': {
        resizeTo(d, p, e);
        return;
      }
      case 'create': {
        const o = snapOptions(e.altKey);
        const end = {
          x: snapValue(p.x, 'x', d.targets, o, [d.origin.y, p.y]).v,
          y: snapValue(p.y, 'y', d.targets, o, [d.origin.x, p.x]).v,
        };
        if (!d.id && dist(d.origin, p) * s.camera.z < DRAG_THRESHOLD) return;
        let r = rectFromPoints(d.origin, end);
        if (e.shiftKey) {
          const m = Math.max(r.w, r.h);
          r = { x: end.x < d.origin.x ? d.origin.x - m : d.origin.x, y: end.y < d.origin.y ? d.origin.y - m : d.origin.y, w: m, h: m };
        }
        r = { ...r, w: Math.max(r.w, 8), h: Math.max(r.h, 8) };
        if (!d.id) {
          const preset = presetForTool(d.tool)!;
          s.beginInteraction();
          const el = createShape(preset.kind, r, preset.style, preset.text ?? '');
          d.id = el.id;
          s.addElements([el]);
        } else {
          s.updateElements({ [d.id]: r });
        }
        return;
      }
      case 'connect': {
        if (!d.moved && dist(d.origin, p) * s.camera.z < DRAG_THRESHOLD) return;
        if (!d.moved && d.quick) {
          s.beginInteraction();
          useEditor.setState({ connectDraft: { from: { x: d.from.x, y: d.from.y }, to: p, targetId: null } });
        }
        d.moved = true;
        const exclude = new Set<string>(d.from.elementId ? [d.from.elementId] : []);
        const target = shapeAtPoint(s.doc, p, exclude, 6 / s.camera.z);
        const fromEdge = isConnector(s.doc.elements[d.from.elementId ?? '']) ? d.from.elementId : undefined;
        let drop = dropAt(s.doc, p, target, e.shiftKey, fromEdge, { other: startPoint(s.doc, d.from, p), on: !e.altKey });
        // Back on the start shape, at a connection point or its outline: a self-loop.
        const self = target ? null : selfLoopAt(s.doc, p, d.from, { x: d.from.x, y: d.from.y }, e.shiftKey);
        if (self) drop = self;
        useEditor.setState({
          connectDraft: { from: { x: d.from.x, y: d.from.y }, to: drop.preview, targetId: drop.targetId, source: d.from, target: drop.ep, made: drop.made },
          hoverId: target?.id ?? (self ? self.targetId : null),
        });
        return;
      }
      case 'endpoint': {
        const conn = s.doc.elements[d.connId];
        if (!isConnector(conn)) return;
        const other = d.end === 'source' ? conn.target : conn.source;
        const exclude = new Set<string>(other.elementId ? [other.elementId] : []);
        const target = shapeAtPoint(s.doc, p, exclude, 6 / s.camera.z);
        const ends = endpointPositions(conn, (id) => s.doc.elements[id]);
        const otherAt = (d.end === 'source' ? ends.b : ends.a).point;
        const self = target ? null : selfLoopAt(s.doc, p, other, otherAt, e.shiftKey);
        const ep: Endpoint = self ? self.ep : dropAt(s.doc, p, target, e.shiftKey, d.connId, { other: otherAt, on: !e.altKey }).ep;
        s.updateElements({ [d.connId]: { [d.end]: ep } as Partial<ConnectorElement> });
        useEditor.setState({ hoverId: target?.id ?? (self ? self.targetId : null) });
        useEndpointDrag.setState({ active: true });
        return;
      }
      case 'waypoint': {
        const conn = s.doc.elements[d.connId];
        if (!isConnector(conn)) return;
        const o = snapOptions(e.altKey);
        const q = { x: o.grid ? Math.round(p.x / o.grid) * o.grid : p.x, y: o.grid ? Math.round(p.y / o.grid) * o.grid : p.y };
        const wps = [...(conn.waypoints ?? [])];
        wps[d.index] = q;
        s.updateElements({ [d.connId]: { waypoints: wps } });
        return;
      }
      case 'segment': {
        if (!d.started) {
          if (dist(d.origin, p) * s.camera.z < DRAG_THRESHOLD) return;
          d.started = true;
        }
        if (!isConnector(s.doc.elements[d.connId])) return;
        // Always from the connector as the drag found it: its ends may change during the drag and change back.
        const conn = d.conn;
        const o = snapOptions(e.altKey);
        const axis = d.horizontal ? 'y' : 'x';
        let at = d.base[d.index][axis] + (p[axis] - d.origin[axis]);
        // Line up with the ends, the shapes' centers or a parallel segment first; otherwise the grid.
        const smart = o.threshold ? snapSegment(conn, d.base, d.index, d.horizontal, at, s.doc.elements, o.threshold) : { at };
        if (smart.guide) at = smart.at;
        else if (o.grid) at = Math.round(at / o.grid) * o.grid;
        const moved = dragSegment(conn, d.base, d.index, d.horizontal, at, s.doc.elements);
        if (!moved) return;
        s.updateElements({ [d.connId]: moved.patch });
        useEditor.setState({ guides: smart.guide && o.guides && moved.at === smart.at ? [smart.guide] : [] });
        return;
      }
      case 'label': {
        const conn = s.doc.elements[d.connId];
        if (!isConnector(conn)) return;
        if (d.index !== undefined) return moveExtraLabel(conn, d.index, p);
        const g = connectorGeometryInDoc({ ...conn, labelT: 0.5, labelOffset: 0 }, s.doc.elements);
        const { t, offset } = projectOnPolyline(g.samples, p);
        s.updateElements({ [d.connId]: { labelT: t, labelOffset: Math.abs(offset) < 4 ? 0 : offset } });
        return;
      }
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      setPanning(false);
      ref.current?.releasePointerCapture?.(e.pointerId);
      if (!d) return;
      const s = useEditor.getState();

      switch (d.type) {
        case 'pan':
          return;
        case 'freehand': {
          setFreehand(null);
          finishFreehandStroke(d.points);
          return;
        }
        case 'marquee':
          useEditor.setState({ marquee: null });
          return;
        case 'move': {
          if (!d.started) {
            // Plain click on an already-selected item narrows the selection to it.
            if (d.wasSelected && !e.shiftKey) {
              const ids = e.ctrlKey || e.metaKey ? [d.clickedId] : pickMembers(s.doc, d.clickedId);
              if (s.selection.length !== ids.length) s.select(ids);
            }
            return;
          }
          reparent(d.ids, s.dropTargetId);
          useEditor.setState({ guides: [], dropTargetId: null });
          s.endInteraction();
          return;
        }
        case 'segment':
          if (d.started) tidyRoute(d.connId);
          useEditor.setState({ guides: [] });
          s.endInteraction();
          return;
        case 'resize':
        case 'rotate':
        case 'waypoint':
        case 'label':
          useEditor.setState({ guides: [] });
          s.endInteraction();
          return;
        case 'create': {
          let id = d.id;
          if (!id) {
            s.beginInteraction();
            const preset = presetForTool(d.tool)!;
            const el = createShape(preset.kind, { x: d.origin.x - preset.w / 2, y: d.origin.y - preset.h / 2, w: preset.w, h: preset.h }, preset.style, preset.text ?? '');
            s.addElements([el]);
            id = el.id;
          }
          const doc = useEditor.getState().doc;
          reparent([id], findContainer(doc, center(doc.elements[id] as ShapeElement), new Set([id]))?.id ?? null);
          s.endInteraction();
          s.setTool('select');
          s.select([id]);
          const kind = (useEditor.getState().doc.elements[id] as ShapeElement).kind;
          if (kind === 'text' || kind === 'sticky') s.setEditing(id);
          return;
        }
        case 'connect': {
          // A click (no drag) on a quick-connect arrow clones & connects.
          if (d.quick && !d.moved) {
            cloneAndConnect(d.quick.shapeId, d.quick.side);
            return;
          }
          const draft = s.connectDraft;
          useEditor.setState({ connectDraft: null });
          if (!draft || (dist(draft.from, draft.to) * s.camera.z < 8 && !draft.targetId)) {
            s.endInteraction();
            return;
          }
          const p = clientToWorld(e.clientX, e.clientY);
          const target = draft.targetId ? s.doc.elements[draft.targetId] : null;
          // The end the preview showed (a self-loop included); recomputed only for a drag that never moved.
          const to: Endpoint = draft.target ?? (target ? dropAt(s.doc, p, isShape(target) ? target : null, e.shiftKey, undefined, { on: !e.altKey }).ep : { x: draft.to.x, y: draft.to.y });
          const conn = createConnector(d.from, to);
          const pos = endpointPositions(conn, (id) => s.doc.elements[id]);
          conn.source = { ...conn.source, x: pos.a.point.x, y: pos.a.point.y };
          conn.target = { ...conn.target, x: pos.b.point.x, y: pos.b.point.y };
          s.addElements([conn]);
          s.endInteraction();
          if (s.tool === 'connector') s.setTool('select');
          // Dropped on blank canvas: offer the shape picker to complete the connection.
          if (!target) {
            useUi.getState().set({ shapePicker: { clientX: e.clientX, clientY: e.clientY, worldX: p.x, worldY: p.y, connectFrom: conn.id } });
          }
          return;
        }
        case 'endpoint': {
          // Bake the current position so the endpoint stays put if later detached.
          const conn = s.doc.elements[d.connId];
          if (isConnector(conn)) {
            const pos = endpointPositions(conn, (id) => s.doc.elements[id]);
            const end = d.end === 'source' ? pos.a.point : pos.b.point;
            s.updateElements({ [d.connId]: { [d.end]: { ...conn[d.end], x: end.x, y: end.y } } as Partial<ConnectorElement> });
          }
          useEditor.setState({ hoverId: null });
          useEndpointDrag.setState({ active: false });
          s.endInteraction();
          return;
        }
      }
    },
    [ref],
  );

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const s = useEditor.getState();
    const target = e.target as Element;
    if (target.closest('[data-text-editor]')) return;
    // Double-click a waypoint removes it.
    const wp = target.closest('[data-waypoint]');
    if (wp) {
      const connId = wp.getAttribute('data-conn')!;
      const conn = s.doc.elements[connId] as ConnectorElement;
      const idx = Number(wp.getAttribute('data-waypoint'));
      const wps = (conn.waypoints ?? []).filter((_, i) => i !== idx);
      s.updateElements({ [connId]: { waypoints: wps.length ? wps : undefined } });
      return;
    }
    // Double-click an extra connector label edits it.
    if (openExtraLabelEditorAt(e.clientX, e.clientY)) return;
    // Pointer capture retargets dblclick to the canvas, so hit-test the point instead.
    const elId = elementIdAt(e.clientX, e.clientY);
    const el = elId ? s.doc.elements[elId] : undefined;
    if (el && !isLocked(s.doc, el)) {
      if (handleDoubleClick(el, clientToWorld(e.clientX, e.clientY))) return;
      // First double-click inside a selected group drills into it.
      if (el.groupIds.length && s.selection.length > 1 && s.selection.includes(el.id)) {
        s.select([el.id]);
        return;
      }
      if (el.behavior?.editable === false) return;
      s.select([el.id]);
      s.setEditing(el.id);
      return;
    }
    if (!el) {
      const p = clientToWorld(e.clientX, e.clientY);
      useUi.getState().set({ shapePicker: { clientX: e.clientX, clientY: e.clientY, worldX: p.x, worldY: p.y } });
    }
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // A right-drag pans; only a still right-click opens the menu.
    if (rightDragged) {
      rightDragged = false;
      return;
    }
    const s = useEditor.getState();
    const elId = elementIdAt(e.clientX, e.clientY);
    if (elId && !s.selection.includes(elId)) s.select(pickMembers(s.doc, elId));
    if (!elId) s.clearSelection();
    const w = clientToWorld(e.clientX, e.clientY);
    useUi.getState().set({ contextMenu: { x: e.clientX, y: e.clientY } });
    lastContextWorld = w;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onDoubleClick, onContextMenu, panning, spaceHeld, freehand, hoverCursor };
}

/** World point of the last context menu (for "Paste here"). */
export let lastContextWorld: Vec | null = null;
let rightDragged = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resizeTo(d: Extract<Drag, { type: 'resize' }>, pw: Vec, e: React.PointerEvent) {
  const s = useEditor.getState();
  const o = snapOptions(false);
  // Rotated single shape: work in its local frame.
  const rot = d.single?.rotation ?? 0;
  const c0 = d.single ? center(d.single) : null;
  const p = d.single && c0 ? rotatePoint(pw, c0, -rot) : pw;
  const b = d.bounds;
  let x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
  const guides: Guide[] = [];
  const h = d.handle;
  const snapX = (v: number) => {
    if (d.single) return o.grid ? Math.round(v / o.grid) * o.grid : v;
    const r = snapValue(v, 'x', d.targets, o, [y1, y2]);
    if (r.guide) guides.push(r.guide);
    return r.v;
  };
  const snapY = (v: number) => {
    if (d.single) return o.grid ? Math.round(v / o.grid) * o.grid : v;
    const r = snapValue(v, 'y', d.targets, o, [x1, x2]);
    if (r.guide) guides.push(r.guide);
    return r.v;
  };
  if (h.includes('w')) x1 = snapX(p.x);
  if (h.includes('e')) x2 = snapX(p.x);
  if (h.includes('n')) y1 = snapY(p.y);
  if (h.includes('s')) y2 = snapY(p.y);
  if (e.altKey) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    if (h.includes('w')) x2 = cx + (cx - x1);
    if (h.includes('e')) x1 = cx - (x2 - cx);
    if (h.includes('n')) y2 = cy + (cy - y1);
    if (h.includes('s')) y1 = cy - (y2 - cy);
  }
  let nw = Math.max(4, Math.abs(x2 - x1));
  let nh = Math.max(4, Math.abs(y2 - y1));
  if ((e.shiftKey || keepsAspect(d.start.values())) && b.w && b.h) {
    const ratio = b.w / b.h;
    if (h === 'n' || h === 's') nw = nh * ratio;
    else if (h === 'e' || h === 'w') nh = nw / ratio;
    else if (nw / nh > ratio) nh = nw / ratio;
    else nw = nh * ratio;
    if (h.includes('w')) x1 = x2 - nw;
    if (h.includes('n')) y1 = y2 - nh;
  }
  let nb = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: nw, h: nh };
  // Micro-assistant: the dragged edge stops where a nearly straight connector on the shape runs straight.
  const only = d.start.size === 1 ? [...d.start.values()][0] : null;
  if (only && !d.single && !e.altKey) {
    const pull = straightenResize(s.doc, only, nb, h, s.camera.z);
    nb = pull.rect;
    guides.push(...pull.guides);
  }
  if (d.single && c0) {
    // Keep the opposite edge fixed in world space: the new local box's center
    // moved, so rotate its offset back into world coordinates.
    const localCenter = { x: nb.x + nb.w / 2, y: nb.y + nb.h / 2 };
    const worldCenter = rotatePoint(localCenter, c0, rot);
    s.updateElements({ [d.single.id]: { x: worldCenter.x - nb.w / 2, y: worldCenter.y - nb.h / 2, w: nb.w, h: nb.h } });
    useEditor.setState({ guides: [] });
    return;
  }
  const sx = b.w ? nb.w / b.w : 1;
  const sy = b.h ? nb.h / b.h : 1;
  const patches: Record<string, Partial<ShapeElement>> = {};
  for (const [id, el] of d.start) {
    patches[id] = {
      x: nb.x + (el.x - b.x) * sx,
      y: nb.y + (el.y - b.y) * sy,
      w: Math.max(4, el.w * sx),
      h: Math.max(4, el.h * sy),
    };
  }
  s.updateElements(patches);
  useEditor.setState({ guides });
}

/** Closest point on a polyline: fraction along its length and signed perpendicular offset. */
function projectOnPolyline(pts: Vec[], p: Vec): { t: number; offset: number } {
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    lens.push(dist(pts[i - 1], pts[i]));
    total += lens[i - 1];
  }
  let best = { d: Infinity, along: 0, offset: 0 };
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const l = lens[i - 1] || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (l * l)));
    const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const dd = distToSegment(p, a, b);
    if (dd < best.d) {
      const cross = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / l;
      best = { d: dd, along: acc + t * l, offset: dist(q, p) * Math.sign(cross) };
    }
    acc += l;
  }
  return { t: total ? best.along / total : 0.5, offset: best.offset };
}

/** Topmost container whose bounds contain `p`. */
function findContainer(doc: Doc, p: Vec, exclude: Set<string>): ShapeElement | null {
  for (let i = doc.order.length - 1; i >= 0; i--) {
    const el = doc.elements[doc.order[i]];
    if (isShape(el) && !exclude.has(el.id) && !el.collapsed && isContainerShape(el) && !isHidden(doc, el) && containsPoint(shapeRect(el), p)) return el;
  }
  return null;
}

/**
 * After a move, moved top-level shapes join the container they were dropped
 * into (or leave theirs), and are lifted above it in z-order.
 */
function reparent(ids: string[], containerId: string | null) {
  const s = useEditor.getState();
  const doc = s.doc;
  const idSet = new Set(ids);
  const patches: Record<string, Partial<ShapeElement>> = {};
  let order = doc.order;
  for (const id of ids) {
    const el = doc.elements[id];
    // Shapes that moved because their container moved keep their parent.
    if (!isShape(el) || (el.containerId && idSet.has(el.containerId))) continue;
    if (el.id === containerId) continue;
    const next = containerId ?? undefined;
    if (el.containerId !== next) patches[id] = { containerId: next };
    if (next) {
      const ci = order.indexOf(next);
      const si = order.indexOf(id);
      if (si < ci) {
        order = order.filter((o) => o !== id);
        order.splice(order.indexOf(next) + 1, 0, id);
      }
    }
  }
  if (Object.keys(patches).length) s.updateElements(patches);
  if (order !== doc.order) s.setDoc({ ...useEditor.getState().doc, order });
}
