/**
 * Threat Modeling: data-flow-diagram elements in the Microsoft Threat Modeling
 * Tool / OWASP Threat Dragon idiom (process, external interactor, data store,
 * trust boundaries), threat-model annotations (asset, attacker, mitigation,
 * vulnerability, risk rating, threat card) and STRIDE / LINDDUN badges.
 */
import { ArrowRight, Bug, TriangleAlert } from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { Body, Detail, RoundRect, fillOf, strokeAttrs } from '../kit';
import type { LibraryItem, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import {
  FillOnly, Glyph, Ink, Label, Line, Oval, TONE, Tint, circleD, clamp, f, fracBox, ink, item, pathOf, paper, regularPts,
  roundedPolyD, shape, solid, square,
} from './_kit2';

const below = { textPlacement: 'below' as const, boxHit: true };
const belowStyle = 'verticalLabelPosition=bottom;verticalAlign=top;html=1;';

// ---------------------------------------------------------------------------
// DFD elements
// ---------------------------------------------------------------------------

function Process({ w, h, style }: ShapeRenderContext) {
  return <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={style} />;
}

function MultiProcess({ w, h, style }: ShapeRenderContext) {
  const g = clamp(Math.min(w, h) * 0.07, 2, 6);
  return (
    <>
      <Oval cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} s={style} />
      <ellipse cx={f(w / 2)} cy={f(h / 2)} rx={f(Math.max(0, w / 2 - g))} ry={f(Math.max(0, h / 2 - g))} fill="none" {...strokeAttrs(style)} />
    </>
  );
}

function Interactor({ w, h, style }: ShapeRenderContext) {
  return <RoundRect w={w} h={h} s={style} />;
}

function DataStore({ w, h, style }: ShapeRenderContext) {
  const box = `M0,0 H${f(w)} V${f(h)} H0 Z`;
  return (
    <>
      <FillOnly d={box} s={style} />
      <Detail d={`M0,0 H${f(w)} M0,${f(h)} H${f(w)}`} s={style} />
    </>
  );
}

function FlowLabel({ w, h, style }: ShapeRenderContext) {
  const r = h / 2;
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <Glyph Icon={ArrowRight} cx={Math.min(r + 2, w / 2)} cy={h / 2} size={Math.min(h * 0.55, w * 0.3)} s={style} sw={2} />
    </>
  );
}

function BoundaryLine({ w, h, style }: ShapeRenderContext) {
  const st: ElementStyle = { ...style, stroke: ink(style), strokeWidth: Math.max(1, style.strokeWidth) };
  return <Detail d={`M0,${f(h * 0.85)} C${f(w * 0.25)},${f(h * 0.1)} ${f(w * 0.75)},${f(h * 0.1)} ${f(w)},${f(h * 0.85)}`} s={st} />;
}

function Boundary({ w, h, style }: ShapeRenderContext) {
  return <RoundRect w={w} h={h} s={style} />;
}

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

function AttackSurface({ w, h, style }: ShapeRenderContext) {
  const { side } = square(w, h);
  const r = side / 2;
  const st = solid(style);
  const sw = clamp(side * 0.06, 0.75, 3);
  return (
    <>
      <circle cx={f(w / 2)} cy={f(h / 2)} r={f(Math.max(0, r - sw / 2))} fill={fillOf(style)} stroke={st.stroke} strokeWidth={f(sw)} />
      <circle cx={f(w / 2)} cy={f(h / 2)} r={f(r * 0.6)} fill="none" stroke={st.stroke} strokeWidth={f(sw)} />
      <Ink d={circleD(w / 2, h / 2, r * 0.24)} s={style} />
      <Line s={style} k={0.8} d={`M${f(w / 2)},${f(h / 2 - r)} v${f(r * 0.3)} M${f(w / 2)},${f(h / 2 + r)} v${f(-r * 0.3)} M${f(w / 2 - r)},${f(h / 2)} h${f(r * 0.3)} M${f(w / 2 + r)},${f(h / 2)} h${f(-r * 0.3)}`} />
    </>
  );
}

