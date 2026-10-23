/**
 * Shape registry: geometry for every built-in shape kind.
 *
 * Shapes are pure functions of (w, h, style, text) → SVG. The same functions
 * render the canvas, the library thumbnails, and every export format, so what
 * you see is exactly what you export.
 *
 * Extra libraries live in ./libs/*.tsx and are discovered automatically: each
 * module exports `shapes: ShapeDef[]` and/or `libraries: ShapeLibrary[]`.
 */
import type { ComponentType } from 'react';
import {
  BrickWall, Cloud, Container, Cpu, Database, Globe, HardDrive, Laptop, Lock, Mail, Monitor,
  Network, Printer, Router, Server, ShieldCheck, Smartphone, Split, User, Wifi,
  type LucideProps,
} from 'lucide-react';
import type { Rect } from '@/model/types';
import { IconImage } from './IconImage';
import { freehandGeometry } from '@/interaction/freehandPath';
import { renderTable } from '@/interaction/tableRender';
import {
  Body, C4Text, Compartments, Cylinder, Detail, HorizontalCylinder, RoundRect, cloudPath, cylRy, fillOf, iconTile, inset, rr,
  strokeAttrs,
} from './kit';
import type { ParamValues, ShapeDef, ShapeLibrary } from './types';
import { handle, param, pn, ps, radiusHandle, withParams } from './params';
import { ARROW_PARAMS, documentD, singleArrowD, singleArrowHandle } from './paramGeometry';
import { STENCIL_SHAPE } from '@/stencils/shape';

export { strokeAttrs, splitSections, compartmentHeight, c4Layout, C4Text } from './kit';

