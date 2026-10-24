/**
 * Panel dock: the floating panels (Shapes, Format, Layers) live in a left and
 * a right column. Users drag a panel by its grip to the other side or to
 * another position, or use the grip's menu; the layout is persisted with the
 * rest of the panel state in the UI store.
 *
 * The right column has two tabs: Design (the panels docked there) and AI (the
 * assistant, src/chrome/AiHost.tsx), each with its own width.
 */
import { Fragment, lazy, Suspense, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { ArrowDown, ArrowLeftRight, ArrowUp, GripHorizontal, LoaderCircle, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useUi, type DockLayout, type DockSide, type PanelId } from '@/store/ui';
import { cn } from '@/lib/cn';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { AI_WIDTH, PANEL_WIDTH, PanelResizer } from '@/ui/PanelResizer';
import { Tooltip } from '@/ui/Tooltip';
import { LeftPanel } from '@/panels/LeftPanel';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { LayersPanel } from '@/panels/LayersPanel';
import { t, useT } from '@/i18n';

export const DEFAULT_DOCK: DockLayout = { left: ['shapes'], right: ['format', 'layers'] };

const AiTab = lazy(() => import('@/chrome/AiHost').then((m) => ({ default: m.AiTab })));

const panelName = (id: PanelId): string => t(`chrome.dock.panel.${id}`);
const GAP = 8;

// ---------------------------------------------------------------------------
// Layout helpers (also used for canvas insets and floating controls)
// ---------------------------------------------------------------------------

type UiState = ReturnType<typeof useUi.getState>;

export const sideOf = (dock: DockLayout, id: PanelId): DockSide => (dock.left.includes(id) ? 'left' : 'right');

export function columnVisible(s: Pick<UiState, 'dock' | 'leftOpen' | 'rightOpen' | 'aiOpen'>, side: DockSide): boolean {
  if (side === 'left') return s.leftOpen && s.dock.left.length > 0;
  return s.rightOpen && (s.aiOpen || s.dock.right.length > 0);
}

/** Space a docked column takes from the canvas edge (0 when hidden). */
export function columnInset(s: Pick<UiState, 'dock' | 'leftOpen' | 'rightOpen' | 'aiOpen' | 'leftWidth' | 'rightWidth' | 'aiWidth'>, side: DockSide): number {
  if (!columnVisible(s, side)) return 0;
  return side === 'left' ? s.leftWidth : s.aiOpen ? s.aiWidth : s.rightWidth;
}

export function movePanel(id: PanelId, side: DockSide, index: number) {
  const { dock } = useUi.getState();
  const next: DockLayout = { left: dock.left.filter((p) => p !== id), right: dock.right.filter((p) => p !== id) };
  next[side].splice(Math.max(0, Math.min(index, next[side].length)), 0, id);
  // Dropping on the right shows the Design tab, where the panel landed.
  useUi.getState().set({ dock: next, ...(side === 'left' ? { leftOpen: true } : { rightOpen: true, aiOpen: false }) });
}

/** Toggles the column that holds `id` (View → Shapes panel / Format panel). */
export function togglePanelColumn(id: PanelId) {
  const s = useUi.getState();
  const side = sideOf(s.dock, id);
  if (side === 'left') s.set({ leftOpen: !s.leftOpen });
  else if (s.rightOpen && s.aiOpen) s.set({ aiOpen: false });
  else s.set({ rightOpen: !s.rightOpen });
}

export const panelColumnOpen = (id: PanelId) => {
  const s = useUi.getState();
  return sideOf(s.dock, id) === 'left' ? s.leftOpen : s.rightOpen && !s.aiOpen;
};

/** The AI button and Mod+I: open the AI tab, or go back to Design when it's showing. */
export function toggleAiTab() {
  const s = useUi.getState();
  s.set(s.rightOpen && s.aiOpen ? { aiOpen: false } : { rightOpen: true, aiOpen: true });
}

export const resetDock = () =>
  useUi.getState().set({ dock: DEFAULT_DOCK, leftWidth: PANEL_WIDTH.left, rightWidth: PANEL_WIDTH.right, aiWidth: AI_WIDTH.default, leftOpen: true, rightOpen: true });

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

/**
 * Starts a (potential) panel drag. From the grip, a click without movement
 * opens the menu. From a panel header (`passive`), the press is left alone so
 * header buttons keep working, and only a real drag moves the panel (the click
 * that follows it is swallowed).
 */
function startPanelDrag(id: PanelId, e: React.PointerEvent, onClick: ((x: number, y: number) => void) | null, passive = false) {
  if (e.button !== 0) return;
  if (!passive) e.preventDefault();
  const sx = e.clientX;
  const sy = e.clientY;
  let dragging = false;
  const move = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
    if (!dragging) {
      dragging = true;
      document.body.style.cursor = 'grabbing';
      window.getSelection()?.removeAllRanges();
    }
    useDockDrag.setState({ id, pointer: { x: ev.clientX, y: ev.clientY }, target: dropTarget(id, ev.clientX, ev.clientY) });
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    document.body.style.cursor = '';
    const { target } = useDockDrag.getState();
    useDockDrag.setState({ id: null, target: null, pointer: null });
    if (!dragging) onClick?.(ev.clientX, ev.clientY);
    else {
      if (target) movePanel(id, target.side, target.index);
      // Swallow the click the browser fires after a drag that started on a header button.
      const swallow = (ce: MouseEvent) => {
        ce.stopPropagation();
        ce.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    }
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
  const t = useT();
  const items: MenuEntry[] = [
    { label: other === 'left' ? t('chrome.dock.moveLeft') : t('chrome.dock.moveRight'), icon: <ArrowLeftRight />, onSelect: () => movePanel(id, other, Infinity) },
    { label: t('chrome.dock.moveUp'), icon: <ArrowUp />, disabled: index === 0, onSelect: () => movePanel(id, side, index - 1) },
    { label: t('chrome.dock.moveDown'), icon: <ArrowDown />, disabled: index === count - 1, onSelect: () => movePanel(id, side, index + 1) },
    { type: 'separator' },
    { label: t('chrome.dock.reset'), icon: <RotateCcw />, onSelect: resetDock },
  ];
  return (
    <div
      data-dock-item={id}
      // Panels can also be dragged by their header (anything marked data-dock-handle).
      onPointerDownCapture={(e) => {
        const t = e.target as Element;
        if (!t.closest('[data-dock-handle]') || t.closest('input, textarea, select, [contenteditable]')) return;
        startPanelDrag(id, e, null, true);
      }}
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
        aria-label={t('chrome.dock.handleAria', { panel: panelName(id) })}
        title={t('chrome.dock.handleTitle')}
        onPointerDown={(e) => startPanelDrag(id, e, (x, y) => setMenu({ x, y }))}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className={cn(
          'pointer-events-auto absolute -top-[5px] left-1/2 z-20 flex h-3 w-11 -translate-x-1/2 cursor-grab items-center justify-center rounded-full bg-panel text-subtle shadow-[0_0_0_1px_var(--line)] transition-opacity duration-150 hover:text-fg active:cursor-grabbing',
          menu ? 'opacity-100' : 'opacity-60 focus-visible:opacity-100 group-hover/dock:opacity-100',
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

function RightTabs({ ai }: { ai: boolean }) {
  const t = useT();
  const hasPanels = useUi((s) => s.dock.right.length > 0);
  const show = (tab: 'design' | 'ai') => useUi.getState().set({ aiOpen: tab === 'ai' });
  const tabs = [
    { id: 'design' as const, active: !ai, disabled: !hasPanels, icon: <SlidersHorizontal />, label: t('chrome.rightTabs.design'), hint: t('chrome.rightTabs.designHint'), shortcut: undefined },
    { id: 'ai' as const, active: ai, disabled: false, icon: <Sparkles />, label: t('chrome.rightTabs.ai'), hint: t('chrome.rightTabs.aiHint'), shortcut: 'Mod+I' },
  ];
  return (
    <div
      role="tablist"
      aria-label={t('chrome.rightTabs.aria')}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        e.stopPropagation();
        if (hasPanels) show(ai ? 'design' : 'ai');
      }}
      className="animate-slide-up pointer-events-auto mb-2 grid h-9 shrink-0 grid-cols-2 gap-0.5 rounded-xl bg-panel p-[3px] shadow-panel"
    >
      {tabs.map((tab) => (
        <Tooltip key={tab.id} label={tab.hint} shortcut={tab.shortcut}>
          <button
            type="button"
            role="tab"
            aria-selected={tab.active}
            tabIndex={tab.active ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => show(tab.id)}
            className={cn(
              'flex min-w-0 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[12.5px] font-medium outline-none transition-[background,color] duration-150 focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0',
              tab.active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg',
            )}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

function DropZone({ active, overlay }: { active: boolean; overlay?: boolean }) {
  const t = useT();
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center justify-center rounded-2xl border-2 border-dashed text-[12px] font-medium transition-colors',
        overlay ? 'absolute inset-0 z-10 backdrop-blur-[2px]' : 'flex-1',
        active ? 'border-accent bg-accent/10 text-accent' : overlay ? 'border-line bg-panel/70 text-subtle' : 'border-line text-subtle',
      )}
    >
      {t('chrome.dock.dropHere')}
    </div>
  );
}

export function DockColumn({ side }: { side: DockSide }) {
  const ids = useUi((s) => s.dock[side]);
  const open = useUi((s) => (side === 'left' ? s.leftOpen : s.rightOpen));
  const ai = useUi((s) => side === 'right' && s.aiOpen);
  const width = useUi((s) => (side === 'left' ? s.leftWidth : s.aiOpen ? s.aiWidth : s.rightWidth));
  const drag = useDockDrag();
  const t = useT();
  // The AI tab mounts on first use, then stays mounted while hidden so the conversation survives tab switches.
  const [aiMounted, setAiMounted] = useState(false);
  if (ai && open && !aiMounted) setAiMounted(true);
  const shown = open && (ids.length > 0 || ai);
  const dropping = !!drag.id && drag.target?.side === side;
  // While dragging, an empty or hidden column still shows a drop zone.
  if (!shown && !drag.id) return null;

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
        <>
          {side === 'right' && <RightTabs ai={ai} />}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className={cn('flex min-h-0 flex-1 flex-col', ai && 'hidden')} style={{ gap: GAP }}>
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
            {aiMounted && (
              <div
                role="tabpanel"
                aria-label={t('chrome.rightTabs.ai')}
                className={cn('pointer-events-auto min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-panel shadow-panel', ai ? 'animate-slide-up flex' : 'hidden')}
              >
                <Suspense
                  fallback={
                    <div className="flex flex-1 items-center justify-center text-accent">
                      <LoaderCircle className="size-5 animate-spin" />
                    </div>
                  }
                >
                  <AiTab />
                </Suspense>
              </div>
            )}
            {ai && drag.id && <DropZone active={dropping} overlay />}
          </div>
        </>
      ) : (
        <DropZone active={dropping} />
      )}
      {shown &&
        (ai ? (
          <PanelResizer
            edge="left"
            width={width}
            min={AI_WIDTH.min}
            max={AI_WIDTH.max}
            defaultWidth={AI_WIDTH.default}
            label={t('chrome.dock.resizeAi')}
            onChange={(w) => useUi.getState().set({ aiWidth: w })}
          />
        ) : (
          <PanelResizer
            edge={side === 'left' ? 'right' : 'left'}
            width={width}
            defaultWidth={side === 'left' ? PANEL_WIDTH.left : PANEL_WIDTH.right}
            label={side === 'left' ? t('chrome.dock.resizeLeft') : t('chrome.dock.resizeRight')}
            onChange={(w) => useUi.getState().set(side === 'left' ? { leftWidth: w } : { rightWidth: w })}
          />
        ))}
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
      {panelName(id)}
    </div>
  );
}