function Asset({ w, h, style }: ShapeRenderContext) {
  const { x, y, side } = square(w, h, 0.96);
  const p = (u: number, v: number) => [x + u * side, y + v * side * 0.86 + side * 0.07] as const;
  const outline = pathOf([p(0.22, 0.05), p(0.78, 0.05), p(1, 0.36), p(0.5, 1), p(0, 0.36)]);
  const facets = [
    pathOf([p(0, 0.36), p(1, 0.36)], false),
    pathOf([p(0.22, 0.05), p(0.36, 0.36), p(0.5, 0.05), p(0.64, 0.36), p(0.78, 0.05)], false),
    pathOf([p(0.36, 0.36), p(0.5, 1), p(0.64, 0.36)], false),
  ].join(' ');
  return (
    <>
      <Body d={outline} s={style} />
      <Tint d={pathOf([p(0.36, 0.36), p(0.5, 1), p(0.64, 0.36)])} s={style} k={0.14} />
      <Detail d={facets} s={{ ...style, strokeWidth: Math.max(0.75, style.strokeWidth * 0.75), strokeStyle: 'solid' }} />
    </>
  );
}

function Attacker({ w, h, style }: ShapeRenderContext) {
  const { x, y, side: m } = square(w, h);
  const cx = x + m / 2;
  const by = y + m;
  const c = ink(style);
  const body = `M${f(cx - m * 0.44)},${f(by)} C${f(cx - m * 0.44)},${f(y + m * 0.62)} ${f(cx - m * 0.2)},${f(y + m * 0.55)} ${f(cx)},${f(y + m * 0.55)} C${f(cx + m * 0.2)},${f(y + m * 0.55)} ${f(cx + m * 0.44)},${f(y + m * 0.62)} ${f(cx + m * 0.44)},${f(by)} Z`;
  const hood = `M${f(cx - m * 0.27)},${f(y + m * 0.66)} C${f(cx - m * 0.34)},${f(y + m * 0.08)} ${f(cx - m * 0.12)},${f(y)} ${f(cx)},${f(y)} C${f(cx + m * 0.12)},${f(y)} ${f(cx + m * 0.34)},${f(y + m * 0.08)} ${f(cx + m * 0.27)},${f(y + m * 0.66)} Z`;
  const face = `M${f(cx - m * 0.15)},${f(y + m * 0.36)} C${f(cx - m * 0.15)},${f(y + m * 0.18)} ${f(cx + m * 0.15)},${f(y + m * 0.18)} ${f(cx + m * 0.15)},${f(y + m * 0.36)} C${f(cx + m * 0.15)},${f(y + m * 0.5)} ${f(cx - m * 0.15)},${f(y + m * 0.5)} ${f(cx - m * 0.15)},${f(y + m * 0.36)} Z`;
  return (
    <>
      <path d={body} fill={c} />
      <path d={hood} fill={c} />
      <path d={face} fill={paper(style)} />
      <rect x={f(cx - m * 0.16)} y={f(y + m * 0.29)} width={f(m * 0.32)} height={f(m * 0.08)} rx={f(m * 0.03)} fill={c} />
      <circle cx={f(cx - m * 0.07)} cy={f(y + m * 0.33)} r={f(m * 0.022)} fill={paper(style)} />
      <circle cx={f(cx + m * 0.07)} cy={f(y + m * 0.33)} r={f(m * 0.022)} fill={paper(style)} />
    </>
  );
}

const shieldD = (x: number, y: number, m: number) =>
  `M${f(x + m / 2)},${f(y)} L${f(x + m * 0.92)},${f(y + m * 0.16)} V${f(y + m * 0.46)} C${f(x + m * 0.92)},${f(y + m * 0.74)} ${f(x + m * 0.72)},${f(y + m * 0.9)} ${f(x + m / 2)},${f(y + m)} C${f(x + m * 0.28)},${f(y + m * 0.9)} ${f(x + m * 0.08)},${f(y + m * 0.74)} ${f(x + m * 0.08)},${f(y + m * 0.46)} V${f(y + m * 0.16)} Z`;

