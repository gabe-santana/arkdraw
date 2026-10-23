/**
 * Static diagram content for the viewer, drawn with the editor's own element
 * renderers. Memoized per page/layer state so pan and zoom only move the
 * camera transform.
 */
import { memo, useMemo } from 'react';
import type { ConnectorElement, DiagramElement, Doc, PageSettings, ShapeElement } from '@/model/types';
import { ConnectorBody, LabelVarsContext, ShapeBody, type LabelVars } from '@/canvas/ElementBodies';
import { boundsOf, computeJumps, connectorGeometry, routeObstacles } from '@/lib/connectorGeometry';
import { iconUrl } from '@/shapes/IconImage';
import { paperSize } from '@/canvas/paper';
import type { Rect } from '@/model/types';

const NO_TOOLTIP = <T extends DiagramElement>(el: T): T => (el.tooltip ? { ...el, tooltip: undefined } : el);

interface Props {
  doc: Doc;
  order: string[];
  settings: PageSettings;
  bounds: Rect | null;
  vars: LabelVars;
  labelBg: string;
}

export const ViewerScene = memo(function ViewerScene({ doc, order, settings, bounds, vars, labelBg }: Props) {
  const content = useMemo(() => {
    const elements = doc.elements;
    const lookup = (id: string) => elements[id];
    const shapes: ShapeElement[] = order.map((id) => elements[id]).filter((e): e is ShapeElement => e?.type === 'shape');
    const jumps = computeJumps(order, elements);
    return order.map((id) => {
      const el = elements[id];
      if (!el) return null;
      // Tooltips are shown by the viewer's own hover card, not the native <title>.
      if (el.type === 'shape') return <ShapeBody key={id} el={NO_TOOLTIP(el)} interactive pageShadow={!!settings.shadow} />;
      const c = el as ConnectorElement;
      const geometry = connectorGeometry(c, lookup, routeObstacles(c, shapes, lookup).map(boundsOf), jumps.get(id) ?? []);
      return <ConnectorBody key={id} el={NO_TOOLTIP(c)} lookup={lookup} geometry={geometry} interactive labelBg={labelBg} />;
    });
  }, [doc, order, settings.shadow, labelBg]);

  const paper = settings.background && bounds;
  const { w: pw, h: ph } = paperSize(settings);
  return (
    <LabelVarsContext.Provider value={vars}>
      {paper && (
        <rect
          x={bounds.x - 32}
          y={bounds.y - 32}
          width={bounds.w + 64}
          height={bounds.h + 64}
          rx={14}
          fill={settings.background!}
          stroke="rgb(20 20 40 / 0.08)"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
      {settings.backgroundImage && (
        <image
          href={iconUrl(settings.backgroundImage)}
          x={0}
          y={0}
          width={settings.paperW ?? pw}
          height={settings.paperH ?? ph}
          preserveAspectRatio="xMinYMin meet"
          opacity={0.9}
          pointerEvents="none"
        />
      )}
      {content}
    </LabelVarsContext.Provider>
  );
});