const defs: ShapeDef[] = [
  // ----- General ------------------------------------------------------------
  {
    kind: 'rectangle',
    label: 'Rectangle',
    rounded: true,
    render: ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />,
    handles: ({ w, h, style, px }) => [radiusHandle(w, h, style.radius, px)],
    drawio: 'rounded=0;whiteSpace=wrap;',
  },
  {
    kind: 'ellipse',
    label: 'Ellipse',
    perimeter: 'ellipse',
    render: ({ w, h, style }) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={fillOf(style)} fillOpacity={style.fillOpacity} {...strokeAttrs(style)} />,
    textBox: (w, h) => ({ x: w * 0.12, y: h * 0.15, w: w * 0.76, h: h * 0.7 }),
    drawio: 'ellipse;whiteSpace=wrap;',
  },
  {
    kind: 'diamond',
    label: 'Diamond',
    perimeter: 'diamond',
    render: ({ w, h, style }) => <Body d={`M${w / 2},0 L${w},${h / 2} L${w / 2},${h} L0,${h / 2} Z`} s={style} />,
    textBox: (w, h) => ({ x: w * 0.2, y: h * 0.25, w: w * 0.6, h: h * 0.5 }),
    drawio: 'rhombus;whiteSpace=wrap;',
  },
  {
    kind: 'triangle',
    label: 'Triangle',
    render: ({ w, h, style }) => <Body d={`M${w / 2},0 L${w},${h} L0,${h} Z`} s={style} />,
    textBox: (w, h) => ({ x: w * 0.25, y: h * 0.45, w: w * 0.5, h: h * 0.5 }),
    drawio: 'triangle;direction=north;whiteSpace=wrap;',
  },
  {
    kind: 'hexagon',
    label: 'Hexagon',
    params: [param.pct('size', 'Size', 0.25, { max: 0.5, fixedSizeOf: 'w' })],
    render: ({ w, h, style, params }) => {
      const i = w * pn(params, 'size');
      return <Body d={`M${i},0 H${w - i} L${w},${h / 2} L${w - i},${h} H${i} L0,${h / 2} Z`} s={style} />;
    },
    handles: ({ w, p }) => [handle(w * pn(p, 'size'), 0, (pt) => ({ params: { size: pt.x / w } }))],
    textBox: (w, h, p) => inset(w, h, Math.min(w * pn(p, 'size') * 0.72, w * 0.4), 6),
    drawio: 'shape=hexagon;perimeter=hexagonPerimeter2;size=0.25;whiteSpace=wrap;',
  },
  {
    kind: 'parallelogram',
    label: 'Parallelogram',
    params: [param.pct('size', 'Skew', 0.2, { max: 0.95, fixedSizeOf: 'w' })],
    render: ({ w, h, style, params }) => {
      const o = w * pn(params, 'size');
      return <Body d={`M${o},0 H${w} L${w - o},${h} H0 Z`} s={style} />;
    },
    handles: ({ w, p }) => [handle(w * pn(p, 'size'), 0, (pt) => ({ params: { size: pt.x / w } }))],
    textBox: (w, h, p) => inset(w, h, Math.min(w * pn(p, 'size') + 4, w * 0.45), 6),
    drawio: 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;',
  },
  {
    kind: 'trapezoid',
    label: 'Trapezoid',
    params: [param.pct('size', 'Skew', 0.2, { max: 0.5, fixedSizeOf: 'w' })],
    render: ({ w, h, style, params }) => {
      const o = w * pn(params, 'size');
      return <Body d={`M${o},0 H${w - o} L${w},${h} H0 Z`} s={style} />;
    },
    handles: ({ w, p }) => [handle(w * pn(p, 'size'), 0, (pt) => ({ params: { size: pt.x / w } }))],
    textBox: (w, h, p) => inset(w, h, Math.min(w * pn(p, 'size'), w * 0.45), 6),
    drawio: 'shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;',
  },
  {
    kind: 'cylinder',
    label: 'Cylinder',
    params: [param.px('size', 'Depth', 15, { max: 500 })],
    render: Cylinder,
    handles: ({ w, h, p }) => [handle(w / 2, cylRy(w, h, p.size), (pt) => ({ params: { size: Math.round(Math.min(pt.y, h / 2)) } }))],
    textBox: (w, h, p) => ({ x: 6, y: cylRy(w, h, p?.size) * 2 + 2, w: w - 12, h: Math.max(1, h - cylRy(w, h, p?.size) * 3 - 4) }),
    drawio: 'shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=15;whiteSpace=wrap;',
  },
  {
    kind: 'cloud',
    label: 'Cloud',
    render: ({ w, h, style }) => <Body d={cloudPath(w, h)} s={style} />,
    textBox: (w, h) => ({ x: w * 0.2, y: h * 0.3, w: w * 0.6, h: h * 0.45 }),
    drawio: 'ellipse;shape=cloud;whiteSpace=wrap;',
  },
  {
    kind: 'callout',
    label: 'Callout',
    rounded: true,
    // mxGraph callout: `size` = pointer height (px), `position` / `base` = where the
    // pointer leaves the body (fraction / px), `position2` = tip x (fraction).
    params: [
      param.px('size', 'Pointer', 18, { drawioDefault: 30 }),
      param.pct('position', 'Base at', 0.22, { drawioDefault: 0.5 }),
      param.px('base', 'Base', 18, { drawioDefault: 20 }),
      param.pct('position2', 'Tip at', 0.2, { drawioDefault: 0.5 }),
    ],
    render: ({ w, h, style, params }) => {
      const bh = Math.max(0, h - Math.min(h, pn(params, 'size')));
      const r = rr(w, bh, style.radius);
      const dx = w * pn(params, 'position');
      const dx2 = w * pn(params, 'position2');
      const bx = Math.min(w - r, dx + pn(params, 'base'));
      return (
        <Body
          d={`M${r},0 H${w - r} Q${w},0 ${w},${r} V${bh - r} Q${w},${bh} ${w - r},${bh} H${bx} L${dx2},${h} L${Math.max(r, Math.min(dx, bx))},${bh} H${r} Q0,${bh} 0,${bh - r} V${r} Q0,0 ${r},0 Z`}
          s={style}
        />
      );
    },
    handles: ({ w, h, p }) => {
      const s = Math.min(h, pn(p, 'size'));
      const dx = w * pn(p, 'position');
      return [
        handle(dx, h - s, (pt) => ({ params: { size: Math.round(h - pt.y), position: pt.x / w } }), 'size'),
        handle(Math.min(w, dx + pn(p, 'base')), h - s, (pt) => ({ params: { base: Math.round(Math.max(0, pt.x - dx)) } })),
        handle(w * pn(p, 'position2'), h, (pt) => ({ params: { position2: pt.x / w } })),
      ];
    },
    textBox: (w, h, p) => inset(w, Math.max(1, h - Math.min(h, pn(p, 'size'))), 8),
    drawio: 'shape=callout;perimeter=calloutPerimeter;whiteSpace=wrap;',
  },
  {
    kind: 'blockArrow',
    label: 'Block arrow',
    params: ARROW_PARAMS(0.5, 0.4),
    render: ({ w, h, style, params }) => <Body d={singleArrowD(w, h, params)} s={style} />,
    handles: ({ w, h, p }) => [singleArrowHandle(w, h, p)],
    textBox: (w, h, p) => {
      const at = (h * (1 - pn(p, 'arrowWidth'))) / 2;
      return { x: 6, y: at, w: Math.max(1, w - w * pn(p, 'arrowSize') - 8), h: Math.max(1, h - at * 2) };
    },
    drawio: 'shape=singleArrow;arrowWidth=0.5;arrowSize=0.4;whiteSpace=wrap;',
  },
  {
    kind: 'text',
    label: 'Text',
    boxHit: true,
    autoGrow: true,
    render: () => null,
    textBox: (w, h) => ({ x: 0, y: 0, w, h }),
    drawio: 'text;whiteSpace=wrap;',
  },
  {
    kind: 'sticky',
    label: 'Sticky note',
    autoGrow: true,
    render: ({ w, h, style }) => {
      const f = Math.min(18, w * 0.15, h * 0.15);
      return (
        <>
          <Body d={`M0,0 H${w} V${h - f} L${w - f},${h} H0 Z`} s={style} />
          <path d={`M${w},${h - f} H${w - f} V${h} Z`} fill="#000" fillOpacity={0.08} stroke="none" />
        </>
      );
    },
    textBox: (w, h) => inset(w, h, 14),
    drawio: 'shape=note;direction=south;size=14;whiteSpace=wrap;',
  },
  {
    kind: 'container',
    label: 'Container',
    rounded: true,
    container: true,
    params: [param.px('startSize', 'Header', 36, { drawioDefault: 23 }), param.color('swimlaneFillColor', 'Header fill')],
    render: ({ w, h, style, params }) => {
      const b = Math.min(h, pn(params, 'startSize'));
      const head = ps(params, 'swimlaneFillColor');
      const r = Math.min(rr(w, h, style.radius), b);
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          {head && <path d={`M0,${b} V${r} Q0,0 ${r},0 H${w - r} Q${w},0 ${w},${r} V${b} Z`} fill={head} stroke="none" />}
          <Detail d={`M0,${b} H${w}`} s={{ ...style, strokeStyle: 'solid', strokeWidth: Math.max(1, style.strokeWidth * 0.75) }} />
        </>
      );
    },
    handles: ({ w, h, p }) => [handle(w / 2, Math.min(h, pn(p, 'startSize')), (pt) => ({ params: { startSize: Math.round(Math.min(h, pt.y)) } }))],
    textBox: (w, h, p) => ({ x: 14, y: 0, w: Math.max(1, w - 28), h: Math.max(1, Math.min(h, pn(p, 'startSize'))) }),
    drawio: 'swimlane;startSize=36;rounded=1;arcSize=6;container=1;collapsible=0;',
  },

  // ----- Flowchart -----------------------------------------------------------
  {
    kind: 'flow.terminator',
    label: 'Terminator',
    render: ({ w, h, style }) => <RoundRect w={w} h={h} s={style} r={h / 2} />,
    textBox: (w, h) => inset(w, h, h * 0.35, 4),
    drawio: 'rounded=1;arcSize=50;whiteSpace=wrap;',
  },
  {
    kind: 'flow.document',
    label: 'Document',
    params: [param.pct('size', 'Wave', 0.2, { max: 0.6, drawioDefault: 0.3 })],
    render: ({ w, h, style, params }) => <Body d={documentD(w, h, pn(params, 'size'))} s={style} />,
    handles: ({ w, h, p }) => [handle(w * 0.75, h - h * pn(p, 'size'), (pt) => ({ params: { size: (h - pt.y) / h } }))],
    textBox: (w, h, p) => ({ x: 8, y: 6, w: w - 16, h: Math.max(1, h * (1 - pn(p, 'size') * 0.9) - 8) }),
    drawio: 'shape=document;boundedLbl=1;whiteSpace=wrap;',
  },
  {
    kind: 'flow.predefined',
    label: 'Predefined process',
    params: [param.pct('size', 'Bars', 0.1, { max: 0.5, fixedSizeOf: 'w' })],
    render: ({ w, h, style, params }) => {
      const x = w * pn(params, 'size');
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          <Detail d={`M${x},0 V${h} M${w - x},0 V${h}`} s={style} />
        </>
      );
    },
    handles: ({ w, p }) => [handle(w * pn(p, 'size'), 0, (pt) => ({ params: { size: pt.x / w } }))],
    textBox: (w, h, p) => inset(w, h, Math.min(w * 0.45, w * pn(p, 'size') + 6), 6),
    drawio: 'shape=process;backgroundOutline=1;whiteSpace=wrap;',
  },
  {
    kind: 'flow.internalStorage',
    label: 'Internal storage',
    params: [param.px('dx', 'Left', 14, { drawioDefault: 20 }), param.px('dy', 'Top', 14, { drawioDefault: 20 })],
    render: ({ w, h, style, params }) => {
      const x = Math.min(w, pn(params, 'dx'));
      const y = Math.min(h, pn(params, 'dy'));
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          <Detail d={`M${x},0 V${h} M0,${y} H${w}`} s={style} />
        </>
      );
    },
    handles: ({ w, h, p }) => [handle(Math.min(w, pn(p, 'dx')), Math.min(h, pn(p, 'dy')), (pt) => ({ params: { dx: Math.round(pt.x), dy: Math.round(pt.y) } }), 'dx')],
    textBox: (w, h, p) => {
      const x = Math.min(w, pn(p, 'dx'));
      const y = Math.min(h, pn(p, 'dy'));
      return { x: x + 4, y: y + 2, w: Math.max(1, w - x - 8), h: Math.max(1, h - y - 4) };
    },
    drawio: 'shape=internalStorage;backgroundOutline=1;whiteSpace=wrap;',
  },
  {
    kind: 'flow.manualInput',
    label: 'Manual input',
    render: ({ w, h, style }) => <Body d={`M0,${h * 0.25} L${w},0 V${h} H0 Z`} s={style} />,
    textBox: (w, h) => ({ x: 8, y: h * 0.25, w: w - 16, h: h * 0.72 }),
    drawio: 'shape=manualInput;size=15;whiteSpace=wrap;',
  },
  {
    kind: 'flow.manualOperation',
    label: 'Manual operation',
    render: ({ w, h, style }) => {
      const o = w * 0.15;
      return <Body d={`M0,0 H${w} L${w - o},${h} H${o} Z`} s={style} />;
    },
    textBox: (w, h) => inset(w, h, w * 0.15, 6),
    drawio: 'shape=trapezoid;perimeter=trapezoidPerimeter;flipV=1;whiteSpace=wrap;',
  },
  {
    kind: 'flow.delay',
    label: 'Delay',
    render: ({ w, h, style }) => <Body d={`M0,0 H${w / 2} A${w / 2},${h / 2} 0 0 1 ${w / 2},${h} H0 Z`} s={style} />,
    textBox: (w, h) => ({ x: 8, y: 6, w: w * 0.8 - 8, h: h - 12 }),
    drawio: 'shape=delay;whiteSpace=wrap;',
  },
  {
    kind: 'flow.offPage',
    label: 'Off-page reference',
    render: ({ w, h, style }) => <Body d={`M0,0 H${w} V${h * 0.62} L${w / 2},${h} L0,${h * 0.62} Z`} s={style} />,
    textBox: (w, h) => ({ x: 6, y: 4, w: w - 12, h: h * 0.62 }),
    drawio: 'shape=offPageConnector;whiteSpace=wrap;',
  },

  // ----- UML ----------------------------------------------------------------
  {
    kind: 'uml.class',
    label: 'Class',
    rounded: true,
    textPlacement: 'custom',
    autoGrow: true,
    render: Compartments,
    drawio: 'swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;',
  },
  {
    kind: 'uml.actor',
    label: 'Actor',
    textPlacement: 'below',
    boxHit: true,
    render: ({ w, h, style }) => (
      <>
        <ellipse cx={w / 2} cy={h / 8} rx={w / 4} ry={h / 8} fill={fillOf(style)} fillOpacity={style.fillOpacity} {...strokeAttrs(style)} />
        <Detail d={`M${w / 2},${h / 4} V${(2 * h) / 3} M0,${h / 3} H${w} M${w / 2},${(2 * h) / 3} L0,${h} M${w / 2},${(2 * h) / 3} L${w},${h}`} s={style} />
      </>
    ),
    drawio: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;outlineConnect=0;',
  },
  {
    kind: 'uml.package',
    label: 'Package',
    params: [param.px('tabWidth', 'Tab width', 80, { drawioDefault: 60 }), param.px('tabHeight', 'Tab height', 22, { drawioDefault: 20 })],
    render: ({ w, h, style, params }) => {
      const tw = Math.min(w, pn(params, 'tabWidth'));
      const th = Math.min(h, pn(params, 'tabHeight'));
      return (
        <>
          <Body d={`M0,${th} V0 H${tw} V${th} Z`} s={style} />
          <Body d={`M0,${th} H${w} V${h} H0 Z`} s={style} />
        </>
      );
    },
    handles: ({ w, h, p }) => [
      handle(Math.min(w, pn(p, 'tabWidth')), Math.min(h, pn(p, 'tabHeight')), (pt) => ({ params: { tabWidth: Math.round(pt.x), tabHeight: Math.round(pt.y) } }), 'tabWidth'),
    ],
    textBox: (w, h, p) => {
      const th = Math.min(h, pn(p, 'tabHeight'));
      return { x: 8, y: th + 4, w: w - 16, h: Math.max(1, h - th - 8) };
    },
    drawio: 'shape=folder;tabWidth=80;tabHeight=22;tabPosition=left;whiteSpace=wrap;',
  },
  {
    kind: 'uml.component',
    label: 'Component',
    rounded: true,
    render: ({ w, h, style }) => (
      <>
        <RoundRect w={w} h={h} s={style} />
        <g transform={`translate(${w - 28},10)`}>
          <Body d="M4,0 H18 V16 H4 Z" s={{ ...style, strokeWidth: Math.min(style.strokeWidth, 1.25) }} />
          <Body d="M0,3 H8 V7 H0 Z M0,9 H8 V13 H0 Z" s={{ ...style, strokeWidth: Math.min(style.strokeWidth, 1.25) }} />
        </g>
      </>
    ),
    textBox: (w, h) => ({ x: 10, y: 6, w: w - 44, h: h - 12 }),
    drawio: 'shape=component;align=left;spacingLeft=36;whiteSpace=wrap;',
  },
  {
    kind: 'uml.note',
    label: 'Note',
    params: [param.px('size', 'Fold', 16, { drawioDefault: 30 })],
    render: ({ w, h, style, params }) => {
      const f = Math.min(pn(params, 'size'), w, h);
      return (
        <>
          <Body d={`M0,0 H${w - f} L${w},${f} V${h} H0 Z`} s={style} />
          <Detail d={`M${w - f},0 V${f} H${w}`} s={style} />
        </>
      );
    },
    handles: ({ w, h, p }) => [handle(w - Math.min(pn(p, 'size'), w, h), 0, (pt) => ({ params: { size: Math.round(w - pt.x) } }))],
    textBox: (w, h) => inset(w, h, 10),
    drawio: 'shape=note;size=16;whiteSpace=wrap;',
  },
  {
    kind: 'uml.initial',
    label: 'Initial state',
    perimeter: 'ellipse',
    render: ({ w, h, style }) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={style.stroke} stroke="none" />,
    textPlacement: 'below',
    drawio: 'ellipse;fillColor=#000000;',
  },
  {
    kind: 'uml.final',
    label: 'Final state',
    perimeter: 'ellipse',
    render: ({ w, h, style }) => (
      <>
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={fillOf(style)} fillOpacity={style.fillOpacity} {...strokeAttrs(style)} />
        <ellipse cx={w / 2} cy={h / 2} rx={w * 0.3} ry={h * 0.3} fill={style.stroke} stroke="none" />
      </>
    ),
    textPlacement: 'below',
    drawio: 'ellipse;shape=endState;fillColor=#000000;',
  },
  {
    kind: 'uml.node',
    label: 'Node',
    params: [param.px('size', 'Depth', 14, { drawioDefault: 20 })],
    render: ({ w, h, style, params }) => {
      const d = Math.min(pn(params, 'size'), w, h);
      return (
        <>
          <Body d={`M0,${d} H${w - d} V${h} H0 Z`} s={style} />
          <Body d={`M0,${d} L${d},0 H${w} L${w - d},${d} Z`} s={style} />
          <Body d={`M${w - d},${d} L${w},0 V${h - d} L${w - d},${h} Z`} s={style} />
          <path d={`M${w - d},${d} L${w},0 V${h - d} L${w - d},${h} Z`} fill="#000" fillOpacity={0.06} stroke="none" />
        </>
      );
    },
    handles: ({ w, h, p }) => {
      const d = Math.min(pn(p, 'size'), w, h);
      return [handle(w - d, d, (pt) => ({ params: { size: Math.round(Math.max(0, (w - pt.x + pt.y) / 2)) } }))];
    },
    textBox: (w, h, p) => {
      const d = Math.min(pn(p, 'size'), w, h);
      return { x: 6, y: d + 4, w: Math.max(1, w - d - 12), h: Math.max(1, h - d - 8) };
    },
    drawio: 'shape=cube;size=14;flipH=1;whiteSpace=wrap;',
  },
  {
    kind: 'uml.lifeline',
    label: 'Lifeline',
    rounded: true,
    params: [param.px('size', 'Header', 40)],
    render: ({ w, h, style, params }) => {
      const hh = Math.min(pn(params, 'size'), h);
      return (
        <>
          <Detail d={`M${w / 2},${hh} V${h}`} s={{ ...style, strokeStyle: 'dashed' }} />
          <RoundRect w={w} h={hh} s={style} />
        </>
      );
    },
    handles: ({ w, h, p }) => [handle(w * 0.75, Math.min(pn(p, 'size'), h), (pt) => ({ params: { size: Math.round(Math.min(h, pt.y)) } }))],
    textBox: (w, h, p) => ({ x: 6, y: 0, w: w - 12, h: Math.max(1, Math.min(pn(p, 'size'), h)) }),
    drawio: 'shape=umlLifeline;perimeter=lifelinePerimeter;size=40;whiteSpace=wrap;',
  },
  {
    kind: 'uml.frame',
    label: 'Fragment',
    container: true,
    params: [param.px('width', 'Tab width', 84, { drawioDefault: 60 }), param.px('height', 'Tab height', 24, { drawioDefault: 30 })],
    render: ({ w, h, style, params }) => {
      const lw = Math.min(w, pn(params, 'width'));
      const th = Math.min(h, pn(params, 'height'));
      const c = Math.min(8, lw, th / 3);
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          <Body d={`M0,0 H${lw} V${th - c} L${lw - c},${th} H0 Z`} s={{ ...style, fill: style.fill === 'none' ? '#ffffff' : style.fill }} />
        </>
      );
    },
    handles: ({ w, h, p }) => [
      handle(Math.min(w, pn(p, 'width')), Math.min(h, pn(p, 'height')), (pt) => ({ params: { width: Math.round(pt.x), height: Math.round(pt.y) } }), 'width'),
    ],
    textBox: (w, h, p) => ({ x: 6, y: 0, w: Math.max(1, Math.min(w, pn(p, 'width')) - 14), h: Math.max(1, Math.min(h, pn(p, 'height'))) }),
    drawio: 'shape=umlFrame;width=84;height=24;whiteSpace=wrap;',
  },

  // ----- ERD ----------------------------------------------------------------
  {
    kind: 'erd.entity',
    label: 'Entity',
    rounded: true,
    textPlacement: 'custom',
    autoGrow: true,
    render: Compartments,
    drawio: 'swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;',
  },
  {
    kind: 'erd.weakEntity',
    label: 'Weak entity',
    render: ({ w, h, style }) => (
      <>
        <RoundRect w={w} h={h} s={style} r={0} />
        <rect x={4} y={4} width={Math.max(1, w - 8)} height={Math.max(1, h - 8)} fill="none" {...strokeAttrs(style)} />
      </>
    ),
    textBox: (w, h) => inset(w, h, 10),
    drawio: 'shape=ext;double=1;whiteSpace=wrap;',
  },
  {
    kind: 'erd.multivalued',
    label: 'Multivalued attribute',
    perimeter: 'ellipse',
    render: ({ w, h, style }) => (
      <>
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={fillOf(style)} fillOpacity={style.fillOpacity} {...strokeAttrs(style)} />
        <ellipse cx={w / 2} cy={h / 2} rx={Math.max(1, w / 2 - 4)} ry={Math.max(1, h / 2 - 4)} fill="none" {...strokeAttrs(style)} />
      </>
    ),
    textBox: (w, h) => ({ x: w * 0.14, y: h * 0.15, w: w * 0.72, h: h * 0.7 }),
    drawio: 'ellipse;shape=doubleEllipse;whiteSpace=wrap;',
  },

  // ----- C4 model -----------------------------------------------------------
  {
    kind: 'c4.person',
    label: 'Person',
    textPlacement: 'custom',
    render: ({ w, h, style, text }) => {
      const r = Math.min(w * 0.2, h * 0.21);
      const top = r * 1.7;
      return (
        <>
          <RoundRect y={top} w={w} h={h - top} s={style} r={Math.min(r * 1.1, (h - top) / 2)} />
          <circle cx={w / 2} cy={r} r={r} fill={fillOf(style)} fillOpacity={style.fillOpacity} {...strokeAttrs(style)} />
          <C4Text box={{ x: 12, y: top + r * 0.5, w: w - 24, h: h - top - r * 0.6 }} text={text} style={style} />
        </>
      );
    },
    drawio: 'html=1;shape=mxgraph.c4.person2;whiteSpace=wrap;align=center;metaEdit=1;points=[[0.5,0,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0]];resizable=0;',
  },
  {
    kind: 'c4.box',
    label: 'C4 element',
    rounded: true,
    textPlacement: 'custom',
    render: ({ w, h, style, text }) => (
      <>
        <RoundRect w={w} h={h} s={style} />
        <C4Text box={inset(w, h, 12)} text={text} style={style} />
      </>
    ),
    drawio: 'rounded=1;whiteSpace=wrap;html=1;arcSize=6;',
  },
  {
    kind: 'c4.database',
    label: 'C4 database',
    textPlacement: 'custom',
    params: [param.px('size', 'Depth', 15, { max: 500 })],
    handles: ({ w, h, p }) => [handle(w / 2, cylRy(w, h, p.size), (pt) => ({ params: { size: Math.round(Math.min(pt.y, h / 2)) } }))],
    render: (ctx) => (
      <>
        <Cylinder {...ctx} />
        <C4Text
          box={{ x: 10, y: cylRy(ctx.w, ctx.h, ctx.params?.size) * 2 + 2, w: ctx.w - 20, h: ctx.h - cylRy(ctx.w, ctx.h, ctx.params?.size) * 3 - 4 }}
          text={ctx.text}
          style={ctx.style}
        />
      </>
    ),
    drawio: 'shape=cylinder3;size=15;boundedLbl=1;whiteSpace=wrap;html=1;',
  },
  {
    kind: 'c4.queue',
    label: 'C4 queue',
    textPlacement: 'custom',
    render: (ctx) => (
      <>
        <HorizontalCylinder {...ctx} />
        <C4Text box={{ x: 20, y: 8, w: ctx.w - 40 - Math.min(ctx.w * 0.12, 16), h: ctx.h - 16 }} text={ctx.text} style={ctx.style} />
      </>
    ),
    drawio: 'shape=cylinder3;direction=south;size=15;boundedLbl=1;whiteSpace=wrap;html=1;',
  },
  {
    kind: 'c4.browser',
    label: 'C4 web browser',
    rounded: true,
    textPlacement: 'custom',
    render: ({ w, h, style, text }) => {
      const bar = Math.min(26, h * 0.25);
      const dot = { ...style, fill: style.textColor, stroke: 'none' };
      return (
        <>
          <RoundRect w={w} h={h} s={style} />
          <Detail d={`M0,${bar} H${w}`} s={{ ...style, stroke: style.textColor, strokeWidth: 1, strokeStyle: 'solid' }} />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={12 + i * 11} cy={bar / 2} r={3} fill={dot.fill} fillOpacity={0.7} />
          ))}
          <rect x={48} y={bar / 2 - 5} width={Math.max(0, w - 60)} height={10} rx={5} fill={style.textColor} fillOpacity={0.25} />
          <C4Text box={{ x: 12, y: bar + 6, w: w - 24, h: h - bar - 12 }} text={text} style={style} />
        </>
      );
    },
    drawio: 'shape=mxgraph.c4.webBrowserContainer2;whiteSpace=wrap;html=1;',
  },
  {
    kind: 'c4.boundary',
    label: 'Boundary',
    rounded: true,
    container: true,
    textPlacement: 'custom',
    render: ({ w, h, style, text }) => (
      <>
        <RoundRect w={w} h={h} s={style} />
        <C4Text box={{ x: 14, y: 10, w: w - 28, h: h - 24 }} text={text} style={style} />
      </>
    ),
    drawio: 'rounded=1;fontSize=11;whiteSpace=wrap;html=1;dashed=1;arcSize=2;fillColor=none;align=left;verticalAlign=bottom;container=1;',
  },

  // ----- Pack icons (AWS, Azure, GCP, ...) ----------------------------------
  {
    kind: 'icon',
    label: 'Icon',
    textPlacement: 'below',
    boxHit: true,
    render: ({ w, h, icon }) => (icon ? <IconImage path={icon} w={w} h={h} /> : null),
    drawio: 'shape=image;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;',
  },
];

