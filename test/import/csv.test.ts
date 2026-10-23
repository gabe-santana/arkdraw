import { describe, expect, it } from 'vitest';
import { importCsv, importer, parseCsvConfig, parseCsvRows } from '@/io/import/csv';
import { isConnector, isShape, type Doc } from '@/model/types';

const shapes = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isShape);
const conns = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isConnector);

describe('CSV parsing', () => {
  it('handles quoted fields, escaped quotes and newlines', () => {
    expect(parseCsvRows('a,b,c\n1,"x, y","say ""hi"""\n2,"multi\nline",z\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', 'say "hi"'],
      ['2', 'multi\nline', 'z'],
    ]);
  });

  it('reads directives with line continuation and comments', () => {
    const { config, csv } = parseCsvConfig(`## comment
# label: %name%
# connect: {"from": "a", \\
#   "to": "b"}
# Layout: circle
name,a,b
x,1,2`);
    expect(config.label).toBe('%name%');
    expect(config.layout).toBe('circle');
    expect(config.connect).toEqual([{ from: 'a', to: 'b' }]);
    expect(csv.trim().split('\n')[0]).toBe('name,a,b');
  });
});

describe('CSV import', () => {
  it('imports the draw.io org chart example', () => {
    const res = importCsv(importer.example!);
    const d = res.pages[0].doc;
    const s = shapes(d);
    expect(s).toHaveLength(4);
    const tessa = s.find((x) => x.text.startsWith('Tessa Miller'))!;
    expect(tessa.text).toBe('Tessa Miller\nCFO\nme@example.com');
    expect(tessa.style.fill).toBe('#dae8fc');
    expect(tessa.style.stroke).toBe('#6c8ebf');
    expect(tessa.style.radius).toBeGreaterThan(0);
    expect(tessa.link).toBe('https://www.draw.io');
    expect(tessa.data).toEqual({ name: 'Tessa Miller', position: 'CFO', location: 'Office 1', email: 'me@example.com' });
    const cs = conns(d);
    // 3 "manages" (inverted) + 2 refs from Alison
    expect(cs).toHaveLength(5);
    const manages = cs.filter((c) => c.text === 'manages');
    expect(manages).toHaveLength(3);
    for (const c of manages) {
      expect(c.source.elementId).toBe(tessa.id);
      expect(c.routing).toBe('curved');
      expect(c.style.fontSize).toBe(11);
    }
    const alison = s.find((x) => x.text.startsWith('Alison'))!;
    expect(cs.filter((c) => c.source.elementId === alison.id)).toHaveLength(2);
    // Org chart flows downwards.
    expect(tessa.y).toBeLessThan(alison.y);
    expect(res.warnings!.some((w) => /image/.test(w))).toBe(true);
  });

  it('supports identity/parent containers, named styles, fixed sizes and stylename', () => {
    const d = importCsv(`# label: %title%
# identity: id
# parent: parent
# stylename: type
# styles: {"db": "shape=cylinder3;fillColor=#ede9fe;strokeColor=#7c3aed;", "svc": "rounded=1;fillColor=#dbeafe;"}
# width: @w
# height: 50
# connect: {"from": "calls", "to": "id", "label": "uses", "style": "endArrow=open;dashed=1;"}
# layout: horizontalflow
id,title,parent,type,w,calls
grp,Backend,,,200,
api,API,grp,svc,140,db
db,Postgres,grp,db,90,
web,Web,,svc,120,api`).pages[0].doc;
    const s = shapes(d);
    const grp = s.find((x) => x.text === 'Backend')!;
    expect(grp.kind).toBe('container');
    const api = s.find((x) => x.text === 'API')!;
    const db = s.find((x) => x.text === 'Postgres')!;
    expect(api.containerId).toBe(grp.id);
    expect(db.containerId).toBe(grp.id);
    expect(db.kind).toBe('cylinder');
    expect(db.style.fill).toBe('#ede9fe');
    expect([api.w, api.h]).toEqual([140, 50]);
    expect(db.w).toBe(90);
    const web = s.find((x) => x.text === 'Web')!;
    expect(web.x).toBeLessThan(grp.x); // LR flow
    const cs = conns(d);
    expect(cs).toHaveLength(2);
    expect(cs.every((c) => c.text === 'uses' && c.endArrow === 'arrow' && c.style.strokeStyle === 'dashed')).toBe(true);
  });

  it('places nodes on a circle and at absolute positions', () => {
    const circle = shapes(importCsv(`# layout: circle
name
a
b
c
d`).pages[0].doc);
    const cx = circle.reduce((n, s) => n + s.x + s.w / 2, 0) / 4;
    const cy = circle.reduce((n, s) => n + s.y + s.h / 2, 0) / 4;
    const radii = circle.map((s) => Math.hypot(s.x + s.w / 2 - cx, s.y + s.h / 2 - cy));
    for (const r of radii) expect(r).toBeCloseTo(radii[0], 0);

    const abs = shapes(importCsv(`# layout: none
# left: x
# top: y
name,x,y
a,10,20
b,300,40`).pages[0].doc);
    expect([abs[0].x, abs[0].y]).toEqual([10, 20]);
    expect([abs[1].x, abs[1].y]).toEqual([300, 40]);
  });
});
