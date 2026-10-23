/**
 * Edit Connection Points (draw.io): a shape's connection points as a list of
 * x,y fractions of its box. Saving stores them on the element
 * (`connectionPoints`), replacing the shape's defaults; Reset restores them.
 */
import { useState } from 'react';
import { create } from 'zustand';
import { Plus, Trash2 } from 'lucide-react';
import type { ShapeElement, Vec } from '@/model/types';
import { isShape } from '@/model/types';
import { connectionPointsOf, defaultConnectionPoints } from '@/lib/connectionPoints';
import { getShapeDef } from '@/shapes/registry';
import { useEditor } from '@/store/editor';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { NumberField } from '@/ui/controls';
import { Section } from './sections';

export const useConnectionPointsDialog = create<{ id: string | null }>(() => ({ id: null }));

/** Opens the dialog for the single selected shape (command palette / menus). */
export function editConnectionPoints() {
  const s = useEditor.getState();
  const el = s.selection.length === 1 ? s.doc.elements[s.selection[0]] : undefined;
  if (isShape(el)) useConnectionPointsDialog.setState({ id: el.id });
}

export function ConnectionPointsDialog() {
  const id = useConnectionPointsDialog((s) => s.id);
  const el = useEditor((s) => (id ? s.doc.elements[id] : undefined));
  const close = () => useConnectionPointsDialog.setState({ id: null });
  return (
    <Dialog open={!!id && isShape(el)} onClose={close} className="w-[380px]">
      {isShape(el) && <Body key={el.id} el={el} close={close} />}
    </Dialog>
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const same = (a: Vec[], b: Vec[]) => a.length === b.length && a.every((p, i) => p.x === b[i].x && p.y === b[i].y);

function Body({ el, close }: { el: ShapeElement; close: () => void }) {
  const [pts, setPts] = useState<Vec[]>(() => connectionPointsOf(el).map((p) => ({ ...p })));
  const defaults = defaultConnectionPoints(el.kind);
  const save = () => {
    const custom = same(pts, defaults) ? undefined : pts.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }));
    useEditor.getState().updateElements({ [el.id]: { connectionPoints: custom } });
    close();
  };
  const set = (i: number, patch: Partial<Vec>) => setPts((cur) => cur.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  return (
    <div onKeyDown={(e) => e.stopPropagation()}>
      <DialogHeader title="Edit connection points" subtitle="Positions as fractions of the shape (0 = left/top, 1 = right/bottom)" onClose={close} />
      <div className="flex gap-4 px-5 pb-2">
        <Preview el={el} pts={pts} />
        <div className="scroll-thin max-h-[300px] min-w-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {pts.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
              <NumberField label="X" value={p.x} min={0} max={1} step={0.05} precision={3} onChange={(x) => set(i, { x })} />
              <NumberField label="Y" value={p.y} min={0} max={1} step={0.05} precision={3} onChange={(y) => set(i, { y })} />
              <button
                aria-label={`Remove point ${i + 1}`}
                title="Remove point"
                onClick={() => setPts((cur) => cur.filter((_, k) => k !== i))}
                className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {!pts.length && <p className="text-[12px] text-subtle">No points: connectors will only float to the outline.</p>}
          <button
            onClick={() => setPts((cur) => [...cur, { x: 0.5, y: 0.5 }])}
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[12px] text-accent hover:bg-accent-soft"
          >
            <Plus className="size-3.5" /> Add point
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
        <Button variant="ghost" onClick={() => setPts(defaults.map((p) => ({ ...p })))}>
          Reset to default
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The shape's box with its points, normalized to a small square-ish frame. */
function Preview({ el, pts }: { el: ShapeElement; pts: Vec[] }) {
  const W = 120;
  const H = Math.max(40, Math.min(160, (W * el.h) / Math.max(1, el.w)));
  const perimeter = getShapeDef(el.kind).perimeter ?? 'rect';
  return (
    <svg width={W + 16} height={H + 16} className="shrink-0 rounded-lg bg-panel-2" aria-hidden>
      {perimeter === 'ellipse' ? (
        <ellipse cx={8 + W / 2} cy={8 + H / 2} rx={W / 2} ry={H / 2} fill="none" stroke="var(--line)" strokeWidth={1.5} />
      ) : perimeter === 'diamond' ? (
        <path d={`M${8 + W / 2},8 L${8 + W},${8 + H / 2} L${8 + W / 2},${8 + H} L8,${8 + H / 2} Z`} fill="none" stroke="var(--line)" strokeWidth={1.5} />
      ) : (
        <rect x={8} y={8} width={W} height={H} rx={3} fill="none" stroke="var(--line)" strokeWidth={1.5} />
      )}
      {pts.map((p, i) => {
        const x = 8 + clamp01(p.x) * W;
        const y = 8 + clamp01(p.y) * H;
        return <path key={i} d={`M${x - 3.5},${y - 3.5} L${x + 3.5},${y + 3.5} M${x - 3.5},${y + 3.5} L${x + 3.5},${y - 3.5}`} stroke="var(--selection)" strokeWidth={1.6} strokeLinecap="round" />;
      })}
    </svg>
  );
}

/** Format panel entry point for a single shape. */
export function ConnectionPointsSection({ shape }: { shape: ShapeElement }) {
  const n = connectionPointsOf(shape).length;
  return (
    <Section
      title="Connection points"
      action={
        <button onClick={() => useConnectionPointsDialog.setState({ id: shape.id })} className="flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium text-accent hover:bg-accent-soft">
          Edit…
        </button>
      }
    >
      <p className="text-[11px] leading-relaxed text-subtle">
        {n} point{n === 1 ? '' : 's'}{shape.connectionPoints ? ' (custom)' : ''}. Drop a connector end on one to fix it there; hold Shift to fix it anywhere on the outline.
      </p>
    </Section>
  );
}
