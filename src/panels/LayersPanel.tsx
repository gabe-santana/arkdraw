/**
 * Layers dock: the right-hand panel under Format. Document layers (and the
 * tag filter) on top, then every element front-to-back — select, rename,
 * lock and drag to reorder. Collapsible; drag its top edge to resize.
 */
import { useMemo, useRef, useState } from 'react';
import { Boxes, ChevronDown, Layers3, Lock, LockOpen, Spline, Type } from 'lucide-react';
import type { DiagramElement } from '@/model/types';
import { isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { iconUrl } from '@/shapes/IconImage';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { SearchInput } from '@/ui/controls';
import { LayersManager } from './LayersManager';
import { ShapePreview } from './ShapePreview';

const MIN_HEIGHT = 160;

export function LayersPanel() {
  const open = useUi((s) => s.layersOpen);
  const height = useUi((s) => s.layersHeight);
  const set = useUi((s) => s.set);
  const count = useEditor((s) => s.doc.order.length);
  const ref = useRef<HTMLElement>(null);

  // Drag the top edge: the dock grows upwards, leaving the Format panel at least ~140px.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const max = Math.max(MIN_HEIGHT, (ref.current?.parentElement?.clientHeight ?? 600) - 140);
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

  return (
    <aside
      ref={ref}
      className="animate-slide-up pointer-events-auto relative flex max-h-[55%] w-[268px] shrink-0 flex-col overflow-hidden rounded-2xl bg-panel shadow-panel"
      style={{ height: open ? height : undefined }}
    >
      {open && (
        <div
          role="separator"
          aria-label="Resize layers panel"
          onPointerDown={startResize}
          onDoubleClick={() => set({ layersHeight: 300 })}
          className="absolute inset-x-8 top-0 z-10 h-1.5 cursor-ns-resize rounded-full transition-colors hover:bg-accent/40"
        />
      )}
      <button onClick={() => set({ layersOpen: !open })} aria-expanded={open} className="flex h-10 shrink-0 items-center gap-2 px-3 text-left text-fg">
        <Layers3 className="size-3.5 text-muted" />
        <span className="flex-1 text-[13px] font-semibold">Layers</span>
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
  if (el.type === 'connector') return 'Connector';
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...order].reverse().filter((id) => !q || layerLabel(elements[id]).toLowerCase().includes(q));
  }, [order, elements, query]);

  const s = useEditor.getState;
  return (
    <>
      <div className="px-2 pb-2 pt-1.5">
        <div className="flex h-7 items-center px-1.5 text-[11px] font-medium text-subtle">Elements</div>
        <SearchInput value={query} onChange={setQuery} placeholder="Filter elements" />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3" onDragOver={(e) => e.preventDefault()}>
        {!rows.length && <Empty>{order.length ? 'No elements match.' : 'Elements appear here as you add shapes.'}</Empty>}
        {rows.map((id, i) => {
          const el = elements[id];
          const selected = selection.includes(id);
          const depth = isShape(el) && el.containerId ? 1 : 0;
          return (
            <div key={id} className="relative">
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
                  'group flex h-8 items-center gap-2 rounded-lg pr-1 text-[12.5px] transition-colors',
                  selected ? 'bg-accent-soft text-fg' : 'text-muted hover:bg-hover hover:text-fg',
                  dragId === id && 'opacity-40',
                )}
                style={{ paddingLeft: 8 + depth * 14 }}
              >
                <LayerIcon el={el} />
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    s().updateElements({ [id]: { locked: !el.locked } });
                  }}
                  className={cn('rounded p-1 text-subtle hover:bg-hover hover:text-fg', el.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                  aria-label={el.locked ? 'Unlock' : 'Lock'}
                >
                  {el.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LayerIcon({ el }: { el: DiagramElement }) {
  const cls = 'size-3.5 shrink-0 text-subtle';
  if (el.type === 'connector') return <Spline className={cls} />;
  if (el.kind === 'text') return <Type className={cls} />;
  if (el.kind === 'icon' && el.icon) return <img src={iconUrl(el.icon)} alt="" className="size-4 shrink-0 object-contain" />;
  if (getShapeDef(el.kind).container) return <Boxes className={cls} />;
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <ShapePreview item={{ kind: el.kind, label: '', w: el.w, h: el.h, style: { ...el.style, strokeWidth: Math.max(el.style.strokeWidth, 2) } }} size={14} />
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-8 text-center text-[12.5px] leading-relaxed text-muted">{children}</div>;
}
