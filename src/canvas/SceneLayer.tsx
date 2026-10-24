/**
 * The diagram content layer. Each element subscribes to its own slice of the
 * store, so dragging one shape re-renders only that shape and the connectors
 * attached to it — the key to staying at 60fps with large diagrams. Pan/zoom
 * only touches the single transform group.
 */
import { createContext, memo, useContext, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { ConnectorElement, DiagramElement, PageSettings, Vec } from '@/model/types';
import { isHidden, renderOrder, useEditor } from '@/store/editor';
import { boundsOf, computeJumps, connectorGeometry, routeObstacles } from '@/lib/connectorGeometry';
import { cn } from '@/lib/cn';
import { sequenceDuration, useClock } from '@/animation/timeline';
import { iconUrl } from '@/shapes/IconImage';
import { ConnectorBody, LabelVarsContext, ShapeBody, SvgDefs, type AnimFrame } from './ElementBodies';
import { paperSize } from './paper';
import { editorPlaceholderLookup, editorPlaceholderSignature } from '@/automation/placeholders';
import { useDarkElement } from '@/styling/darkColors';

/** Build-sequence length while previewing; null when not playing. */
const PlaybackContext = createContext<number | null>(null);
const JumpsContext = createContext<Map<string, Vec[]>>(new Map());
const PageShadowContext = createContext(false);

export function SceneLayer({ dark }: { dark: boolean }) {
  const order = useEditor(
    useShallow((s) => {
      const visible = renderOrder(s.doc).filter((id) => !isHidden(s.doc, s.doc.elements[id]));
      if (!s.tagFilter.length) return visible;
      // Tag filter: shapes need a matching tag; connectors need both ends visible.
      const shown = new Set(visible.filter((id) => {
        const el = s.doc.elements[id];
        return el.type !== 'shape' || el.tags?.some((t) => s.tagFilter.includes(t));
      }));
      return visible.filter((id) => {
        const el = s.doc.elements[id];
        if (el.type === 'shape') return shown.has(id);
        return (!el.source.elementId || shown.has(el.source.elementId)) && (!el.target.elementId || shown.has(el.target.elementId));
      });
    }),
  );
  const elements = useEditor((s) => s.doc.elements);
  const camera = useEditor((s) => s.camera);
  const adapt = useEditor((s) => s.settings.adaptColors);
  const playing = useEditor((s) => s.playing);
  const doc = useEditor((s) => (s.playing ? s.doc : null));
  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const pageIndex = useEditor((s) => s.pages.findIndex((p) => p.id === s.activePageId));
  const pageCount = useEditor((s) => s.pages.length);
  const fileName = useEditor((s) => s.file.name);
  const seq = useMemo(() => (doc ? sequenceDuration(doc) : 0), [doc]);
  const jumps = useMemo(() => computeJumps(order, elements), [order, elements]);
  // Inherited %placeholder% values (containers, layer, page, document); the signature busts the memo when they change.
  const placeholderSig = useEditor(editorPlaceholderSignature);
  const vars = useMemo(
    () => ({ pageName: page?.name ?? 'Page 1', pageNumber: pageIndex + 1, pageCount, fileName: fileName.replace(/\.opendraw$/i, ''), lookup: editorPlaceholderLookup, language: page?.settings.language }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page?.name, pageIndex, pageCount, fileName, placeholderSig, page?.settings.language],
  );
  const settings = page?.settings;
  const labelBg = settings?.background ?? (dark && !adapt ? '#000000' : '#f7f7f9');

  return (
    <svg className={cn('absolute inset-0 h-full w-full', adapt && 'diagram-adapt')} style={{ overflow: 'visible' }}>
      <SvgDefs />
      <PlaybackContext.Provider value={playing ? seq : null}>
        <JumpsContext.Provider value={jumps}>
          <PageShadowContext.Provider value={!!settings?.shadow}>
            <LabelVarsContext.Provider value={vars}>
              <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.z})`}>
                {settings && <PageBackdrop settings={settings} order={order} />}
                {order.map((id) => (
                  <ElementView key={id} id={id} labelBg={labelBg} darkAdapt={dark && adapt} />
                ))}
              </g>
            </LabelVarsContext.Provider>
          </PageShadowContext.Provider>
        </JumpsContext.Provider>
      </PlaybackContext.Provider>
    </svg>
  );
}

/** Page tiles (page view) and the background image, behind the diagram. */
function PageBackdrop({ settings, order }: { settings: PageSettings; order: string[] }) {
  const bounds = useEditor((s) => {
    if (!settings.pageView) return null;
    let x1 = 0, y1 = 0, x2 = 1, y2 = 1;
    for (const id of order) {
      const el = s.doc.elements[id];
      if (el?.type !== 'shape') continue;
      const b = boundsOf(el);
      x1 = Math.min(x1, b.x);
      y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.w);
      y2 = Math.max(y2, b.y + b.h);
    }
    return `${x1}|${y1}|${x2}|${y2}`;
  });
  const { w: pw, h: ph } = paperSize(settings);
  const tiles: Array<{ x: number; y: number }> = [];
  if (bounds) {
    const [x1, y1, x2, y2] = bounds.split('|').map(Number);
    for (let ty = Math.floor(y1 / ph); ty * ph < y2 && ty < 200; ty++) {
      for (let tx = Math.floor(x1 / pw); tx * pw < x2 && tiles.length < 400; tx++) tiles.push({ x: tx * pw, y: ty * ph });
    }
  }
  return (
    <g pointerEvents="none">
      {tiles.map((t, i) => (
        <rect key={i} x={t.x} y={t.y} width={pw} height={ph} fill={settings.background ?? '#ffffff'} stroke="#cbd5e1" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {settings.backgroundImage && (
        <image href={iconUrl(settings.backgroundImage)} x={0} y={0} width={settings.paperW ?? pw} height={settings.paperH ?? ph} preserveAspectRatio="xMinYMin meet" opacity={0.9} />
      )}
    </g>
  );
}

function* shapesOf(elements: Record<string, DiagramElement>, order: string[]) {
  for (const id of order) {
    const e = elements[id];
    if (e?.type === 'shape') yield e;
  }
}

const isAnimated = (el: DiagramElement | undefined) =>
  !!el && ((!!el.animation && el.animation.kind !== 'none') || !!el.reveal);

/** Current animation frame for an element, or undefined when static. */
function useFrame(animated: boolean): AnimFrame | undefined {
  const seq = useContext(PlaybackContext);
  const active = seq !== null && animated;
  const t = useClock((s) => (active ? s.t : 0));
  return active ? { t, seq: seq! } : undefined;
}

const ElementView = memo(function ElementView({ id, labelBg, darkAdapt }: { id: string; labelBg: string; darkAdapt?: boolean }) {
  const el = useDarkElement(useEditor((s) => s.doc.elements[id]), !!darkAdapt);
  const editing = useEditor((s) => s.editingId === id);
  if (!el) return null;
  if (el.type === 'shape') return <ShapeView el={el} editing={editing} />;
  return <ConnectorView el={el} editing={editing} labelBg={labelBg} />;
});

function ShapeView({ el, editing }: { el: Extract<DiagramElement, { type: 'shape' }>; editing: boolean }) {
  const frame = useFrame(isAnimated(el));
  const pageShadow = useContext(PageShadowContext);
  return <ShapeBody el={el} interactive hideText={editing} frame={frame} pageShadow={pageShadow} />;
}

const NO_JUMPS: Vec[] = [];

function ConnectorView({ el, editing, labelBg }: { el: ConnectorElement; editing: boolean; labelBg: string }) {
  const src = useEditor((s) => (el.source.elementId ? s.doc.elements[el.source.elementId] : undefined));
  const tgt = useEditor((s) => (el.target.elementId ? s.doc.elements[el.target.elementId] : undefined));
  const jumps = useContext(JumpsContext).get(el.id) ?? NO_JUMPS;
  // Attached to another connector: its geometry depends on its own ends, so resolve against the whole doc.
  const all = useEditor((s) => (src?.type === 'connector' || tgt?.type === 'connector' ? s.doc.elements : null));
  const lookup = useMemo(
    () => (all ? (id: string) => all[id] : (id: string) => (id === src?.id ? src : id === tgt?.id ? tgt : undefined)),
    [src, tgt, all],
  );
  // Nearby shapes to route around; shallow-compared so unrelated edits don't re-route.
  const obstacles = useEditor(
    useShallow((s) => routeObstacles(el, shapesOf(s.doc.elements, s.doc.order), (id) => s.doc.elements[id])),
  );
  const geometry = useMemo(() => connectorGeometry(el, lookup, obstacles.map(boundsOf), jumps), [el, lookup, obstacles, jumps]);
  // A connector never appears before the shapes it connects.
  const revealStep = Math.max(el.reveal ?? 0, src?.reveal ?? 0, tgt?.reveal ?? 0);
  const frame = useFrame(isAnimated(el) || isAnimated(src) || isAnimated(tgt));
  return (
    <ConnectorBody
      el={el}
      lookup={() => undefined}
      geometry={geometry}
      interactive
      hideLabel={editing}
      labelBg={labelBg}
      frame={frame}
      revealStep={revealStep}
    />
  );
}
