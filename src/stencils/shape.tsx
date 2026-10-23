/**
 * The `stencil` shape kind: renders the element's own mxGraph stencil XML
 * (`ShapeElement.stencil`) through the regular ShapeBody pipeline, so canvas,
 * thumbnails, sketch mode and every export format draw it identically.
 *
 * Imported by the shape registry; must not import the registry itself.
 */
import { Fragment, type ReactNode } from 'react';
import type { ElementStyle } from '@/model/types';
import { FONT_STACKS } from '@/model/defaults';
import type { ShapeDef, ShapeRenderContext } from '@/shapes/types';
import { tryParseStencil } from './parse';
import { renderStencil, type StencilPrim } from './render';
import { resolveStencil } from './registry';

export const STENCIL_KIND = 'stencil';

/** A stencil used when a stencil shape has no (or invalid) XML. */
export const FALLBACK_STENCIL = `<shape name="Shape" w="100" h="60" aspect="variable" strokewidth="inherit">
  <connections>
    <constraint x="0.5" y="0" perimeter="1" name="N"/>
    <constraint x="1" y="0.5" perimeter="1" name="E"/>
    <constraint x="0.5" y="1" perimeter="1" name="S"/>
    <constraint x="0" y="0.5" perimeter="1" name="W"/>
  </connections>
  <background>
    <rect x="0" y="0" w="100" h="60"/>
  </background>
  <foreground>
    <fillstroke/>
  </foreground>
</shape>`;

const safeHref = (src: string) => (/^(data:image\/|https?:|blob:|\/|\.\/)/i.test(src) ? src : undefined);

/** SVG for a list of stencil primitives. */
export function primsToSvg(prims: StencilPrim[]): ReactNode {
  return prims.map((p, i) => {
    if (p.type === 'path') {
      return (
        <path
          key={i}
          d={p.d}
          fill={p.fill}
          fillOpacity={p.fillOpacity}
          stroke={p.stroke}
          strokeWidth={p.stroke === 'none' ? undefined : p.strokeWidth}
          strokeOpacity={p.strokeOpacity}
          strokeDasharray={p.dash}
          strokeLinejoin={p.linejoin}
          strokeLinecap={p.linecap}
          strokeMiterlimit={p.miterlimit}
          opacity={p.opacity}
        />
      );
    }
    if (p.type === 'text') {
      const fam = p.family ? `${p.family}, ${FONT_STACKS.sans}` : undefined;
      return (
        <text
          key={i}
          x={p.x}
          y={p.y}
          fill={p.color}
          fontSize={p.size}
          fontFamily={fam}
          fontWeight={p.bold ? 700 : undefined}
          fontStyle={p.italic ? 'italic' : undefined}
          textDecoration={p.underline ? 'underline' : undefined}
          textAnchor={p.anchor}
          dominantBaseline={p.baseline}
          opacity={p.opacity}
          transform={p.rotation ? `rotate(${p.rotation} ${p.x} ${p.y})` : undefined}
        >
          {p.str}
        </text>
      );
    }
    const href = safeHref(p.src);
    if (!href) return <Fragment key={i} />;
    const flip = p.flipH || p.flipV;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    return (
      <image
        key={i}
        href={href}
        x={p.x}
        y={p.y}
        width={p.w}
        height={p.h}
        opacity={p.opacity}
        preserveAspectRatio={p.aspect ? 'xMidYMid meet' : 'none'}
        transform={flip ? `translate(${cx} ${cy}) scale(${p.flipH ? -1 : 1} ${p.flipV ? -1 : 1}) translate(${-cx} ${-cy})` : undefined}
      />
    );
  });
}

/** Renders stencil XML at w×h, or null when the XML doesn't parse. */
export function renderStencilXml(xml: string | undefined, w: number, h: number, style: ElementStyle): ReactNode | null {
  const st = tryParseStencil(xml);
  if (!st) return null;
  return primsToSvg(renderStencil(st, w, h, style, resolveStencil));
}

function StencilBody({ w, h, style, stencil }: ShapeRenderContext) {
  const node = renderStencilXml(stencil, w, h, style);
  if (node) return <>{node}</>;
  // Missing / broken XML: a dashed placeholder so the shape stays visible and selectable.
  return <rect width={w} height={h} fill="none" stroke="#94a3b8" strokeDasharray="4 3" />;
}

export const STENCIL_SHAPE: ShapeDef = {
  kind: STENCIL_KIND,
  label: 'Custom shape',
  render: (ctx) => <StencilBody {...ctx} />,
  drawio: 'shape=stencil;whiteSpace=wrap;html=1;',
};
