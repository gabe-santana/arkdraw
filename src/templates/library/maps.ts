import type { ElementStyle, ShapeElement } from '@/model/types';
import { Builder, MUTED, grid, presetStyle } from '../kit';
import type { Template } from '../types';

type Room = { el: ShapeElement; put: (kind: string, rx: number, ry: number, w: number, h: number, opts?: { rotation?: number; flipH?: boolean; flipV?: boolean; style?: Partial<ElementStyle>; text?: string }) => ShapeElement };

/** Rooms are containers; furniture is placed in room-relative coordinates. */
function room(b: Builder, name: string, x: number, y: number, w: number, h: number, fill = '#ffffff'): Room {
  const el = b.shape('floor.room', { x, y, w, h }, { ...presetStyle('floor.room'), fill, strokeWidth: 6, stroke: '#334155', fontSize: 13 }, name);
  return {
    el,
    put: (kind, rx, ry, pw, ph, o = {}) =>
      b.shape(kind, { x: x + rx, y: y + ry, w: pw, h: ph }, { ...presetStyle(kind), ...(o.style ?? {}) }, o.text ?? '', { container: el, rotation: o.rotation, flipH: o.flipH, flipV: o.flipV }),
  };
}

function apartment() {
  const b = new Builder();
  b.title('Apartment floor plan', 0, 0, 760, '2 bedrooms · 1 bathroom · approx. 72 m²');
  const oy = 90;
  const living = room(b, 'Living room', 0, oy, 460, 320, '#fbfaf7');
  living.put('floor.sofa', 40, 210, 200, 84);
  living.put('floor.armchair', 270, 214, 80, 80);
  living.put('floor.tableRound', 110, 96, 96, 96);
  living.put('floor.plant', 390, 30, 46, 46);
  living.put('floor.window', 140, -6, 160, 12);
  living.put('floor.window', -6, 110, 12, 120, { style: {} });
  const kitchen = room(b, 'Kitchen', 460, oy, 300, 220, '#f8fafc');
  kitchen.put('floor.counterSink', 20, 44, 160, 56);
  kitchen.put('floor.stove', 190, 44, 56, 56);
  kitchen.put('floor.fridge', 30, 140, 64, 64);
  kitchen.put('floor.table', 140, 120, 130, 90);
  kitchen.put('floor.window', 300 - 140, -6, 110, 12);
  const hall = room(b, 'Hall', 460, oy + 220, 300, 100, '#f8fafc');
  hall.put('floor.door', 210, 10, 80, 80, { flipH: true });
  const bed = room(b, 'Bedroom', 0, oy + 320, 340, 280, '#f7f9fc');
  bed.put('floor.bedDouble', 30, 70, 150, 180);
  bed.put('floor.desk', 196, 150, 120, 100);
  bed.put('floor.plant', 276, 98, 44, 44);
  bed.put('floor.door', 250, 4, 80, 80, { flipV: true });
  bed.put('floor.window', 100, 274, 140, 12);
  const bath = room(b, 'Bath', 340, oy + 320, 200, 280, '#eef6fb');
  bath.put('floor.bathtub', 16, 92, 70, 170);
  bath.put('floor.toilet', 130, 200, 40, 64);
  bath.put('floor.sink', 120, 120, 56, 44);
  bath.put('floor.door', 12, 4, 80, 80, { flipV: true, flipH: true });
  const kid = room(b, 'Bedroom 2', 540, oy + 320, 220, 280, '#f7f9fc');
  kid.put('floor.bedSingle', 20, 80, 90, 180);
  kid.put('floor.desk', 124, 180, 84, 80);
  kid.put('floor.door', 130, 4, 80, 80, { flipV: true });
  kid.put('floor.window', 50, 274, 120, 12);
  b.text('Scale 1:100 · walls 15 cm', { x: 0, y: oy + 616, w: 760, h: 22 }, { fontSize: 12, textColor: MUTED, textAlign: 'left' });
  return [b.page('Floor plan')];
}

function office() {
  const b = new Builder();
  b.title('Office layout', 0, 0, 960, 'Open-plan workspace with meeting room and kitchenette');
  const oy = 90;
  const open = room(b, 'Open workspace — 12 desks', 0, oy, 640, 460, '#fbfaf7');
  grid(12, 4, { w: 120, h: 96 }, { x: 28, y: 36 }, { x: 22, y: 60 }).forEach((r, i) =>
    open.put('floor.desk', r.x, r.y, r.w, r.h, { flipV: Math.floor(i / 4) % 2 === 1 }),
  );
  open.put('floor.plant', 590, 404, 40, 40);
  open.put('floor.plant', 590, 24, 40, 40);
  open.put('floor.window', 120, -6, 400, 12);
  const meet = room(b, 'Meeting room', 640, oy, 320, 260, '#eef2ff');
  meet.put('floor.table', 80, 80, 160, 110);
  meet.put('floor.plant', 268, 30, 40, 40);
  meet.put('floor.door', 10, 176, 80, 80, { flipV: true });
  meet.put('floor.window', 314, 70, 12, 120);
  const kitchen = room(b, 'Kitchenette', 640, oy + 260, 320, 200, '#f8fafc');
  kitchen.put('floor.counterSink', 20, 40, 180, 56);
  kitchen.put('floor.fridge', 220, 34, 64, 64);
  kitchen.put('floor.tableRound', 110, 112, 76, 76);
  kitchen.put('floor.door', 10, 116, 80, 80, { flipV: true });
  b.text('Scale 1:150', { x: 0, y: oy + 476, w: 960, h: 22 }, { fontSize: 12, textColor: MUTED, textAlign: 'left' });
  return [b.page('Office')];
}

export const MAP_TEMPLATES: Template[] = [
  {
    id: 'floorplan-apartment',
    name: 'Apartment floor plan',
    category: 'Maps',
    description: 'Two-bedroom apartment with furnished living room, kitchen, bath, doors and windows.',
    keywords: ['floor plan', 'floorplan', 'apartment', 'house', 'home', 'architecture', 'rooms', 'interior'],
    build: apartment,
  },
  {
    id: 'floorplan-office',
    name: 'Office floor plan',
    category: 'Maps',
    description: 'Open-plan office with a 12-desk grid, meeting room and kitchenette.',
    keywords: ['floor plan', 'office', 'workspace', 'desks', 'seating', 'facilities'],
    build: office,
  },
];
