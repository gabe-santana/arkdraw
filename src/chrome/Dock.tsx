/**
 * Panel dock: the floating panels (Shapes, Format, Layers) live in a left and
 * a right column. Users drag a panel by its grip to the other side or to
 * another position, or use the grip's menu; the layout is persisted with the
 * rest of the panel state in the UI store.
 */
import { Fragment, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { ArrowDown, ArrowLeftRight, ArrowUp, GripHorizontal, RotateCcw } from 'lucide-react';
import { useUi, type DockLayout, type DockSide, type PanelId } from '@/store/ui';
import { cn } from '@/lib/cn';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { PANEL_WIDTH, PanelResizer } from '@/ui/PanelResizer';
import { LeftPanel } from '@/panels/LeftPanel';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { LayersPanel } from '@/panels/LayersPanel';

export const DEFAULT_DOCK: DockLayout = { left: ['shapes'], right: ['format', 'layers'] };

const PANEL_NAMES: Record<PanelId, string> = { shapes: 'Shapes', format: 'Format', layers: 'Layers' };
const GAP = 8;

// ---------------------------------------------------------------------------
// Layout helpers (also used for canvas insets and floating controls)
// ---------------------------------------------------------------------------

type UiState = ReturnType<typeof useUi.getState>;

export const sideOf = (dock: DockLayout, id: PanelId): DockSide => (dock.left.includes(id) ? 'left' : 'right');

export function columnVisible(s: Pick<UiState, 'dock' | 'leftOpen' | 'rightOpen' | 'aiOpen'>, side: DockSide): boolean {
  if (!s.dock[side].length) return false;
  if (side === 'right' && s.aiOpen) return false;
  return side === 'left' ? s.leftOpen : s.rightOpen;
}

/** Space a docked column takes from the canvas edge (0 when hidden). */
export function columnInset(s: Pick<UiState, 'dock' | 'leftOpen' | 'rightOpen' | 'aiOpen' | 'leftWidth' | 'rightWidth'>, side: DockSide): number {
  return columnVisible(s, side) ? (side === 'left' ? s.leftWidth : s.rightWidth) : 0;
}

export function movePanel(id: PanelId, side: DockSide, index: number) {
  const { dock } = useUi.getState();
  const next: DockLayout = { left: dock.left.filter((p) => p !== id), right: dock.right.filter((p) => p !== id) };
  next[side].splice(Math.max(0, Math.min(index, next[side].length)), 0, id);
  useUi.getState().set({ dock: next, ...(side === 'left' ? { leftOpen: true } : { rightOpen: true }) });
}

/** Toggles the column that holds `id` (View → Shapes panel / Format panel). */
export function togglePanelColumn(id: PanelId) {
  const s = useUi.getState();
  const side = sideOf(s.dock, id);
  s.set(side === 'left' ? { leftOpen: !s.leftOpen } : { rightOpen: !s.rightOpen });
}

export const panelColumnOpen = (id: PanelId) => {
  const s = useUi.getState();
  return sideOf(s.dock, id) === 'left' ? s.leftOpen : s.rightOpen;
};

export const resetDock = () => useUi.getState().set({ dock: DEFAULT_DOCK, leftWidth: PANEL_WIDTH.left, rightWidth: PANEL_WIDTH.right, leftOpen: true, rightOpen: true });

// ---------------------------------------------------------------------------
// Drag state
// ---------------------------------------------------------------------------

interface DragState {
  id: PanelId | null;
  target: { side: DockSide; index: number } | null;
  pointer: { x: number; y: number } | null;
}
const useDockDrag = create<DragState>(() => ({ id: null, target: null, pointer: null }));

function dropTarget(id: PanelId, x: number, y: number): DragState['target'] {
  const side: DockSide = x < window.innerWidth / 2 ? 'left' : 'right';
  const items = [...document.querySelectorAll<HTMLElement>(`[data-dock-side="${side}"] [data-dock-item]`)].filter((el) => el.dataset.dockItem !== id);
  const index = items.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.top + r.height / 2 < y;
  }).length;
  return { side, index };
}

