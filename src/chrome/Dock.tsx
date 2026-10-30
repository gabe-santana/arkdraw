/**
 * Panel dock: the floating panels (Shapes, Format, Layers) live in a left and
 * a right column. Users drag a panel by its grip to the other side or to
 * another position, or use the grip's menu; the layout is persisted with the
 * rest of the panel state in the UI store.
 *
 * The left column stacks its panels as floating cards. The right column is one
 * full-height card whose tabs are the panels docked there (Design, Layers…)
 * plus AI (the assistant, src/chrome/AiHost.tsx), all at one width.
 */
import { Fragment, lazy, Suspense, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { ArrowDown, ArrowLeftRight, ArrowUp, GripHorizontal, Layers3, LoaderCircle, RotateCcw, Shapes, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useUi, type DockLayout, type DockSide, type PanelId } from '@/store/ui';
import { cn } from '@/lib/cn';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { PANEL_WIDTH, PanelResizer, RIGHT_MAX } from '@/ui/PanelResizer';
import { Tooltip } from '@/ui/Tooltip';
import { LeftPanel } from '@/panels/LeftPanel';
import { PropertiesPanel } from '@/panels/PropertiesPanel';
import { LayersPanel } from '@/panels/LayersPanel';
import { t, useT } from '@/i18n';
import { InTabs } from './panelFrame';

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
export function columnInset(s: Pick<UiState, 'dock' | 'leftOpen' | 'rightOpen' | 'aiOpen' | 'leftWidth' | 'rightWidth'>, side: DockSide): number {
  if (!columnVisible(s, side)) return 0;
  return side === 'left' ? s.leftWidth : s.rightWidth;
}

export function movePanel(id: PanelId, side: DockSide, index: number) {
  const { dock } = useUi.getState();
  const next: DockLayout = { left: dock.left.filter((p) => p !== id), right: dock.right.filter((p) => p !== id) };
  next[side].splice(Math.max(0, Math.min(index, next[side].length)), 0, id);
  // Dropping on the right shows the panel's tab, where it landed.
  useUi.getState().set({ dock: next, ...(side === 'left' ? { leftOpen: true } : { rightOpen: true, aiOpen: false, rightPanel: id }) });
}

/** The right column's panel tab (when AI isn't showing). */
export const activeRightPanel = (s: Pick<UiState, 'dock' | 'rightPanel'>): PanelId | undefined =>
  s.dock.right.includes(s.rightPanel) ? s.rightPanel : s.dock.right[0];

/** Shows or hides `id` (View → Shapes / Format / Layers): its column on the left, its tab on the right. */
export function togglePanelColumn(id: PanelId) {
  const s = useUi.getState();
  const side = sideOf(s.dock, id);
  if (side === 'left') s.set({ leftOpen: !s.leftOpen });
  else if (panelColumnOpen(id)) s.set({ rightOpen: false });
  else s.set({ rightOpen: true, aiOpen: false, rightPanel: id });
}

export const panelColumnOpen = (id: PanelId) => {
  const s = useUi.getState();
  return sideOf(s.dock, id) === 'left' ? s.leftOpen : s.rightOpen && !s.aiOpen && activeRightPanel(s) === id;
};

/** The AI button and Mod+I: open the AI tab, or go back to Design when it's showing. */
export function toggleAiTab() {
  const s = useUi.getState();
  s.set(s.rightOpen && s.aiOpen ? { aiOpen: false } : { rightOpen: true, aiOpen: true });
}

export const resetDock = () =>
  useUi.getState().set({ dock: DEFAULT_DOCK, leftWidth: PANEL_WIDTH.left, rightWidth: PANEL_WIDTH.right, leftOpen: true, rightOpen: true });

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

type RightTab = PanelId | 'ai';

/** Tabs always read Design, Layers, (Shapes), AI, whatever order the panels were docked in. */
const TAB_ORDER: PanelId[] = ['format', 'layers', 'shapes'];

const TAB_ICON: Record<RightTab, ReactNode> = { format: <SlidersHorizontal />, layers: <Layers3 />, shapes: <Shapes />, ai: <Sparkles /> };

function tabLabel(id: RightTab): string {
  if (id === 'format') return t('chrome.rightTabs.design');
  if (id === 'layers') return t('common.layers');
  if (id === 'ai') return t('chrome.rightTabs.ai');
  return panelName(id);
}

const TAB_HINT: Partial<Record<RightTab, () => string>> = {
  format: () => t('chrome.rightTabs.designHint'),
  layers: () => t('chrome.rightTabs.layersHint'),
  ai: () => t('chrome.rightTabs.aiHint'),
};

const TAB_SHORTCUT: Partial<Record<RightTab, string>> = { layers: 'Mod+Shift+L', ai: 'Mod+I' };

/** The tab strip at the top of the right card: one tab per docked panel, then AI. */
function RightTabs({ ids, active }: { ids: PanelId[]; active: RightTab }) {
  useT();
  const [menu, setMenu] = useState<{ id: PanelId; x: number; y: number } | null>(null);
  const tabs: RightTab[] = [...TAB_ORDER.filter((id) => ids.includes(id)), 'ai'];
  const show = (tab: RightTab) => useUi.getState().set(tab === 'ai' ? { aiOpen: true } : { aiOpen: false, rightPanel: tab });
  return (
    <div
      role="tablist"
      aria-label={t('chrome.rightTabs.aria')}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        e.stopPropagation();
        const i = tabs.indexOf(active) + (e.key === 'ArrowRight' ? 1 : -1);
        show(tabs[(i + tabs.length) % tabs.length]);
      }}
      className="flex h-11 shrink-0 items-center gap-0.5 border-b border-line px-1.5"
    >
      {tabs.map((tab) => {
        const panel = tab === 'ai' ? null : tab;
        return (
          <Tooltip key={tab} label={TAB_HINT[tab]?.() ?? tabLabel(tab)} shortcut={TAB_SHORTCUT[tab]}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === active}
              tabIndex={tab === active ? 0 : -1}
              data-dock-item={panel ?? undefined}
              // A panel tab can be dragged to the left column, or moved from its menu.
              onPointerDown={panel ? (e) => startPanelDrag(panel, e, null, true) : undefined}
              onContextMenu={
                panel
                  ? (e) => {
                      e.preventDefault();
                      setMenu({ id: panel, x: e.clientX, y: e.clientY });
                    }
                  : undefined
              }
              onClick={() => show(tab)}
              className={cn(
                'flex h-8 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium outline-none transition-[background,color] duration-150 focus-visible:ring-2 focus-visible:ring-accent/50 [&_svg]:size-3.5 [&_svg]:shrink-0',
                tab === active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg',
              )}
            >
              {TAB_ICON[tab]}
              <span className="truncate">{tabLabel(tab)}</span>
            </button>
          </Tooltip>
        );
      })}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          minWidth={200}
          onClose={() => setMenu(null)}
          items={[
            { label: t('chrome.dock.moveLeft'), icon: <ArrowLeftRight />, onSelect: () => movePanel(menu.id, 'left', Infinity) },
            { type: 'separator' },
            { label: t('chrome.dock.reset'), icon: <RotateCcw />, onSelect: resetDock },
          ]}
        />
      )}
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
  return side === 'right' ? <RightColumn /> : <LeftColumn />;
}

