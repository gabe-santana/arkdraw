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
import { TextBlock } from './TextLines';
import {
  Body, C4Text, Compartments, Cylinder, Detail, HorizontalCylinder, RoundRect, cloudPath, cylRy, fillOf, iconTile, inset, rr,
  strokeAttrs,
} from './kit';
import type { ShapeDef, ShapeLibrary } from './types';

export { strokeAttrs, splitSections, compartmentHeight, c4Layout, C4Text } from './kit';

const defs: ShapeDef[] = [
  // ----- General ------------------------------------------------------------
  {
    kind: 'rectangle',
    label: 'Rectangle',
    rounded: true,
    render: ({ w, h, style }) => <RoundRect w={w} h={h} s={style} />,
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
    render: ({ w, h, style }) => {
      const i = Math.min(w * 0.25, h * 0.5);
      return <Body d={`M${i},0 H${w - i} L${w},${h / 2} L${w - i},${h} H${i} L0,${h / 2} Z`} s={style} />;
    },
    textBox: (w, h) => inset(w, h, Math.min(w * 0.18, h * 0.4), 6),
    drawio: 'shape=hexagon;perimeter=hexagonPerimeter2;size=0.25;whiteSpace=wrap;',
  },
  {
    kind: 'parallelogram',
    label: 'Parallelogram',
    render: ({ w, h, style }) => {
      const o = Math.min(w * 0.2, h * 0.6);
      return <Body d={`M${o},0 H${w} L${w - o},${h} H0 Z`} s={style} />;
    },
    textBox: (w, h) => inset(w, h, Math.min(w * 0.2, h * 0.6) + 4, 6),
    drawio: 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;',
  },
  {
    kind: 'trapezoid',
    label: 'Trapezoid',
    render: ({ w, h, style }) => {
      const o = Math.min(w * 0.2, h * 0.6);
      return <Body d={`M${o},0 H${w - o} L${w},${h} H0 Z`} s={style} />;
    },
    textBox: (w, h) => inset(w, h, Math.min(w * 0.2, h * 0.6), 6),
    drawio: 'shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;',
  },
  {
    kind: 'cylinder',
    label: 'Cylinder',
    render: Cylinder,
    textBox: (w, h) => ({ x: 6, y: cylRy(w, h) * 2 + 2, w: w - 12, h: h - cylRy(w, h) * 3 - 4 }),
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
    render: ({ w, h, style }) => {
      const bh = h * 0.78;
      const r = rr(w, bh, style.radius);
      return (
        <Body
          d={`M${r},0 H${w - r} Q${w},0 ${w},${r} V${bh - r} Q${w},${bh} ${w - r},${bh} H${w * 0.38} L${w * 0.2},${h} L${w * 0.22},${bh} H${r} Q0,${bh} 0,${bh - r} V${r} Q0,0 ${r},0 Z`}
          s={style}
        />
      );
    },
    textBox: (w, h) => inset(w, h * 0.78, 8),
    drawio: 'shape=callout;perimeter=calloutPerimeter;whiteSpace=wrap;',
  },
  {
    kind: 'blockArrow',
    label: 'Block arrow',
    render: ({ w, h, style }) => {
      const hl = Math.min(w * 0.4, h * 0.8);
      return <Body d={`M0,${h * 0.25} H${w - hl} V0 L${w},${h / 2} L${w - hl},${h} V${h * 0.75} H0 Z`} s={style} />;
    },
    textBox: (w, h) => ({ x: 6, y: h * 0.25, w: w - Math.min(w * 0.4, h * 0.8), h: h * 0.5 }),
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
    render: ({ w, h, style }) => (
      <>
        <RoundRect w={w} h={h} s={style} />
        <Detail d={`M0,${Math.min(36, h)} H${w}`} s={{ ...style, strokeStyle: 'solid', strokeWidth: Math.max(1, style.strokeWidth * 0.75) }} />
      </>
    ),
    textBox: (w) => ({ x: 14, y: 0, w: Math.max(1, w - 28), h: 36 }),
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
    render: ({ w, h, style }) => {
      const a = h * 0.1;
      return <Body d={`M0,0 H${w} V${h - a} Q${w * 0.75},${h - a * 2.5} ${w / 2},${h - a} T0,${h - a} Z`} s={style} />;
    },
    textBox: (w, h) => ({ x: 8, y: 6, w: w - 16, h: h * 0.82 - 8 }),
    drawio: 'shape=document;boundedLbl=1;whiteSpace=wrap;',
  },
  {
    kind: 'flow.predefined',
    label: 'Predefined process',
    render: ({ w, h, style }) => {
      const x = Math.min(14, w * 0.1);
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          <Detail d={`M${x},0 V${h} M${w - x},0 V${h}`} s={style} />
        </>
      );
    },
    textBox: (w, h) => inset(w, h, Math.min(14, w * 0.1) + 6, 6),
    drawio: 'shape=process;backgroundOutline=1;whiteSpace=wrap;',
  },
  {
    kind: 'flow.internalStorage',
    label: 'Internal storage',
    render: ({ w, h, style }) => {
      const x = Math.min(14, w * 0.12);
      const y = Math.min(14, h * 0.18);
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          <Detail d={`M${x},0 V${h} M0,${y} H${w}`} s={style} />
        </>
      );
    },
    textBox: (w, h) => ({ x: Math.min(14, w * 0.12) + 4, y: Math.min(14, h * 0.18) + 2, w: w - Math.min(14, w * 0.12) - 8, h: h - Math.min(14, h * 0.18) - 4 }),
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
    render: ({ w, h, style }) => {
      const tw = Math.min(w * 0.4, 90);
      const th = Math.min(22, h * 0.3);
      return (
        <>
          <Body d={`M0,${th} V0 H${tw} V${th} Z`} s={style} />
          <Body d={`M0,${th} H${w} V${h} H0 Z`} s={style} />
        </>
      );
    },
    textBox: (w, h) => ({ x: 8, y: Math.min(22, h * 0.3) + 4, w: w - 16, h: h - Math.min(22, h * 0.3) - 8 }),
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
    render: ({ w, h, style }) => {
      const f = Math.min(16, w * 0.25, h * 0.25);
      return (
        <>
          <Body d={`M0,0 H${w - f} L${w},${f} V${h} H0 Z`} s={style} />
          <Detail d={`M${w - f},0 V${f} H${w}`} s={style} />
        </>
      );
    },
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
    render: ({ w, h, style }) => {
      const d = Math.min(14, w * 0.12, h * 0.12);
      return (
        <>
          <Body d={`M0,${d} H${w - d} V${h} H0 Z`} s={style} />
          <Body d={`M0,${d} L${d},0 H${w} L${w - d},${d} Z`} s={style} />
          <Body d={`M${w - d},${d} L${w},0 V${h - d} L${w - d},${h} Z`} s={style} />
          <path d={`M${w - d},${d} L${w},0 V${h - d} L${w - d},${h} Z`} fill="#000" fillOpacity={0.06} stroke="none" />
        </>
      );
    },
    textBox: (w, h) => {
      const d = Math.min(14, w * 0.12, h * 0.12);
      return { x: 6, y: d + 4, w: w - d - 12, h: h - d - 8 };
    },
    drawio: 'shape=cube;size=14;flipH=1;whiteSpace=wrap;',
  },
  {
    kind: 'uml.lifeline',
    label: 'Lifeline',
    rounded: true,
    render: ({ w, h, style }) => {
      const hh = Math.min(40, h);
      return (
        <>
          <Detail d={`M${w / 2},${hh} V${h}`} s={{ ...style, strokeStyle: 'dashed' }} />
          <RoundRect w={w} h={hh} s={style} />
        </>
      );
    },
    textBox: (w, h) => ({ x: 6, y: 0, w: w - 12, h: Math.min(40, h) }),
    drawio: 'shape=umlLifeline;perimeter=lifelinePerimeter;size=40;whiteSpace=wrap;',
  },
  {
    kind: 'uml.frame',
    label: 'Fragment',
    container: true,
    render: ({ w, h, style }) => {
      const lw = Math.min(w * 0.4, 84);
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={0} />
          <Body d={`M0,0 H${lw} V16 L${lw - 8},24 H0 Z`} s={{ ...style, fill: style.fill === 'none' ? '#ffffff' : style.fill }} />
        </>
      );
    },
    textBox: (w) => ({ x: 6, y: 0, w: Math.min(w * 0.4, 84) - 14, h: 24 }),
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
    render: (ctx) => (
      <>
        <Cylinder {...ctx} />
        <C4Text
          box={{ x: 10, y: cylRy(ctx.w, ctx.h) * 2 + 2, w: ctx.w - 20, h: ctx.h - cylRy(ctx.w, ctx.h) * 3 - 4 }}
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
      if (!points || points.length < 2) return null;
      const P = points.map((p) => ({ x: p.x * w, y: p.y * h }));
      // Quadratic smoothing through midpoints.
      let d = `M${P[0].x},${P[0].y}`;
      for (let i = 1; i < P.length - 1; i++) {
        const mx = (P[i].x + P[i + 1].x) / 2;
        const my = (P[i].y + P[i + 1].y) / 2;
        d += ` Q${P[i].x},${P[i].y} ${mx},${my}`;
      }
      d += ` L${P[P.length - 1].x},${P[P.length - 1].y}`;
      return <path d={d} fill={fillOf(style)} fillOpacity={style.fillOpacity} {...strokeAttrs(style)} strokeLinecap="round" />;
    },
    drawio: 'shape=mxgraph.basic.rect;fillColor=none;',
  },
  {
    kind: 'table',
    label: 'Table',
    textPlacement: 'custom',
    render: ({ w, h, table, style }) => {
      if (!table) return <RoundRect w={w} h={h} s={style} />;
      const tw = table.cols.reduce((a, b) => a + b, 0) || 1;
      const th = table.rows.reduce((a, b) => a + b, 0) || 1;
      const sx = w / tw;
      const sy = h / th;
      const xs = [0];
      for (const c of table.cols) xs.push(xs[xs.length - 1] + c * sx);
      const ys = [0];
      for (const r of table.rows) ys.push(ys[ys.length - 1] + r * sy);
      const line = { ...style, strokeStyle: 'solid' as const };
      return (
        <>
          <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, 6)} />
          {table.header && <rect x={0} y={0} width={w} height={ys[1]} fill={style.stroke} fillOpacity={0.08} />}
          {xs.slice(1, -1).map((x, i) => (
            <Detail key={`c${i}`} d={`M${x},0 V${h}`} s={line} />
          ))}
          {ys.slice(1, -1).map((y, i) => (
            <Detail key={`r${i}`} d={`M0,${y} H${w}`} s={line} />
          ))}
          {table.cells.map((row, r) =>
            row.map((cell, c) =>
              cell ? (
                <TextBlock
                  key={`${r}-${c}`}
                  box={{ x: xs[c] + 6, y: ys[r] + 2, w: Math.max(1, xs[c + 1] - xs[c] - 12), h: Math.max(1, ys[r + 1] - ys[r] - 4) }}
                  text={cell}
                  style={table.header && r === 0 ? { ...style, bold: true } : style}
                />
              ) : null,
            ),
          )}
        </>
      );
    },
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

// Auto-discovered library modules (src/shapes/libs/*.tsx).
const LIB_MODULES = import.meta.glob<{ shapes?: ShapeDef[]; libraries?: ShapeLibrary[] }>('./libs/*.tsx', { eager: true });
export const EXTRA_LIBRARIES: ShapeLibrary[] = [];
for (const path of Object.keys(LIB_MODULES).sort()) {
  const mod = LIB_MODULES[path];
  if (mod.shapes) defs.push(...mod.shapes);
  if (mod.libraries) EXTRA_LIBRARIES.push(...mod.libraries);
}

export const SHAPES: Record<string, ShapeDef> = Object.fromEntries(defs.map((d) => [d.kind, d]));

export function getShapeDef(kind: string): ShapeDef {
  return SHAPES[kind] ?? SHAPES.rectangle;
}

/** Default text box: the bounds inset by 8px. */
export function textBoxOf(def: ShapeDef, w: number, h: number): Rect {
  return def.textBox ? def.textBox(w, h) : inset(w, h, 8, 6);
}

export { IconImage };
