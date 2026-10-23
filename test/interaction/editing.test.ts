import { beforeEach, describe, expect, it } from 'vitest';
import type { ShapeElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { useInteraction } from '@/interaction/store';
import { canPick, descendantsOf, enterGroup, exitAllGroups, exitGroup, pickMembers } from '@/interaction/groups';
import { isContainerShape, setContainer } from '@/interaction/container';
import { setBehavior } from '@/interaction/behavior';
import { deletePoint, insertPoint, movePoint, worldPoints } from '@/interaction/pointEdit';
import { connectedInDirection, traversalUnits, traverse } from '@/interaction/navigation';
import { currentCell, runTableOp, selectCell, styleSelectedCells } from '@/interaction/tableCells';
import { exportDrawio, importDrawio } from '@/io/drawio';

const ed = () => useEditor.getState();
const rect = (x: number, y: number, extra: Partial<ShapeElement> = {}) => ({ ...createShape('rectangle', { x, y, w: 100, h: 60 }), ...extra });

beforeEach(() => {
  ed().newDoc();
  useInteraction.getState().set({ isolation: [], editPointsId: null, activePoint: null, cell: null, editingCell: null, traversing: false });
});

describe('group isolation', () => {
  it('enters nested groups one level at a time and climbs back out', () => {
    const a = rect(0, 0, { groupIds: ['inner', 'outer'] });
    const b = rect(200, 0, { groupIds: ['inner', 'outer'] });
    const c = rect(400, 0, { groupIds: ['outer'] });
    const d = rect(600, 0);
    ed().addElements([a, b, c, d]);
    const doc = ed().doc;
    expect(pickMembers(doc, a.id)).toHaveLength(3);
    ed().select(pickMembers(doc, a.id));
    enterGroup(a.id);
    expect(useInteraction.getState().isolation).toEqual(['outer']);
    expect(ed().selection.sort()).toEqual([a.id, b.id].sort());
    expect(canPick(doc, d.id)).toBe(false);
    expect(pickMembers(doc, c.id)).toEqual([c.id]);
    enterGroup(a.id);
    expect(useInteraction.getState().isolation).toEqual(['outer', 'inner']);
    expect(ed().selection).toEqual([a.id]);
    exitGroup();
    expect(useInteraction.getState().isolation).toEqual(['outer']);
    expect(ed().selection.sort()).toEqual([a.id, b.id].sort());
    exitAllGroups();
    expect(useInteraction.getState().isolation).toEqual([]);
    expect(ed().selection).toHaveLength(3);
  });

  it('select descendants walks containers recursively', () => {
    const outer = createShape('container', { x: 0, y: 0, w: 500, h: 400 });
    const inner = { ...createShape('container', { x: 20, y: 40, w: 300, h: 300 }), containerId: outer.id };
    const leaf = { ...rect(40, 80), containerId: inner.id };
    const other = rect(800, 0);
    ed().addElements([outer, inner, leaf, other]);
    expect(descendantsOf(ed().doc, [outer.id]).sort()).toEqual([inner.id, leaf.id].sort());
  });
});

describe('containers and behaviour', () => {
  it('turns any shape into a container (adopting shapes on it) in one undo step', () => {
    const box = createShape('rectangle', { x: 0, y: 0, w: 400, h: 300 });
    const kid = rect(50, 50);
    const outside = rect(600, 0);
    ed().addElements([box, kid, outside]);
    const steps = ed().past.length;
    setContainer([box.id], true);
    const doc = ed().doc;
    expect(isContainerShape(doc.elements[box.id] as ShapeElement)).toBe(true);
    expect((doc.elements[kid.id] as ShapeElement).containerId).toBe(box.id);
    expect((doc.elements[outside.id] as ShapeElement).containerId).toBeUndefined();
    expect(ed().past.length).toBe(steps + 1);
    setContainer([box.id], false);
    expect((ed().doc.elements[kid.id] as ShapeElement).containerId).toBeUndefined();
    expect((ed().doc.elements[box.id] as ShapeElement).container).toBeUndefined();
  });

  it('non-selectable elements are skipped by select all and picking', () => {
    const a = rect(0, 0);
    const b = rect(200, 0);
    ed().addElements([a, b]);
    setBehavior([b.id], 'selectable', false);
    ed().selectAll();
    expect(ed().selection).toEqual([a.id]);
    expect(canPick(ed().doc, b.id)).toBe(false);
    setBehavior([b.id], 'selectable', true);
    expect(ed().doc.elements[b.id].behavior).toBeUndefined();
  });

  it('round-trips behaviour flags, proportions and the container flag through mxGraph', async () => {
    const a = rect(0, 0, { behavior: { movable: false, deletable: false, selectable: false }, lockAspect: true, container: true });
    const b = rect(300, 0, { locked: true });
    const conn = createConnector({ elementId: a.id, x: 0, y: 0 }, { elementId: b.id, x: 0, y: 0 });
    conn.behavior = { editable: false };
    ed().addElements([a, b, conn]);
    const xml = await exportDrawio(ed().doc);
    expect(xml).toContain('movable=0');
    expect(xml).toContain('aspect=fixed');
    expect(xml).toContain('container=1');
    const doc = await importDrawio(xml);
    const ia = doc.elements[a.id] as ShapeElement;
    expect(ia.behavior).toMatchObject({ movable: false, deletable: false, selectable: false });
    expect(ia.lockAspect).toBe(true);
    expect(ia.container).toBe(true);
    expect(ia.kind).toBe('rectangle');
    expect(doc.elements[b.id].locked).toBe(true);
    expect(doc.elements[conn.id].behavior).toEqual({ editable: false });
  });
});

describe('freehand point editing', () => {
  const stroke = (rotation?: number) => {
    const el = createShape('freehand', { x: 100, y: 100, w: 100, h: 100 });
    el.points = [{ x: 0, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 0 }];
    if (rotation) el.rotation = rotation;
    return el;
  };

  it('moves, inserts and deletes points, refitting the box', () => {
    const el = stroke();
    const moved = { ...el, ...movePoint(el, 2, { x: 300, y: 100 }) } as ShapeElement;
    expect(moved.w).toBe(200);
    expect(worldPoints(moved)[2]).toEqual({ x: 300, y: 100 });
    expect(worldPoints(moved)[0]).toEqual({ x: 100, y: 100 });
    const inserted = { ...el, ...insertPoint(el, 0, { x: 120, y: 150 }) } as ShapeElement;
    expect(inserted.points).toHaveLength(4);
    expect(deletePoint(el, 1)!.points).toHaveLength(2);
    expect(deletePoint({ ...el, points: el.points!.slice(0, 2) }, 0)).toBeNull();
  });

  it('keeps untouched points in place on a rotated stroke', () => {
    const el = stroke(30);
    const before = worldPoints(el);
    const moved = { ...el, ...movePoint(el, 1, { x: before[1].x + 40, y: before[1].y + 60 }) } as ShapeElement;
    const after = worldPoints(moved);
    expect(after[0].x).toBeCloseTo(before[0].x, 6);
    expect(after[0].y).toBeCloseTo(before[0].y, 6);
    expect(after[2].x).toBeCloseTo(before[2].x, 6);
    expect(after[1].x).toBeCloseTo(before[1].x + 40, 6);
    expect(after[1].y).toBeCloseTo(before[1].y + 60, 6);
  });
});

describe('keyboard navigation', () => {
  it('orders shapes in reading order and steps through them with Tab', () => {
    const r2 = rect(0, 200);
    const r1b = rect(300, 10);
    const r1a = rect(0, 0);
    ed().addElements([r2, r1b, r1a]);
    expect(traversalUnits(ed().doc)).toEqual([[r1a.id], [r1b.id], [r2.id]]);
    ed().clearSelection();
    expect(traverse(1)).toBe(true);
    expect(ed().selection).toEqual([r1a.id]);
    expect(useInteraction.getState().traversing).toBe(true);
    traverse(1);
    traverse(1);
    expect(ed().selection).toEqual([r2.id]);
    expect(traverse(1)).toBe(false);
    expect(ed().selection).toEqual([]);
  });

  it('follows connections in a direction', () => {
    const mid = rect(200, 200);
    const right = rect(500, 210);
    const down = rect(200, 500);
    ed().addElements([mid, right, down, createConnector({ elementId: mid.id, x: 0, y: 0 }, { elementId: right.id, x: 0, y: 0 }), createConnector({ elementId: down.id, x: 0, y: 0 }, { elementId: mid.id, x: 0, y: 0 })]);
    const doc = ed().doc;
    expect(connectedInDirection(doc, mid.id, { x: 1, y: 0 })).toBe(right.id);
    expect(connectedInDirection(doc, mid.id, { x: 0, y: 1 })).toBe(down.id);
    expect(connectedInDirection(doc, mid.id, { x: -1, y: 0 })).toBeNull();
  });
});

describe('table cells on the canvas', () => {
  it('inserts relative to the selected cell and styles just that cell', () => {
    const t = createShape('table', { x: 0, y: 0, w: 300, h: 90 });
    t.table = { cols: [100, 100, 100], rows: [30, 30, 30], cells: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']] };
    ed().addElements([t]);
    ed().select([t.id]);
    selectCell(t.id, 1, 1);
    runTableOp('rowAbove');
    let table = (ed().doc.elements[t.id] as ShapeElement).table!;
    expect(table.cells.map((r) => r[0])).toEqual(['a', '', 'd', 'g']);
    expect(currentCell()).toMatchObject({ r: 1, c: 1 });
    runTableOp('colRight');
    table = (ed().doc.elements[t.id] as ShapeElement).table!;
    expect(table.cells[2]).toEqual(['d', 'e', '', 'f']);
    styleSelectedCells({ fill: '#fde68a' });
    table = (ed().doc.elements[t.id] as ShapeElement).table!;
    expect(Object.keys(table.cellStyles ?? {})).toEqual(['1,2']);
  });
});
