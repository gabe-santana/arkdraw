/**
 * Page tabs (mxGraph's bottom tab bar): switch, add, rename (double-click),
 * duplicate/delete via context menu, drag to reorder.
 */
import { useRef, useState } from 'react';
import { Copy, Pencil, Plus, Trash } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { Database } from 'lucide-react';
import { openAutomationDialog } from '@/automation/ui';
import { Tooltip } from '@/ui/Tooltip';
import { useT } from '@/i18n';

export function PageTabs() {
  const t = useT();
  const pages = useEditor((s) => s.pages);
  const active = useEditor((s) => s.activePageId);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const s = useEditor.getState;

  const items = (id: string): MenuEntry[] => [
    { label: t('common.rename'), icon: <Pencil />, onSelect: () => setRenaming(id) },
    { label: t('common.duplicate'), icon: <Copy />, onSelect: () => s().duplicatePage(id) },
    { label: t('chrome.pageTabs.editData'), icon: <Database />, onSelect: () => openAutomationDialog({ kind: 'data', target: { type: 'page', id } }) },
    { type: 'separator' },
    { label: t('common.delete'), icon: <Trash />, danger: true, disabled: pages.length <= 1, onSelect: () => s().deletePage(id) },
  ];

  return (
    <div className="animate-slide-up pointer-events-auto flex max-w-full items-center gap-0.5 rounded-xl bg-panel p-1 shadow-panel">
      <div ref={scroller} className="no-scrollbar flex items-center gap-0.5 overflow-x-auto">
        {pages.map((p) => (
          <div
            key={p.id}
            draggable={renaming !== p.id}
            onDragStart={(e) => {
              setDragId(p.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dragId !== p.id) s().movePage(dragId, pages.findIndex((x) => x.id === p.id));
              setDragId(null);
            }}
            onDragEnd={() => setDragId(null)}
            onClick={() => s().switchPage(p.id)}
            onDoubleClick={() => setRenaming(p.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, id: p.id });
            }}
            className={cn(
              'flex h-7 shrink-0 cursor-default items-center rounded-lg px-2.5 text-[12px] font-medium transition-colors',
              p.id === active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg',
              dragId === p.id && 'opacity-40',
            )}
          >
            {renaming === p.id ? (
              <input
                autoFocus
                defaultValue={p.name}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setRenaming(null);
                }}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name) s().renamePage(p.id, name);
                  setRenaming(null);
                }}
                className="w-28 rounded bg-panel px-1 text-fg outline-none ring-2 ring-accent/40"
              />
            ) : (
              <span className="max-w-[140px] truncate">{p.name}</span>
            )}
          </div>
        ))}
      </div>
      <Tooltip label={t('chrome.pageTabs.insertPage')} side="top">
        <button
          onClick={() => {
            s().addPage();
            requestAnimationFrame(() => scroller.current?.scrollTo({ left: 1e6, behavior: 'smooth' }));
          }}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg"
          aria-label={t('chrome.pageTabs.insertPage')}
        >
          <Plus className="size-4" />
        </button>
      </Tooltip>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={items(menu.id)} onClose={() => setMenu(null)} />}
    </div>
  );
}
