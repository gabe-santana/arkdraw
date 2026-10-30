/**
 * Layers: document layers (and the tag filter) on top, then every element
 * front-to-back — select, rename, lock and drag to reorder. A tab of the
 * right column (full height); stacked in the left column it gets a header to
 * collapse it and a top edge to resize it.
 */
import { useMemo, useRef, useState } from 'react';
import { Boxes, ChevronDown, ChevronRight, Eye, EyeOff, Layers3, Lock, LockOpen, Shapes, Spline, Type } from 'lucide-react';
import type { DiagramElement } from '@/model/types';
import { isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { iconUrl } from '@/shapes/IconImage';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { SearchInput } from '@/ui/controls';
import { LayersManager } from './LayersManager';
import { useInTabs, usePanelCard } from '@/chrome/panelFrame';
import { ShapePreview } from './ShapePreview';
import { t, useT } from '@/i18n';

const MIN_HEIGHT = 160;

export function LayersPanel() {
  const open = useUi((s) => s.layersOpen);
  const height = useUi((s) => s.layersHeight);
  const set = useUi((s) => s.set);
  const count = useEditor((s) => s.doc.order.length);
  const ref = useRef<HTMLElement>(null);
  const t = useT();
  const inTabs = useInTabs();
  const card = usePanelCard();

  // Drag the top edge: the dock grows upwards, leaving the Format panel at least ~140px.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const column = ref.current?.closest('[data-dock-side]') as HTMLElement | null;
    const max = Math.max(MIN_HEIGHT, (column?.clientHeight ?? 600) * 0.6);
    const move = (ev: PointerEvent) => set({ layersHeight: Math.round(Math.min(max, Math.max(MIN_HEIGHT, height + startY - ev.clientY))) });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  if (inTabs) {
    return (
      <aside aria-label={t('panels.layers.panel')} className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="scroll-thin max-h-[40%] shrink-0 overflow-y-auto pt-1">
          <LayersManager />
        </div>
        <div className="flex min-h-0 flex-1 flex-col border-t border-line">
          <ElementList />
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={ref}
      aria-label={t('panels.layers.panel')}
      className={cn('pointer-events-auto relative flex max-h-full w-full shrink-0 flex-col overflow-hidden', card)}
      style={{ height: open ? height : undefined }}
    >
      {open && (
        <div
          role="separator"
          aria-label={t('panels.layers.resize')}
          onPointerDown={startResize}
          onDoubleClick={() => set({ layersHeight: 300 })}
          className="absolute inset-x-8 top-0 z-10 h-1.5 cursor-ns-resize rounded-full transition-colors hover:bg-accent/40"
        />
      )}
      <button data-dock-handle onClick={() => set({ layersOpen: !open })} aria-expanded={open} className="flex h-10 shrink-0 items-center gap-2 px-3 text-left text-fg">
        <Layers3 className="size-3.5 text-muted" />
        <span className="flex-1 text-[13px] font-semibold">{t('common.layers')}</span>
        <span className="text-[11px] tabular-nums text-subtle">{count}</span>
        <ChevronDown className={cn('size-3.5 text-muted transition-transform duration-200', !open && 'rotate-180')} />
      </button>
      {open && (
        <div className="flex min-h-0 flex-1 flex-col border-t border-line">
          <div className="scroll-thin max-h-[45%] shrink-0 overflow-y-auto pt-1">
            <LayersManager />
          </div>
          <ElementList />
        </div>
      )}
    </aside>
  );
}

function layerLabel(el: DiagramElement): string {
  if (el.name) return el.name;
  const firstLine = el.text.split('\n').find((l) => l.trim());
  if (firstLine) return firstLine.trim();
  if (el.type === 'connector') return t('common.connector');
  return getShapeDef(el.kind).label;
}

function ElementList() {
  const order = useEditor((s) => s.doc.order);
  const elements = useEditor((s) => s.doc.elements);
  const selection = useEditor((s) => s.selection);
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const t = useT();

  // A tree, front to back: each container is followed by its children (filtering shows a flat list).
  const { rows, parents } = useMemo(() => {
    const front = [...order].reverse();
    const q = query.trim().toLowerCase();
    if (q) return { rows: front.filter((id) => layerLabel(elements[id]).toLowerCase().includes(q)), parents: new Set<string>() };
    const children = new Map<string, string[]>();
    const parentOf = (id: string) => {
      const el = elements[id];
      return isShape(el) && el.containerId && elements[el.containerId] ? el.containerId : null;
    };
    for (const id of front) {
      const p = parentOf(id);
      if (p) children.set(p, [...(children.get(p) ?? []), id]);
    }
    const out: string[] = [];
    const visit = (id: string) => {
      out.push(id);
      if (!collapsed.has(id)) for (const c of children.get(id) ?? []) visit(c);
    };
    for (const id of front) if (!parentOf(id)) visit(id);
    return { rows: out, parents: new Set(children.keys()) };
  }, [order, elements, query, collapsed, t]);

  const toggleCollapsed = (id: string) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const s = useEditor.getState;
  const isSelected = (id: string | undefined) => !!id && selection.includes(id);
  return (
    <>
      <div className="px-2 pb-1.5 pt-1.5">
        <div className="flex h-7 items-center px-1.5 text-[11px] font-medium text-subtle">{t('panels.layers.elements')}</div>
        <SearchInput value={query} onChange={setQuery} placeholder={t('panels.layers.filterPlaceholder')} />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3" onDragOver={(e) => e.preventDefault()}>
        {!rows.length && <Empty>{order.length ? t('panels.layers.noMatch') : t('panels.layers.empty')}</Empty>}
        {rows.map((id, i) => {
          const el = elements[id];
          const selected = isSelected(id);
          // Adjacent selected rows merge into one soft block (rounded only at its ends).
          const joinTop = selected && isSelected(rows[i - 1]);
          const joinBottom = selected && isSelected(rows[i + 1]);
          const depth = nestingDepth(el, elements);
          return (
            <div key={id} className={cn('relative', !joinBottom && 'mb-px')}>
              {dropIndex === i && <div className="absolute -top-px left-2 right-2 z-10 h-0.5 rounded bg-accent" />}
              <div
                draggable={renaming !== id}
                onDragStart={(e) => {
                  setDragId(id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  setDropIndex(e.clientY < r.top + r.height / 2 ? i : i + 1);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dropIndex !== null) {
                    // Rows are reversed (top = front); map back to z-order.
                    const target = rows[dropIndex - 1] ?? null;
                    const fullOrder = s().doc.order.filter((o) => o !== dragId);
                    const idx = target ? fullOrder.indexOf(target) : fullOrder.length;
                    s().moveElement(dragId, idx);
                  }
                  setDragId(null);
                  setDropIndex(null);
                }}
                onClick={(e) => s().select([id], e.shiftKey || e.ctrlKey || e.metaKey)}
                onDoubleClick={() => setRenaming(id)}
                className={cn(
                  'group flex h-7 items-center gap-2 rounded-md pr-1 text-[12.5px] transition-colors',
                  selected ? 'bg-accent/10 font-medium text-fg' : 'text-fg/75 hover:bg-hover hover:text-fg',
                  joinTop && 'rounded-t-none',
                  joinBottom && 'rounded-b-none',
                  (el.hidden || el.locked) && !selected && 'text-fg/45',
                  dragId === id && 'opacity-40',
                )}
                style={{ paddingLeft: 4 + depth * 16 }}
              >
                {parents.has(id) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapsed(id);
                    }}
                    className="-mr-1 flex size-4 shrink-0 items-center justify-center rounded text-subtle hover:text-fg"
                    aria-label={collapsed.has(id) ? t('panels.layers.expand') : t('panels.layers.collapse')}
                    aria-expanded={!collapsed.has(id)}
                  >
                    <ChevronRight className={cn('size-3 transition-transform duration-150', !collapsed.has(id) && 'rotate-90')} />
                  </button>
                ) : (
                  <span className="-mr-1 size-4 shrink-0" />
                )}
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <LayerIcon el={el} />
                </span>
                {renaming === id ? (
                  <input
                    autoFocus
                    defaultValue={layerLabel(el)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      s().updateElements({ [id]: { name: name || undefined } });
                      setRenaming(null);
                    }}
                    className="h-6 min-w-0 flex-1 rounded bg-panel px-1 text-fg outline-none ring-2 ring-accent/40"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{layerLabel(el)}</span>
                )}
                <RowToggle
                  on={!!el.hidden}
                  label={el.hidden ? t('common.show') : t('common.hide')}
                  onClick={() => s().updateElements({ [id]: { hidden: !el.hidden || undefined } })}
                  icon={el.hidden ? <EyeOff /> : <Eye />}
                />
                <RowToggle
                  on={!!el.locked}
                  label={el.locked ? t('panels.unlock') : t('panels.lock')}
                  onClick={() => s().updateElements({ [id]: { locked: !el.locked } })}
                  icon={el.locked ? <Lock /> : <LockOpen />}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Containers and groups-in-containers indent their children (capped so deep trees stay readable). */
function nestingDepth(el: DiagramElement, elements: Record<string, DiagramElement>): number {
  let depth = 0;
  let cur = isShape(el) ? el.containerId : undefined;
  while (cur && depth < 4) {
    depth++;
    const parent = elements[cur];
    cur = isShape(parent) ? parent.containerId : undefined;
  }
  return depth;
}

/** Hover-revealed toggle; stays visible while active (hidden / locked). */
function RowToggle({ on, label, onClick, icon }: { on: boolean; label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn('flex size-5 items-center justify-center rounded text-subtle hover:bg-hover hover:text-fg [&_svg]:size-3.5', on ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100')}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

function LayerIcon({ el }: { el: DiagramElement }) {
  const cls = 'size-3.5 text-subtle';
  if (el.type === 'connector') return <Spline className={cls} />;
  if (el.kind === 'text') return <Type className={cls} />;
  if (el.kind === 'icon' && el.icon) return <img src={iconUrl(el.icon)} alt="" className="size-4 object-contain" />;
  if (el.container ?? getShapeDef(el.kind).container) return <Boxes className={cls} />;
  // Custom (stencil) and freehand shapes have no meaningful mini preview at this size.
  if (el.kind === 'stencil' || el.kind === 'freehand') return <Shapes className={cls} />;
  return <ShapePreview item={{ kind: el.kind, label: '', w: el.w, h: el.h, style: { ...el.style, strokeWidth: Math.max(el.style.strokeWidth, 2) } }} size={14} />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-8 text-center text-[12.5px] leading-relaxed text-muted">{children}</div>;
}
