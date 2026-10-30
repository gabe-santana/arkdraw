/**
 * Page tabs: a bar along the bottom of the window, under the canvas (like
 * spreadsheet sheets). Switch, add, rename (double-click), duplicate/delete
 * via context menu, drag to reorder, delete with a middle click. The list
 * button finds any page by name or number; the wheel scrolls the tabs, and
 * the active tab is always scrolled into view.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Files, Pencil, Plus, Search, Trash } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { Database } from 'lucide-react';
import { openAutomationDialog } from '@/automation/ui';
import { Tooltip } from '@/ui/Tooltip';
import { t as tNow, useT } from '@/i18n';

/** Deletes a page: right away when it's empty, after a confirmation when it has content (it can't be undone). */
async function removePage(id: string) {
  const s = useEditor.getState();
  const pages = s.allPages();
  const page = pages.find((p) => p.id === id);
  if (!page || pages.length <= 1) return;
  const count = page.doc.order.length;
  if (count) {
    const choice = await useUi.getState().ask({
      title: tNow('chrome.pageTabs.deleteTitle', { name: page.name }),
      message: tNow('chrome.pageTabs.deleteMessage', { count }),
      confirmLabel: tNow('common.delete'),
    });
    if (choice !== 'confirm') return;
  }
  useEditor.getState().deletePage(id);
}

export function PageTabs() {
  const t = useT();
  const pages = useEditor((s) => s.pages);
  const active = useEditor((s) => s.activePageId);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [listAt, setListAt] = useState<{ left: number; bottom: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const s = useEditor.getState;

  // Keep the active tab in view, wherever it was switched from (the list, a link, the keyboard).
  useEffect(() => {
    scroller.current?.querySelector(`[data-page="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active, pages.length]);

  const items = (id: string): MenuEntry[] => [
    { label: t('common.rename'), icon: <Pencil />, onSelect: () => setRenaming(id) },
    { label: t('common.duplicate'), icon: <Copy />, onSelect: () => s().duplicatePage(id) },
    { label: t('chrome.pageTabs.editData'), icon: <Database />, onSelect: () => openAutomationDialog({ kind: 'data', target: { type: 'page', id } }) },
    { type: 'separator' },
    { label: t('common.delete'), icon: <Trash />, danger: true, disabled: pages.length <= 1, onSelect: () => void removePage(id) },
  ];

  return (
    <div className="flex h-8 shrink-0 items-stretch" role="tablist" aria-label={t('common.pages')}>
      <Tooltip label={t('chrome.pageTabs.allPages')} side="top">
        <button
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setListAt(listAt ? null : { left: r.left + 4, bottom: window.innerHeight - r.top + 6 });
          }}
          className="flex w-9 shrink-0 items-center justify-center border-r border-line text-muted hover:bg-hover hover:text-fg"
          aria-label={t('chrome.pageTabs.allPages')}
          aria-expanded={!!listAt}
        >
          <Files className="size-4" />
        </button>
      </Tooltip>
      <div
        ref={scroller}
        // The wheel scrolls the tabs sideways.
        onWheel={(e) => {
          if (scroller.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) scroller.current.scrollLeft += e.deltaY;
        }}
        className="no-scrollbar flex min-w-0 items-stretch overflow-x-auto"
      >
        {pages.map((p) => (
          <div
            key={p.id}
            data-page={p.id}
            // Middle click deletes the page (asking first when it has content).
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            onAuxClick={(e) => {
              if (e.button === 1) void removePage(p.id);
            }}
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
            role="tab"
            aria-selected={p.id === active}
            className={cn(
              'relative flex shrink-0 cursor-default items-center border-r border-line px-3.5 text-[12px] font-medium transition-colors',
              p.id === active
                ? 'bg-panel text-fg after:absolute after:inset-x-0 after:top-0 after:h-[2px] after:bg-accent'
                : 'text-muted hover:bg-hover hover:text-fg',
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
          className="flex w-9 shrink-0 items-center justify-center text-muted hover:bg-hover hover:text-fg"
          aria-label={t('chrome.pageTabs.insertPage')}
        >
          <Plus className="size-4" />
        </button>
      </Tooltip>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={items(menu.id)} onClose={() => setMenu(null)} />}
      {listAt && <PageList at={listAt} onClose={() => setListAt(null)} />}
    </div>
  );
}

/** Every page, numbered, with a search box: jump to page 1 or page 100 in one step. */
function PageList({ at, onClose }: { at: { left: number; bottom: number }; onClose: () => void }) {
  const t = useT();
  const pages = useEditor((s) => s.pages);
  const active = useEditor((s) => s.activePageId);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();
  const matches = pages.map((p, i) => ({ p, n: i + 1 })).filter(({ p, n }) => !q || p.name.toLowerCase().includes(q) || String(n) === q);
  const go = (id: string) => {
    useEditor.getState().switchPage(id);
    onClose();
  };

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', away, true);
    // The active page starts in view in a long list.
    ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'center' });
    return () => window.removeEventListener('pointerdown', away, true);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={t('chrome.pageTabs.allPages')}
      style={{ left: at.left, bottom: at.bottom }}
      className="animate-pop fixed z-[120] flex max-h-[60vh] w-64 flex-col overflow-hidden rounded-xl bg-panel shadow-pop ring-1 ring-line"
    >
      <label className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-2.5">
        <Search className="size-3.5 shrink-0 text-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && matches[0]) go(matches[0].p.id);
          }}
          placeholder={t('chrome.pageTabs.findPage')}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-subtle"
        />
        <span className="shrink-0 text-[11px] tabular-nums text-subtle">{pages.length}</span>
      </label>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-1">
        {matches.map(({ p, n }) => (
          <button
            key={p.id}
            onClick={() => go(p.id)}
            aria-current={p.id === active ? 'page' : undefined}
            className={cn(
              'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[12.5px]',
              p.id === active ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-hover',
            )}
          >
            <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-subtle">{n}</span>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
          </button>
        ))}
        {!matches.length && <div className="px-2 py-3 text-center text-[12px] text-subtle">{t('chrome.pageTabs.noMatch')}</div>}
      </div>
    </div>,
    document.body,
  );
}
