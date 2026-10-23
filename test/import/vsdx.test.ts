import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { importVsdx, importer } from '@/io/import/vsdx';
import { isConnector, isShape, type Doc } from '@/model/types';

const NS = 'xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
const rels = (targets: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><Relationships ${REL_NS}>${targets
    .map((t, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="${t}"/>`)
    .join('')}</Relationships>`;
const cells = (o: Record<string, string | number>) => Object.entries(o).map(([k, v]) => `<Cell N="${k}" V="${v}"/>`).join('');

const masterXml = (shape: string) => `<?xml version="1.0" encoding="UTF-8"?><MasterContents ${NS}><Shapes>${shape}</Shapes></MasterContents>`;
const pageXml = (shapes: string, connects = '') =>
  `<?xml version="1.0" encoding="UTF-8"?><PageContents ${NS}><Shapes>${shapes}</Shapes>${connects ? `<Connects>${connects}</Connects>` : ''}</PageContents>`;

function buildVsdx(): Uint8Array {
  const page1 = pageXml(
    [
      `<Shape ID="1" NameU="Process" Type="Shape" Master="1">${cells({ PinX: 2, PinY: 10, Width: 1.5 })}<Text>Do it</Text></Shape>`,
      `<Shape ID="2" Type="Shape" Master="2">${cells({ PinX: 2, PinY: 8 })}<Text>OK?</Text></Shape>`,
      `<Shape ID="3" Type="Shape">${cells({ PinX: 5, PinY: 8, Width: 1, Height: 1, FillForegnd: '#ff0000', LineColor: '#00ff00', LineWeight: 0.0208333, Angle: 1.5707963 })}` +
        `<Section N="Geometry" IX="0"><Row T="Ellipse" IX="1">${cells({ X: 0.5, Y: 0.5, A: 1, B: 0.5, C: 0.5, D: 1 })}</Row></Section>` +
        `<Section N="Character"><Row IX="0">${cells({ Color: '#0000ff', Size: 0.1666667, Style: 1 })}</Row></Section><Text>Circle</Text></Shape>`,
      `<Shape ID="4" Type="Group">${cells({ PinX: 5, PinY: 4, Width: 2, Height: 1, LocPinX: 1, LocPinY: 0.5 })}<Shapes>` +
        `<Shape ID="5" Type="Shape">${cells({ PinX: 0.5, PinY: 0.5, Width: 1, Height: 1 })}<Text>G1</Text></Shape>` +
        `<Shape ID="6" Type="Shape">${cells({ PinX: 1.5, PinY: 0.5, Width: 1, Height: 1 })}<Text>G<cp IX="0"/>2</Text></Shape>` +
        `</Shapes></Shape>`,
      `<Shape ID="7" NameU="Dynamic connector" Type="Shape" Master="3">${cells({ BeginX: 2, BeginY: 9.625, EndX: 2, EndY: 8.5, EndArrow: 13 })}<Text>yes</Text></Shape>`,
      `<Shape ID="8" Type="Shape">${cells({ BeginX: 4.5, BeginY: 4, EndX: 8, EndY: 1, LinePattern: 2 })}</Shape>`,
    ].join(''),
    `<Connect FromSheet="7" FromCell="BeginX" ToSheet="1"/><Connect FromSheet="7" FromCell="EndX" ToSheet="2"/><Connect FromSheet="8" FromCell="BeginX" ToSheet="5"/>`,
  );
  const page2 = pageXml(
    `<Shape ID="1" Type="Shape">${cells({ PinX: 1, PinY: 1, Width: 2, Height: 0.5 })}<Section N="Geometry" IX="0">${cells({ NoFill: 1, NoLine: 1 })}</Section><Text>Just text</Text></Shape>`,
  );
  return zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'visio/document.xml': strToU8(`<VisioDocument ${NS}/>`),
    'visio/pages/pages.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Pages ${NS}>` +
        `<Page ID="0" NameU="Page-1" Name="Flow"><PageSheet>${cells({ PageWidth: 8.5, PageHeight: 11 })}</PageSheet><Rel r:id="rId1"/></Page>` +
        `<Page ID="4" Name="Second"><PageSheet>${cells({ PageHeight: 5 })}</PageSheet><Rel r:id="rId2"/></Page>` +
        `<Page ID="5" Name="Bg" Background="1"><Rel r:id="rId3"/></Page></Pages>`,
    ),
    'visio/pages/_rels/pages.xml.rels': strToU8(rels(['page1.xml', 'page2.xml', 'page3.xml'])),
    'visio/pages/page1.xml': strToU8(page1),
    'visio/pages/page2.xml': strToU8(page2),
    'visio/pages/page3.xml': strToU8(pageXml('')),
    'visio/masters/masters.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Masters ${NS}>` +
        `<Master ID="1" NameU="Process" Name="Process"><Rel r:id="rId1"/></Master>` +
        `<Master ID="2" NameU="Decision.12" Name="Decision"><Rel r:id="rId2"/></Master>` +
        `<Master ID="3" NameU="Dynamic connector" Name="Dynamic connector"><Rel r:id="rId3"/></Master></Masters>`,
    ),
    'visio/masters/_rels/masters.xml.rels': strToU8(rels(['master1.xml', 'master2.xml', 'master3.xml'])),
    'visio/masters/master1.xml': strToU8(masterXml(`<Shape ID="5" Type="Shape">${cells({ Width: 1, Height: 0.75, FillForegnd: '#dbeafe', LineColor: '#2563eb' })}</Shape>`)),
    'visio/masters/master2.xml': strToU8(masterXml(`<Shape ID="5" Type="Shape">${cells({ Width: 1, Height: 1 })}</Shape>`)),
    'visio/masters/master3.xml': strToU8(masterXml(`<Shape ID="5" Type="Shape">${cells({ BeginX: 0, BeginY: 0, EndX: 1, EndY: 1, EndArrow: 0 })}</Shape>`)),
  });
}