// ----- Images, freehand, tables ------------------------------------------------
defs.push(
  {
    kind: 'image',
    label: 'Image',
    boxHit: true,
    textPlacement: 'below',
    render: ({ w, h, icon, crop, style }) =>
      icon ? (
        <>
          <svg
            width={w}
            height={h}
            viewBox={crop ? `${crop.x} ${crop.y} ${crop.w} ${crop.h}` : '0 0 1 1'}
            preserveAspectRatio="none"
            overflow="hidden"
          >
            <IconImage path={icon} w={1} h={1} stretch />
          </svg>
          {style.stroke !== 'none' && style.strokeWidth > 0 && (
            <rect width={w} height={h} rx={style.radius} fill="none" {...strokeAttrs(style)} />
          )}
        </>
      ) : (
        <rect width={w} height={h} fill="#e2e8f0" stroke="#94a3b8" strokeDasharray="4 3" />
      ),
    drawio: 'shape=image;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;',
  },
  {
    kind: 'freehand',
    label: 'Freehand',
    boxHit: true,
    render: ({ w, h, points, style }) => {
      // Catmull-Rom smoothing; pen strokes with pressure become a filled variable-width outline.
      const g = freehandGeometry(points, w, h, style.strokeWidth);
      if (!g) return null;
      if (!g.outline) return <path d={g.path} fill={fillOf(style)} fillOpacity={style.fillOpacity} {...strokeAttrs(style)} strokeLinecap="round" strokeLinejoin="round" />;
      return (
        <>
          {style.fill !== 'none' && <path d={g.path} fill={fillOf(style)} fillOpacity={style.fillOpacity} stroke="none" />}
          <path d={g.outline} fill={style.stroke === 'none' ? 'none' : style.stroke} fillOpacity={style.strokeOpacity} />
        </>
      );
    },
    drawio: 'shape=mxgraph.basic.rect;fillColor=none;',
  },
  {
    kind: 'table',
    label: 'Table',
    textPlacement: 'custom',
    // Per-cell styles and merged cells: src/interaction/tableRender.tsx.
    render: renderTable,
    drawio: 'shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;',
  },
);

