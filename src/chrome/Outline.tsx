/**
 * Outline / minimap (Ctrl+Shift+O): a scaled overview of the page with the
 * visible viewport; click or drag to navigate.
 */
import { useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { isConnector, isShape } from '@/model/types';
import { boxCorners, unionRects } from '@/lib/geometry';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { elementBounds, isHidden, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { useT } from '@/i18n';

const W = 220;
const H = 150;

export function Outline() {
  const open = useUi((s) => s.outlineOpen);
  if (!open) return null;
  return <OutlineBody />;
}

function OutlineBody() {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const camera = useEditor((s) => s.camera);
  const viewport = useEditor((s) => s.viewport);
  const set = useUi((s) => s.set);
  const ref = useRef<SVGSVGElement>(null);

  const view = { x: -camera.x / camera.z, y: -camera.y / camera.z, w: viewport.w / camera.z, h: viewport.h / camera.z };
  const content = useMemo(() => unionRects(doc.order.map((id) => elementBounds(doc.elements[id], doc))), [doc]);
  const world = unionRects([content ?? view, view])!;
  const pad = 40;
  const scale = Math.min(W / (world.w + pad * 2), H / (world.h + pad * 2));
  const ox = (W - world.w * scale) / 2 - world.x * scale;
  const oy = (H - world.h * scale) / 2 - world.y * scale;

  const navigate = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const wx = (clientX - r.left - ox) / scale;
    const wy = (clientY - r.top - oy) / scale;
    const s = useEditor.getState();
    s.setCamera({ ...s.camera, x: viewport.w / 2 - wx * s.camera.z, y: viewport.h / 2 - wy * s.camera.z });
  };

  return (
    <div className="animate-slide-up pointer-events-auto overflow-hidden rounded-xl bg-panel shadow-panel">
      <div className="flex items-center justify-between px-2.5 pt-1.5">
        <span className="text-[11px] font-medium text-muted">{t('chrome.outline.title')}</span>
        <button onClick={() => set({ outlineOpen: false })} className="rounded p-0.5 text-subtle hover:bg-hover hover:text-fg" aria-label={t('chrome.outline.close')}>
          <X className="size-3.5" />
        </button>
      </div>
      <svg
        ref={ref}
        width={W}
        height={H}
        className="block cursor-pointer"
        onPointerDown={(e) => {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          navigate(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => e.buttons && navigate(e.clientX, e.clientY)}
      >
        <g transform={`translate(${ox} ${oy}) scale(${scale})`}>
          {doc.order.map((id) => {
            const el = doc.elements[id];
            if (isHidden(doc, el)) return null;
            if (isShape(el)) {
              return (
                <polygon
                  key={id}
                  points={boxCorners(el).map((p) => `${p.x},${p.y}`).join(' ')}
                  fill={el.style.fill === 'none' ? 'transparent' : el.style.fill}
                  stroke={el.style.stroke === 'none' ? 'var(--fg-subtle)' : el.style.stroke}
                  strokeWidth={1 / scale}
                />
              );
            }
            if (isConnector(el)) {
              const g = connectorGeometryInDoc(el, doc.elements);
              return <polyline key={id} points={g.samples.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--fg-subtle)" strokeWidth={1 / scale} />;
            }
            return null;
          })}
          <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.5 / scale} rx={3 / scale} />
        </g>
      </svg>
    </div>
  );
}
