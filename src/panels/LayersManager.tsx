/**
 * Layers (draw.io Ctrl+Shift+L): add, rename, show/hide, lock, reorder,
 * choose the active layer, move the selection — plus the tag filter.
 */
import { useMemo, useState } from 'react';
import { ArrowDownToLine, Copy, Eye, EyeOff, Lock, LockOpen, MoreHorizontal, MousePointer2, Pencil, Plus, Tag, Trash } from 'lucide-react';
import type { Layer } from '@/model/types';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { Database } from 'lucide-react';
import { openAutomationDialog } from '@/automation/ui';
import { layersOf, useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/ui/Tooltip';

export function LayersManager() {
  const doc = useEditor((s) => s.doc);
  const active = useEditor((s) => s.activeLayerId);
  const selection = useEditor((s) => s.selection);
  const tagFilter = useEditor((s) => s.tagFilter);
  const layers = layersOf(doc);
  const activeId = active ?? layers[0].id;
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ layer: Layer; x: number; y: number } | null>(null);
  const s = useEditor.getState;

  const menuItems = (l: Layer): MenuEntry[] => [
    { label: 'Rename', icon: <Pencil />, onSelect: () => setRenaming(l.id) },
    { label: 'Edit data…', icon: <Database />, onSelect: () => openAutomationDialog({ kind: 'data', target: { type: 'layer', id: l.id } }) },
    { label: 'Duplicate', icon: <Copy />, onSelect: () => s().duplicateLayer(l.id) },
    { label: 'Select all in layer', icon: <MousePointer2 />, onSelect: () => s().selectLayer(l.id), disabled: !counts.get(l.id) },
    { label: 'Move selection here', icon: <ArrowDownToLine />, onSelect: () => s().moveSelectionToLayer(l.id), disabled: !selection.length },
    { type: 'separator' },
    { label: l.visible ? 'Hide' : 'Show', icon: l.visible ? <EyeOff /> : <Eye />, onSelect: () => s().setLayerVisible(l.id, !l.visible) },
    { label: l.locked ? 'Unlock' : 'Lock', icon: l.locked ? <LockOpen /> : <Lock />, onSelect: () => s().setLayerLocked(l.id, !l.locked) },
    { type: 'separator' },
    { label: 'Delete layer', icon: <Trash />, danger: true, disabled: layers.length <= 1, onSelect: () => s().deleteLayer(l.id) },
  ];

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of doc.order) {
      const lid = doc.elements[id].layerId ?? layers[0].id;
      m.set(lid, (m.get(lid) ?? 0) + 1);
    }
    return m;
  }, [doc, layers]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const id of doc.order) for (const t of doc.elements[id].tags ?? []) set.add(t);
    return [...set].sort();
  }, [doc]);

  return (
    <div className="border-b border-line px-2 pb-2">
      <div className="flex h-8 items-center justify-between px-1.5">
        <span className="text-[11px] font-medium text-subtle">Document layers</span>
        <div className="flex items-center">
          {selection.length > 0 && layers.length > 1 && (
            <Tooltip label="Move selection to active layer" side="bottom">
              <button onClick={() => s().moveSelectionToLayer(activeId)} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label="Move selection to layer">
                <ArrowDownToLine className="size-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Add layer" side="bottom">
            <button onClick={() => s().addLayer()} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label="Add layer">
              <Plus className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>
      {/* Top layer first, like draw.io. */}
      {[...layers].reverse().map((l) => {
        const index = layers.indexOf(l);
        return (
          <div
            key={l.id}
            draggable={renaming !== l.id}
            onDragStart={(e) => {
              setDragId(l.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dragId !== l.id) s().moveLayerTo(dragId, index);
              setDragId(null);
            }}
            onClick={() => s().setActiveLayer(l.id)}
            onDoubleClick={() => setRenaming(l.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ layer: l, x: e.clientX, y: e.clientY });
            }}
            className={cn(
              'group flex h-8 items-center gap-1.5 rounded-lg pl-2 pr-1 text-[12.5px] transition-colors',
              l.id === activeId ? 'bg-accent-soft text-fg' : 'text-muted hover:bg-hover hover:text-fg',
              dragId === l.id && 'opacity-40',
            )}
          >
            <span className={cn('size-1.5 shrink-0 rounded-full', l.id === activeId ? 'bg-accent' : 'bg-transparent')} />
            {renaming === l.id ? (
              <input
                autoFocus
                defaultValue={l.name}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setRenaming(null);
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) s().renameLayer(l.id, e.target.value.trim());
                  setRenaming(null);
                }}
                className="h-6 min-w-0 flex-1 rounded bg-panel px-1 text-fg outline-none ring-2 ring-accent/40"
              />
            ) : (
              <span className={cn('min-w-0 flex-1 truncate', !l.visible && 'line-through opacity-60')}>{l.name}</span>
            )}
            <span className="text-[10.5px] tabular-nums text-subtle">{counts.get(l.id) ?? 0}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                s().setLayerVisible(l.id, !l.visible);
              }}
              className={cn('rounded p-1 hover:bg-hover hover:text-fg', l.visible ? 'text-subtle opacity-0 group-hover:opacity-100' : 'text-fg')}
              aria-label={l.visible ? 'Hide layer' : 'Show layer'}
            >
              {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                s().setLayerLocked(l.id, !l.locked);
              }}
              className={cn('rounded p-1 hover:bg-hover hover:text-fg', l.locked ? 'text-fg' : 'text-subtle opacity-0 group-hover:opacity-100')}
              aria-label={l.locked ? 'Unlock layer' : 'Lock layer'}
            >
              {l.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                setMenu({ layer: l, x: r.left, y: r.bottom + 4 });
              }}
              className="rounded p-1 text-subtle opacity-0 hover:bg-hover hover:text-fg group-hover:opacity-100"
              aria-label="Layer actions"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>
        );
      })}
      {tags.length > 0 && (
        <div className="mt-2 px-1.5">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-subtle">
            <Tag className="size-3" /> Tags
            {tagFilter.length > 0 && (
              <button onClick={() => useEditor.setState({ tagFilter: [] })} className="ml-auto text-[11px] text-accent hover:underline">
                Show all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => {
              const on = tagFilter.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => useEditor.setState({ tagFilter: on ? tagFilter.filter((x) => x !== t) : [...tagFilter, t] })}
                  className={cn('h-6 rounded-full px-2 text-[11px] font-medium transition-colors', on ? 'bg-accent text-accent-fg' : 'bg-panel-2 text-muted hover:text-fg')}
                >
                  #{t}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.layer)} onClose={() => setMenu(null)} />}
    </div>
  );
}
