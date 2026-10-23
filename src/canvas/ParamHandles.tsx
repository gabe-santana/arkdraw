/**
 * draw.io-style yellow diamond handles for parametric shapes (corner size,
 * arrow width, header size…). Shown on a single selected shape whose kind
 * declares `handles`; dragging one edits `el.params` (or the corner radius)
 * as a single undo step, with a small value tooltip.
 *
 * The handles stop pointer propagation, so the canvas gesture machine in
 * useCanvasInteractions never sees these drags.
 */
import { useState } from 'react';
import type { ShapeElement, Vec } from '@/model/types';
import { isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { applyParamPatch, formatParam, handlesOf, localToWorld, paramsOf, worldToLocal } from '@/shapes/params';
import type { ParamPatch, ShapeDef } from '@/shapes/types';
import { isLocked, useEditor } from '@/store/editor';
import { installLaneLayout } from '@/store/laneLayout';
import { clientToWorld } from './viewport';

// Pools grow / restack when lanes are added or resized (one-time store hook).
installLaneLayout();

const FILL = '#facc15';
const EDGE = '#a16207';

/** Tooltip text for a patch: the shown param's formatted value, or the corner radius. */
function describe(def: ShapeDef, el: ShapeElement, patch: ParamPatch, show?: string): string {
  if (patch.style?.radius !== undefined) return `Corner ${patch.style.radius}`;
  const key = show && patch.params && show in patch.params ? show : Object.keys(patch.params ?? {})[0];
  const param = def.params?.find((p) => p.key === key);
  if (!param) return '';
  const all = def.params!.filter((p) => patch.params && p.key in patch.params);
  const values = paramsOf(def, el);
  return all.map((p) => `${p.label} ${formatParam(p, values[p.key])}`).join(' · ');
}

export function ParamHandles() {
  const z = useEditor((s) => s.camera.z);
  const el = useEditor((s) => (s.selection.length === 1 ? s.doc.elements[s.selection[0]] : undefined));
  const editing = useEditor((s) => !!s.editingId);
  const locked = useEditor((s) => (el ? isLocked(s.doc, el) : false));
  const busy = useEditor((s) => !!s.interactionBase);
  const [drag, setDrag] = useState<{ label: string; at: Vec } | null>(null);

  if (!isShape(el) || editing || locked || el.collapsed || (busy && !drag)) return null;
  const def = getShapeDef(el.kind);
  if (!def.handles) return null;
  const px = 1 / z;
  const handles = handlesOf(def, el, px);
  const r = 5.5 * px;

  const start = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const s = useEditor.getState();
    const base = el;
    const origin = { x: e.clientX, y: e.clientY };
    let moved = false;
    s.beginInteraction();
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 2) return;
      moved = true;
      const world = clientToWorld(ev.clientX, ev.clientY);
      // Handle positions depend on the current params, so evaluate against the base element.
      const h = handlesOf(def, base, px)[index];
      if (!h) return;
      const patch = h.drag(worldToLocal(base, world));
      const next = applyParamPatch(def, base, patch);
      useEditor.getState().updateElements({ [base.id]: next });
      const cur = useEditor.getState().doc.elements[base.id];
      const label = isShape(cur) ? describe(def, cur, patch, h.show) : '';
      setDrag({ label, at: world });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
      useEditor.getState().endInteraction();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    setDrag({ label: '', at: clientToWorld(e.clientX, e.clientY) });
  };

  return (
    <g data-param-handles>
      {handles.map((h, i) => {
        const p = localToWorld(el, h);
        return (
          <g key={i} data-param-handle={i} style={{ pointerEvents: 'all', cursor: 'pointer' }} onPointerDown={(e) => start(e, i)}>
            <circle cx={p.x} cy={p.y} r={r * 2} fill="transparent" />
            <rect
              x={p.x - r}
              y={p.y - r}
              width={r * 2}
              height={r * 2}
              transform={`rotate(45 ${p.x} ${p.y})`}
              fill={FILL}
              stroke={EDGE}
              strokeWidth={1 * px}
            />
          </g>
        );
      })}
      {drag?.label && <ValueTip at={drag.at} text={drag.label} px={px} />}
    </g>
  );
}

function ValueTip({ at, text, px }: { at: Vec; text: string; px: number }) {
  const w = (text.length * 6.2 + 14) * px;
  const x = at.x + 14 * px;
  const y = at.y + 14 * px;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={18 * px} rx={5 * px} fill="#1e293b" fillOpacity={0.92} />
      <text
        x={x + w / 2}
        y={y + 12.5 * px}
        fontSize={11 * px}
        fontWeight={600}
        fill="#fff"
        textAnchor="middle"
        fontFamily='"Inter Variable", system-ui, sans-serif'
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {text}
      </text>
    </g>
  );
}
