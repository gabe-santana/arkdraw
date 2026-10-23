/**
 * Layers (mxGraph Ctrl+Shift+L): add, rename, show/hide, lock, reorder,
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
import { useT } from '@/i18n';

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
  const t = useT();
  const s = useEditor.getState;

  const menuItems = (l: Layer): MenuEntry[] => [
    { label: t('common.rename'), icon: <Pencil />, onSelect: () => setRenaming(l.id) },
    { label: t('panels.layers.editData'), icon: <Database />, onSelect: () => openAutomationDialog({ kind: 'data', target: { type: 'layer', id: l.id } }) },
    { label: t('common.duplicate'), icon: <Copy />, onSelect: () => s().duplicateLayer(l.id) },
    { label: t('panels.layers.selectAll'), icon: <MousePointer2 />, onSelect: () => s().selectLayer(l.id), disabled: !counts.get(l.id) },
    { label: t('panels.layers.moveHere'), icon: <ArrowDownToLine />, onSelect: () => s().moveSelectionToLayer(l.id), disabled: !selection.length },
    { type: 'separator' },
    { label: l.visible ? t('common.hide') : t('common.show'), icon: l.visible ? <EyeOff /> : <Eye />, onSelect: () => s().setLayerVisible(l.id, !l.visible) },
    { label: l.locked ? t('panels.unlock') : t('panels.lock'), icon: l.locked ? <LockOpen /> : <Lock />, onSelect: () => s().setLayerLocked(l.id, !l.locked) },
    { type: 'separator' },
    { label: t('panels.layers.delete'), icon: <Trash />, danger: true, disabled: layers.length <= 1, onSelect: () => s().deleteLayer(l.id) },
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
    for (const id of doc.order) for (const tag of doc.elements[id].tags ?? []) set.add(tag);
    return [...set].sort();
  }, [doc]);

  return (
    <div className="border-b border-line px-2 pb-2">
      <div className="flex h-8 items-center justify-between px-1.5">
        <span className="min-w-0 truncate text-[11px] font-medium text-subtle">{t('panels.layers.documentLayers')}</span>
        <div className="flex items-center">
          {selection.length > 0 && layers.length > 1 && (
            <Tooltip label={t('panels.layers.moveToActive')} side="bottom">
              <button onClick={() => s().moveSelectionToLayer(activeId)} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label={t('panels.layers.moveToLayer')}>
                <ArrowDownToLine className="size-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip label={t('panels.layers.add')} side="bottom">
            <button onClick={() => s().addLayer()} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label={t('panels.layers.add')}>
              <Plus className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>
      {/* Top layer first. */}
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
              'group flex h-7 items-center gap-1.5 rounded-md pl-2 pr-1 text-[12.5px] transition-colors hover:bg-hover',
              l.id === activeId ? 'font-medium text-fg' : 'text-fg/70 hover:text-fg',
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
              aria-label={l.visible ? t('panels.layers.hide') : t('panels.layers.show')}
            >
              {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                s().setLayerLocked(l.id, !l.locked);
              }}
              className={cn('rounded p-1 hover:bg-hover hover:text-fg', l.locked ? 'text-fg' : 'text-subtle opacity-0 group-hover:opacity-100')}
              aria-label={l.locked ? t('panels.layers.unlock') : t('panels.layers.lock')}
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
              aria-label={t('panels.layers.actions')}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>
        );
      })}
      {tags.length > 0 && (
        <div className="mt-2 px-1.5">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-subtle">
            <Tag className="size-3" /> {t('panels.layers.tags')}
            {tagFilter.length > 0 && (
              <button onClick={() => useEditor.setState({ tagFilter: [] })} className="ml-auto text-[11px] text-accent hover:underline">
                {t('panels.layers.showAll')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => {
              const on = tagFilter.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => useEditor.setState({ tagFilter: on ? tagFilter.filter((x) => x !== tag) : [...tagFilter, tag] })}
                  className={cn('h-6 rounded-full px-2 text-[11px] font-medium transition-colors', on ? 'bg-accent text-accent-fg' : 'bg-panel-2 text-muted hover:text-fg')}
                >
                  #{tag}
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