function Mitigation({ w, h, style }: ShapeRenderContext) {
  const { x, y, side: m } = square(w, h);
  return (
    <>
      <Body d={shieldD(x, y, m)} s={style} />
      <Line s={style} k={1.5} d={`M${f(x + m * 0.32)},${f(y + m * 0.5)} L${f(x + m * 0.45)},${f(y + m * 0.63)} L${f(x + m * 0.7)},${f(y + m * 0.36)}`} />
    </>
  );
}

function Vulnerability({ w, h, style }: ShapeRenderContext) {
  const { x, y, side: m } = square(w, h);
  const d = roundedPolyD(
    [
      [x + m / 2, y + m * 0.04],
      [x + m, y + m * 0.94],
      [x, y + m * 0.94],
    ],
    m * 0.08,
  );
  return (
    <>
      <Body d={d} s={style} />
      <Glyph Icon={Bug} cx={x + m / 2} cy={y + m * 0.64} size={m * 0.38} s={style} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/** Solid badge (hexagon for STRIDE, circle for LINDDUN) with a white letter. */
function badge(letter: string, hex: boolean) {
  return function Badge({ w, h, style }: ShapeRenderContext) {
    const { side } = square(w, h);
    const r = side / 2;
    const d = hex ? roundedPolyD(regularPts(w / 2, h / 2, r, r, 6, -90), r * 0.12) : circleD(w / 2, h / 2, r);
    return (
      <>
        <Body d={d} s={style} />
        <Label x={w / 2} y={h / 2 + r * 0.02} text={letter} s={style} size={Math.max(4, r * (letter.length > 1 ? 0.78 : 1.02))} bold color="#ffffff" />
      </>
    );
  };
}

/** [kind, letter, label, tone, threat / property, keywords] */
const STRIDE: Array<[string, string, string, keyof typeof TONE, string, string]> = [
  ['spoofing', 'S', 'Spoofing', 'violet', 'Authenticity', 'impersonation identity fake credentials phishing'],
  ['tampering', 'T', 'Tampering', 'orange', 'Integrity', 'modification injection alter data'],
  ['repudiation', 'R', 'Repudiation', 'amber', 'Non-repudiation', 'deny action audit logging'],
  ['infoDisclosure', 'I', 'Information disclosure', 'blue', 'Confidentiality', 'data leak exposure privacy breach'],
  ['dos', 'D', 'Denial of service', 'red', 'Availability', 'dos ddos outage flooding exhaustion'],
  ['elevation', 'E', 'Elevation of privilege', 'green', 'Authorization', 'privilege escalation eop root admin'],
];

/** [kind, letter, label, tone, keywords] */
const LINDDUN: Array<[string, string, string, keyof typeof TONE, string]> = [
  ['privacyLinking', 'L', 'Linking', 'teal', 'link correlate profiles'],
  ['privacyIdentifying', 'I', 'Identifying', 'indigo', 'identify reidentification anonymity'],
  ['privacyNonRepudiation', 'Nr', 'Non-repudiation', 'violet', 'plausible deniability attribution'],
  ['privacyDetecting', 'De', 'Detecting', 'blue', 'detectability observe existence'],
  ['privacyDisclosure', 'Dd', 'Data disclosure', 'fuchsia', 'excessive collection disclosure personal data'],
  ['privacyUnawareness', 'U', 'Unawareness', 'pink', 'transparency consent unaware'],
  ['privacyNonCompliance', 'Nc', 'Non-compliance', 'slate', 'gdpr regulation policy compliance'],
];

function StrideCard({ w, h, style, text }: ShapeRenderContext) {
  const head = Math.min(30, h * 0.18);
  const rows = STRIDE.length;
  const rh = Math.max(1, (h - head - 6) / rows);
  const chip = clamp(rh * 0.72, 4, 22);
  const fs = clamp(rh * 0.42, 5, 12);
  const r = Math.min(style.radius, w / 2, h / 2);
  void text;
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Tint d={`M0,${f(head)} V${f(r)} Q0,0 ${f(r)},0 H${f(w - r)} Q${f(w)},0 ${f(w)},${f(r)} V${f(head)} Z`} s={style} k={0.08} />
      <Detail d={`M0,${f(head)} H${f(w)}`} s={{ ...style, strokeStyle: 'solid' }} />
      {STRIDE.map(([, letter, label, tone, prop], i) => {
        const cy = head + 3 + rh * (i + 0.5);
        const cx = 8 + chip / 2;
        const pts = regularPts(cx, cy, chip / 2, chip / 2, 6, -90);
        return (
          <g key={letter}>
            <path d={pathOf(pts)} fill={TONE[tone].stroke} />
            <Label x={cx} y={cy} text={letter} s={style} size={chip * 0.5} bold color="#ffffff" />
            <Label x={cx + chip / 2 + 6} y={cy} text={label} s={{ ...style, bold: false }} size={fs} anchor="start" />
            {w > 230 && <Label x={w - 8} y={cy} text={prop} s={{ ...style, bold: false }} size={fs * 0.9} anchor="end" opacity={0.6} />}
          </g>
        );
      })}
    </>
  );
}

function Risk({ w, h, style }: ShapeRenderContext) {
  const r = h / 2;
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      <Glyph Icon={TriangleAlert} cx={Math.min(r + 2, w / 2)} cy={h / 2} size={Math.min(h * 0.55, w * 0.3)} s={style} color={style.textColor} sw={2} />
    </>
  );
}