function LeftColumn() {
  const ids = useUi((s) => s.dock.left);
  const open = useUi((s) => s.leftOpen);
  const width = useUi((s) => s.leftWidth);
  const drag = useDockDrag();
  const t = useT();
  const shown = open && ids.length > 0;
  const dropping = !!drag.id && drag.target?.side === 'left';
  // While dragging, an empty or hidden column still shows a drop zone.
  if (!shown && !drag.id) return null;

  const growFormat = !ids.includes('shapes');
  const lastFlex = ids.includes('shapes') || growFormat;
  return (
    <div
      data-dock-side="left"
      data-od-panel="left"
      style={{ width }}
      className="absolute bottom-2.5 left-2.5 top-2.5 flex flex-col transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.9,.3,1)]"
    >
      {shown ? (
        <div className="flex min-h-0 flex-1 flex-col" style={{ gap: GAP }}>
          {ids.map((id, i) => (
            <Fragment key={id}>
              <DropLine show={dropping && drag.target!.index === i && drag.id !== id} />
              {/* Layers sits at the bottom when nothing above it stretches. */}
              {id === 'layers' && !lastFlex && i > 0 && <div className="-mt-2 flex-1" />}
              <DockItem id={id} side="left" index={i} count={ids.length} grow={growFormat && id === 'format'} />
            </Fragment>
          ))}
          <DropLine show={dropping && drag.target!.index >= ids.filter((p) => p !== drag.id).length} />
        </div>
      ) : (
        <DropZone active={dropping} />
      )}
      {shown && (
        <PanelResizer
          edge="right"
          width={width}
          defaultWidth={PANEL_WIDTH.left}
          label={t('chrome.dock.resizeLeft')}
          onChange={(w) => useUi.getState().set({ leftWidth: w })}
        />
      )}
    </div>
  );
}

function RightColumn() {
  const ids = useUi((s) => s.dock.right);
  const open = useUi((s) => s.rightOpen);
  const panel = useUi((s) => activeRightPanel(s));
  const ai = useUi((s) => s.aiOpen) || !panel;
  const width = useUi((s) => s.rightWidth);
  const drag = useDockDrag();
  const t = useT();
  // The AI tab mounts on first use, then stays mounted while hidden so the conversation survives tab switches.
  const [aiMounted, setAiMounted] = useState(false);
  if (ai && open && !aiMounted) setAiMounted(true);
  const dropping = !!drag.id && drag.target?.side === 'right';
  if (!open && !drag.id) return null;

  return (
    <div
      data-dock-side="right"
      data-od-panel="right"
      style={{ width }}
      className="absolute bottom-2.5 right-2.5 top-2.5 flex flex-col transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.9,.3,1)]"
    >
      {open ? (
        <div className="animate-slide-up pointer-events-auto relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-panel shadow-panel">
          <RightTabs ids={ids} active={ai ? 'ai' : panel!} />
          <div className="relative flex min-h-0 flex-1 flex-col">
            {!ai && panel && (
              <div key={panel} role="tabpanel" aria-label={tabLabel(panel)} className="animate-fade flex min-h-0 flex-1 flex-col [&>aside]:h-full">
                <InTabs.Provider value>
                  <PanelBody id={panel} />
                </InTabs.Provider>
              </div>
            )}
            {aiMounted && (
              <div role="tabpanel" aria-label={t('chrome.rightTabs.ai')} className={cn('min-h-0 flex-1 flex-col overflow-hidden', ai ? 'flex' : 'hidden')}>
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
            {drag.id && <DropZone active={dropping} overlay />}
          </div>
        </div>
      ) : (
        <DropZone active={dropping} />
      )}
      {open && (
        <PanelResizer
          edge="left"
          width={width}
          max={RIGHT_MAX}
          defaultWidth={PANEL_WIDTH.right}
          label={t('chrome.dock.resizeRight')}
          onChange={(w) => useUi.getState().set({ rightWidth: w })}
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
      {panelName(id)}
    </div>
  );
}