function startPanelDrag(id: PanelId, e: React.PointerEvent, onClick: (x: number, y: number) => void) {
  if (e.button !== 0) return;
  e.preventDefault();
  const sx = e.clientX;
  const sy = e.clientY;
  let dragging = false;
  const move = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
    if (!dragging) {
      dragging = true;
      document.body.style.cursor = 'grabbing';
    }
    useDockDrag.setState({ id, pointer: { x: ev.clientX, y: ev.clientY }, target: dropTarget(id, ev.clientX, ev.clientY) });
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    document.body.style.cursor = '';
    const { target } = useDockDrag.getState();
    useDockDrag.setState({ id: null, target: null, pointer: null });
    if (!dragging) onClick(ev.clientX, ev.clientY);
    else if (target) movePanel(id, target.side, target.index);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PanelBody({ id }: { id: PanelId }) {
  if (id === 'shapes') return <LeftPanel />;
  if (id === 'format') return <PropertiesPanel />;
  return <LayersPanel />;
}

function DockItem({ id, side, index, count, grow }: { id: PanelId; side: DockSide; index: number; count: number; grow: boolean }) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const dragging = useDockDrag((s) => s.id === id);
  const other: DockSide = side === 'left' ? 'right' : 'left';
  const items: MenuEntry[] = [
    { label: `Move to ${other} side`, icon: <ArrowLeftRight />, onSelect: () => movePanel(id, other, Infinity) },
    { label: 'Move up', icon: <ArrowUp />, disabled: index === 0, onSelect: () => movePanel(id, side, index - 1) },
    { label: 'Move down', icon: <ArrowDown />, disabled: index === count - 1, onSelect: () => movePanel(id, side, index + 1) },
    { type: 'separator' },
    { label: 'Reset panel layout', icon: <RotateCcw />, onSelect: resetDock },
  ];
  return (
    <div
      data-dock-item={id}
      className={cn(
        'group/dock relative flex min-h-0 flex-col transition-opacity',
        id === 'shapes' && 'min-h-[180px] flex-1',
        id === 'format' && (grow ? 'flex-1' : 'shrink'),
        id === 'layers' && 'max-h-[60%] shrink-0',
        dragging && 'opacity-40',
      )}
    >
      <button
        type="button"
        aria-label={`${PANEL_NAMES[id]} panel: drag to move, click for options`}
        title="Drag to move · click for options"
        onPointerDown={(e) => startPanelDrag(id, e, (x, y) => setMenu({ x, y }))}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className={cn(
          'pointer-events-auto absolute -top-[5px] left-1/2 z-20 flex h-3 w-11 -translate-x-1/2 cursor-grab items-center justify-center rounded-full bg-panel text-subtle shadow-[0_0_0_1px_var(--line)] transition-opacity duration-150 hover:text-fg active:cursor-grabbing',
          menu ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover/dock:opacity-100',
        )}
      >
        <GripHorizontal className="size-3" />
      </button>
      <div className="flex min-h-0 flex-1 flex-col [&>aside]:h-full">
        <PanelBody id={id} />
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} minWidth={200} onClose={() => setMenu(null)} />}
    </div>
  );
}

function DropLine({ show }: { show: boolean }) {
  return (
    <div className={cn('pointer-events-none -my-1 h-0 shrink-0 transition-opacity', show ? 'opacity-100' : 'opacity-0')}>
      <div className="relative -top-[1px] h-[3px] rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]" />
    </div>
  );
}

export function DockColumn({ side }: { side: DockSide }) {
  const ids = useUi((s) => s.dock[side]);
  const open = useUi((s) => (side === 'left' ? s.leftOpen : s.rightOpen));
  const aiOpen = useUi((s) => s.aiOpen);
  const width = useUi((s) => (side === 'left' ? s.leftWidth : s.rightWidth));
  const drag = useDockDrag();
  const hiddenByAi = side === 'right' && aiOpen;
  const shown = open && !hiddenByAi && ids.length > 0;
  const dropping = !!drag.id && drag.target?.side === side;
  // While dragging, an empty or hidden column still shows a drop zone.
  if (!shown && !(drag.id && !hiddenByAi)) return null;

  const growFormat = !ids.includes('shapes');
  const lastFlex = ids.includes('shapes') || growFormat;
  return (
    <div
      data-dock-side={side}
      data-od-panel={side}
      style={{ width }}
      className={cn(
        'absolute bottom-2.5 top-2.5 flex flex-col transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.9,.3,1)]',
        side === 'left' ? 'left-2.5' : 'right-2.5',
      )}
    >
      {shown ? (
        <div className="flex min-h-0 flex-1 flex-col" style={{ gap: GAP }}>
          {ids.map((id, i) => (
            <Fragment key={id}>
              <DropLine show={dropping && drag.target!.index === i && drag.id !== id} />
              {/* Layers sits at the bottom when nothing above it stretches. */}
              {id === 'layers' && !lastFlex && i > 0 && <div className="-mt-2 flex-1" />}
              <DockItem id={id} side={side} index={i} count={ids.length} grow={growFormat && id === 'format'} />
            </Fragment>
          ))}
          <DropLine show={dropping && drag.target!.index >= ids.filter((p) => p !== drag.id).length} />
        </div>
      ) : (
        <div
          className={cn(
            'pointer-events-auto flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed text-[12px] font-medium transition-colors',
            dropping ? 'border-accent bg-accent/10 text-accent' : 'border-line text-subtle',
          )}
        >
          Drop here
        </div>
      )}
      {shown && (
        <PanelResizer
          edge={side === 'left' ? 'right' : 'left'}
          width={width}
          defaultWidth={side === 'left' ? PANEL_WIDTH.left : PANEL_WIDTH.right}
          label={`Resize ${side} panels`}
          onChange={(w) => useUi.getState().set(side === 'left' ? { leftWidth: w } : { rightWidth: w })}
        />
      )}
    </div>
  );
}

/** Small label that follows the pointer while a panel is dragged. */
export function DockDragGhost(): ReactNode {
  const { id, pointer } = useDockDrag();
  if (!id || !pointer) return null;
  return (
    <div
      className="pointer-events-none fixed z-[200] rounded-lg bg-accent px-2.5 py-1 text-[12px] font-medium text-accent-fg shadow-pop"
      style={{ left: pointer.x + 14, top: pointer.y + 10 }}
    >
      {PANEL_NAMES[id]}
    </div>
  );
}