function ThreatCard({ w, h, style }: ShapeRenderContext) {
  const band = Math.min(6, w * 0.06);
  const r = Math.min(style.radius, w / 2, h / 2);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={`M${f(r)},0 H${f(band)} V${f(h)} H${f(r)} Q0,${f(h)} 0,${f(h - r)} V${f(r)} Q0,0 ${f(r)},0 Z`} fill={ink(style)} />
      <Glyph Icon={TriangleAlert} cx={w - 14} cy={14} size={Math.min(14, h * 0.3, w * 0.2)} s={style} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

const shapes: ShapeDef[] = [
  shape('threat.process', 'Process', 'ellipse;whiteSpace=wrap;html=1;', Process, {
    perimeter: 'ellipse',
    textBox: (w, h) => fracBox(w, h, 0.15, 0.15, 0.85, 0.85),
  }),
  shape('threat.multiProcess', 'Multiple processes', 'ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;', MultiProcess, {
    perimeter: 'ellipse',
    textBox: (w, h) => fracBox(w, h, 0.17, 0.17, 0.83, 0.83),
  }),
  shape('threat.interactor', 'External interactor', 'rounded=0;whiteSpace=wrap;html=1;', Interactor, { rounded: true }),
  shape('threat.datastore', 'Data store', 'shape=partialRectangle;left=0;right=0;whiteSpace=wrap;html=1;', DataStore),
  shape('threat.flowLabel', 'Data flow label', 'rounded=1;arcSize=50;whiteSpace=wrap;html=1;spacingLeft=16;', FlowLabel, {
    textBox: (w, h) => ({ x: Math.min(h, w / 2), y: 0, w: Math.max(1, w - Math.min(h, w / 2) - 8), h }),
  }),
  shape('threat.boundaryLine', 'Trust boundary (line)', 'shape=mxgraph.basic.arc;startAngle=0.75;endAngle=0.25;dashed=1;fillColor=none;html=1;', BoundaryLine, {
    boxHit: true,
    textBox: (w, h) => fracBox(w, h, 0.15, 0.32, 0.85, 0.8),
  }),
  shape('threat.boundary', 'Trust boundary', 'rounded=1;dashed=1;container=1;fillColor=none;html=1;align=left;verticalAlign=top;spacingLeft=10;', Boundary, {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 10, y: 4, w: Math.max(1, w - 20), h: Math.max(1, Math.min(22, h - 4)) }),
  }),
  shape('threat.attackSurface', 'Attack surface', `ellipse;shape=mxgraph.basic.target;${belowStyle}`, AttackSurface, { ...below, perimeter: 'ellipse' }),
  shape('threat.asset', 'Asset', `shape=mxgraph.basic.diamond;${belowStyle}`, Asset, below),
  shape('threat.actor', 'Threat actor', `shape=mxgraph.basic.person;${belowStyle}`, Attacker, below),
  shape('threat.mitigation', 'Mitigation', `shape=mxgraph.basic.shield;${belowStyle}`, Mitigation, below),
  shape('threat.vulnerability', 'Vulnerability', `triangle;direction=north;${belowStyle}`, Vulnerability, below),
  ...STRIDE.map(([name, letter, label]) =>
    shape(`threat.${name}`, label, `shape=hexagon;perimeter=hexagonPerimeter2;size=0.25;direction=south;${belowStyle}`, badge(letter, true), below),
  ),
  ...LINDDUN.map(([name, letter, label]) => shape(`threat.${name}`, label, `ellipse;${belowStyle}`, badge(letter, false), { ...below, perimeter: 'ellipse' })),
  shape('threat.strideCard', 'STRIDE legend', 'swimlane;startSize=28;whiteSpace=wrap;html=1;', StrideCard, {
    rounded: true,
    textBox: (w, h) => ({ x: 8, y: 0, w: Math.max(1, w - 16), h: Math.max(1, Math.min(30, h * 0.18)) }),
  }),
  shape('threat.risk', 'Risk rating', 'rounded=1;arcSize=50;whiteSpace=wrap;html=1;fontStyle=1;spacingLeft=16;', Risk, {
    textBox: (w, h) => ({ x: Math.min(h, w / 2), y: 0, w: Math.max(1, w - Math.min(h, w / 2) - 8), h }),
  }),
  shape('threat.card', 'Threat card', 'rounded=1;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingLeft=12;', ThreatCard, {
    rounded: true,
    textBox: (w, h) => ({ x: Math.min(14, w * 0.2), y: 8, w: Math.max(1, w - Math.min(14, w * 0.2) - 26), h: Math.max(1, h - 16) }),
  }),
];

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