// ----- Network tiles ---------------------------------------------------------
const NETWORK: Array<[string, string, ComponentType<LucideProps>, string]> = [
  ['net.server', 'Server', Server, 'server'],
  ['net.database', 'Database', Database, 'storage'],
  ['net.router', 'Router', Router, 'router'],
  ['net.switch', 'Switch', Network, 'switch'],
  ['net.firewall', 'Firewall', BrickWall, 'firewall'],
  ['net.cloud', 'Cloud', Cloud, 'cloud'],
  ['net.internet', 'Internet', Globe, 'cloud'],
  ['net.loadBalancer', 'Load balancer', Split, 'load_balancer'],
  ['net.storage', 'Storage', HardDrive, 'storage'],
  ['net.container', 'Container', Container, 'server'],
  ['net.cpu', 'Compute', Cpu, 'server'],
  ['net.desktop', 'Desktop', Monitor, 'pc'],
  ['net.laptop', 'Laptop', Laptop, 'laptop'],
  ['net.mobile', 'Mobile', Smartphone, 'mobile'],
  ['net.user', 'User', User, 'user_male'],
  ['net.wifi', 'Wireless', Wifi, 'wireless_hub'],
  ['net.security', 'Security', ShieldCheck, 'firewall'],
  ['net.lock', 'Secret', Lock, 'secured'],
  ['net.mail', 'Mail', Mail, 'mail_server'],
  ['net.printer', 'Printer', Printer, 'printer'],
];
for (const [kind, label, Icon, stencil] of NETWORK) {
  defs.push({
    kind,
    label,
    rounded: true,
    textPlacement: 'below',
    render: iconTile(Icon),
    drawio: `shape=mxgraph.networks.${stencil};verticalLabelPosition=bottom;verticalAlign=top;outlineConnect=0;`,
  });
}

// Custom shapes from mxGraph stencil XML (src/stencils).
defs.push(STENCIL_SHAPE);

// Auto-discovered library modules (src/shapes/libs/*.tsx).
const LIB_MODULES = import.meta.glob<{ shapes?: ShapeDef[]; libraries?: ShapeLibrary[] }>('./libs/*.tsx', { eager: true });
export const EXTRA_LIBRARIES: ShapeLibrary[] = [];
for (const path of Object.keys(LIB_MODULES).sort()) {
  const mod = LIB_MODULES[path];
  if (mod.shapes) defs.push(...mod.shapes);
  if (mod.libraries) EXTRA_LIBRARIES.push(...mod.libraries);
}

export const SHAPES: Record<string, ShapeDef> = Object.fromEntries(defs.map((d) => [d.kind, withParams(d)]));

export function getShapeDef(kind: string): ShapeDef {
  return SHAPES[kind] ?? SHAPES.rectangle;
}

/** Default text box: the bounds inset by 8px. */
export function textBoxOf(def: ShapeDef, w: number, h: number, params?: ParamValues): Rect {
  return def.textBox ? def.textBox(w, h, params) : inset(w, h, 8, 6);
}

export { IconImage };