const shapes = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isShape);
const conns = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isConnector);

describe('VSDX import', () => {
  const bytes = buildVsdx();
  const res = importVsdx(bytes);

  it('reads foreground pages and skips background ones', () => {
    expect(res.pages.map((p) => p.name)).toEqual(['Flow', 'Second']);
    expect(res.warnings!.some((w) => /background/.test(w))).toBe(true);
    expect(importer.detect!(bytes, 'x.vsdx')).toBe(true);
  });

  it('converts geometry (inches → px, y flipped) and master inheritance', () => {
    const d = res.pages[0].doc;
    const s = shapes(d);
    expect(s).toHaveLength(5);
    const proc = s.find((x) => x.text === 'Do it')!;
    expect(proc.kind).toBe('rectangle');
    expect([proc.x, proc.y, proc.w, proc.h]).toEqual([120, 60, 144, 72]);
    expect(proc.style.fill).toBe('#dbeafe');
    expect(proc.style.stroke).toBe('#2563eb');
    const dec = s.find((x) => x.text === 'OK?')!;
    expect(dec.kind).toBe('diamond');
    expect([dec.w, dec.h]).toEqual([96, 96]);
    const circle = s.find((x) => x.text === 'Circle')!;
    expect(circle.kind).toBe('ellipse');
    expect(circle.style).toMatchObject({ fill: '#ff0000', stroke: '#00ff00', strokeWidth: 2, textColor: '#0000ff', fontSize: 16, bold: true });
    expect(circle.rotation).toBeCloseTo(270, 0);
  });

  it('flattens groups with offsets and keeps them grouped', () => {
    const s = shapes(res.pages[0].doc);
    const g1 = s.find((x) => x.text === 'G1')!;
    const g2 = s.find((x) => x.text === 'G2')!;
    expect([g1.x, g1.y]).toEqual([384, 624]);
    expect([g2.x, g2.y]).toEqual([480, 624]);
    expect(g1.groupIds).toHaveLength(1);
    expect(g1.groupIds).toEqual(g2.groupIds);
  });

  it('turns 1-D shapes into connectors using Connects', () => {
    const d = res.pages[0].doc;
    const s = shapes(d);
    const cs = conns(d);
    expect(cs).toHaveLength(2);
    const yes = cs.find((c) => c.text === 'yes')!;
    expect(yes.source.elementId).toBe(s.find((x) => x.text === 'Do it')!.id);
    expect(yes.target.elementId).toBe(s.find((x) => x.text === 'OK?')!.id);
    expect(yes.endArrow).toBe('triangle');
    const free = cs.find((c) => c !== yes)!;
    expect(free.source.elementId).toBe(s.find((x) => x.text === 'G1')!.id);
    expect(free.target.elementId).toBeUndefined();
    expect([free.target.x, free.target.y]).toEqual([768, 960]);
    expect(free.style.strokeStyle).toBe('dashed');
  });

  it('detects text-only shapes', () => {
    const s = shapes(res.pages[1].doc);
    expect(s).toHaveLength(1);
    expect(s[0].kind).toBe('text');
    expect(s[0].y).toBe(Math.round((5 - 1.25) * 96)); // top = PinY + H/2
  });

  it('rejects non-zip input', () => {
    expect(() => importVsdx(new Uint8Array([1, 2, 3]))).toThrow(/not a valid/);
  });
});