const kw = (k: string) => `threat model modeling stride dfd security ${k}`;
const dfd: Partial<ElementStyle> = { fill: '#ffffff', stroke: '#1e293b', fontSize: 13 };
const boundaryRed = '#dc2626';
const badgeStyle = (tone: keyof typeof TONE): Partial<ElementStyle> => ({ fill: TONE[tone].stroke, stroke: TONE[tone].stroke, strokeWidth: 1, fontSize: 11 });
const risk = (fill: string): Partial<ElementStyle> => ({ fill, stroke: fill, textColor: '#ffffff', bold: true, fontSize: 12, textAlign: 'left' });

const items: LibraryItem[] = [
  item('threat.process', 'Process', 110, 110, { text: 'Web API', style: dfd, keywords: kw('process circle service component') }),
  item('threat.multiProcess', 'Multiple processes', 110, 110, { text: 'Backend', style: dfd, keywords: kw('complex process subsystem double circle') }),
  item('threat.interactor', 'External interactor', 140, 70, { text: 'User', style: { ...dfd, radius: 0 }, keywords: kw('external entity interactor actor browser') }),
  item('threat.datastore', 'Data store', 150, 60, { text: 'Database', style: dfd, keywords: kw('data store database file storage') }),
  item('threat.flowLabel', 'Data flow label', 150, 28, { text: 'HTTPS request', style: { ...TONE.slate, fontSize: 12 }, keywords: kw('data flow label arrow request') }),
  item('threat.boundaryLine', 'Trust boundary (line)', 220, 70, {
    text: 'Internet boundary',
    style: { fill: 'none', stroke: boundaryRed, strokeStyle: 'dashed', strokeWidth: 2, textColor: '#b91c1c', fontSize: 12 },
    keywords: kw('trust boundary curve dashed red line'),
  }),
  item('threat.boundary', 'Trust boundary', 360, 220, {
    text: 'Trust boundary: DMZ',
    style: { fill: 'none', stroke: boundaryRed, strokeStyle: 'dashed', strokeWidth: 2, radius: 14, textColor: '#b91c1c', fontSize: 12, bold: true, textAlign: 'left' },
    keywords: kw('trust boundary zone container dashed dmz'),
  }),
  item('threat.attackSurface', 'Attack surface', 48, 48, { style: { fill: '#ffffff', stroke: boundaryRed, fontSize: 12 }, keywords: kw('attack surface entry point target') }),
  item('threat.asset', 'Asset', 56, 52, { text: 'Crown jewel', style: { ...TONE.amber, fontSize: 12 }, keywords: kw('asset crown jewel valuable data gem') }),
  item('threat.actor', 'Threat actor', 52, 56, { text: 'Attacker', style: { fill: '#ffffff', stroke: '#334155', fontSize: 12 }, keywords: kw('attacker hacker adversary malicious actor') }),
  item('threat.mitigation', 'Mitigation', 50, 56, { text: 'Control', style: { ...TONE.green, fontSize: 12 }, keywords: kw('mitigation control countermeasure shield defense') }),
  item('threat.vulnerability', 'Vulnerability', 56, 52, { text: 'Vulnerability', style: { ...TONE.amber, fontSize: 12 }, keywords: kw('vulnerability weakness bug cve flaw') }),
  ...STRIDE.map(([name, letter, label, tone, prop, keywords]) =>
    item(`threat.${name}`, label, 40, 40, { text: label, style: badgeStyle(tone), keywords: kw(`${letter.toLowerCase()} ${prop.toLowerCase()} badge ${keywords}`) }),
  ),
  item('threat.strideCard', 'STRIDE legend', 280, 200, {
    text: 'STRIDE',
    style: { fill: '#ffffff', stroke: '#cbd5e1', radius: 8, bold: true, fontSize: 13, textColor: '#0f172a' },
    keywords: kw('legend key card categories'),
  }),
  item('threat.risk', 'Risk: Low', 96, 26, { text: 'Low', style: risk(TONE.green.stroke), keywords: kw('risk rating severity low') }),
  item('threat.risk', 'Risk: Medium', 96, 26, { text: 'Medium', style: risk(TONE.amber.stroke), keywords: kw('risk rating severity medium moderate') }),
  item('threat.risk', 'Risk: High', 96, 26, { text: 'High', style: risk(TONE.orange.stroke), keywords: kw('risk rating severity high') }),
  item('threat.risk', 'Risk: Critical', 96, 26, { text: 'Critical', style: risk(TONE.red.stroke), keywords: kw('risk rating severity critical') }),
  item('threat.card', 'Threat card', 220, 100, {
    text: 'T-01 SQL injection\nTampering · High\nMitigation: parameterized queries',
    style: { fill: '#ffffff', stroke: boundaryRed, radius: 6, fontSize: 12, textAlign: 'left', verticalAlign: 'top' },
    keywords: kw('threat card finding issue description'),
  }),
  ...LINDDUN.map(([name, letter, label, tone, keywords]) =>
    item(`threat.${name}`, `LINDDUN: ${label}`, 40, 40, { text: label, style: badgeStyle(tone), keywords: kw(`linddun privacy ${letter.toLowerCase()} badge ${keywords}`) }),
  ),
];

const libraries: ShapeLibrary[] = [{ id: 'threat', name: 'Threat Modeling (STRIDE)', items }];

export { shapes, libraries };
