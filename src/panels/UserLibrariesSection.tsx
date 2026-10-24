import { memo, useMemo, useState } from 'react';
import { ChevronRight, Download, FolderOpen, Plus, Trash, X } from 'lucide-react';
import type { Doc } from '@/model/types';
import { cloneElements, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { renderSvg } from '@/io/export/svg';
import { pickAndOpenFile, saveFile } from '@/io/native';
import { Tooltip } from '@/ui/Tooltip';
import { startLibraryDrag } from './libraryDrag';
import { parseLibrary, SCRATCHPAD_ID, serializeLibrary, useUserLibraries, type UserLibrary, type UserLibraryItem } from './userLibraries';
import { t, useT } from '@/i18n';

/** A user library's display name (the Scratchpad's built-in name is translated). */
const libraryName = (lib: UserLibrary) => (lib.id === SCRATCHPAD_ID ? t('panels.userLib.scratchpad') : lib.name);

/** Scratchpad + custom libraries, shown at the top of the Shapes tab. */
export function UserLibrariesSection({ query }: { query: string }) {
  const libraries = useUserLibraries((s) => s.libraries);
  const t = useT();
  const q = query.trim().toLowerCase();
  return (
    <>
      {libraries.map((lib) => {
        const items = q ? lib.items.filter((i) => i.title.toLowerCase().includes(q)) : lib.items;
        if (q && !items.length) return null;
        return <LibrarySection key={lib.id} lib={lib} items={items} forceOpen={!!q} />;
      })}
      {!q && (
        <div className="mb-2 flex gap-1 px-1">
          <button
            onClick={() => {
              const name = t('panels.userLib.defaultName', { n: libraries.length });
              useUserLibraries.getState().createLibrary(name);
            }}
            className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg text-[11.5px] text-muted hover:bg-hover hover:text-fg"
            title={t('panels.userLib.new')}
          >
            <Plus className="size-3.5 shrink-0" /> <span className="truncate">{t('panels.userLib.new')}</span>
          </button>
          <button onClick={() => void openLibraryFile()} title={t('panels.userLib.open')} className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg text-[11.5px] text-muted hover:bg-hover hover:text-fg">
            <FolderOpen className="size-3.5 shrink-0" /> <span className="truncate">{t('panels.userLib.open')}</span>
          </button>
        </div>
      )}
    </>
  );
}

async function openLibraryFile() {
  try {
    const f = await pickAndOpenFile([{ name: t('panels.userLib.filterName'), extensions: ['arkdrawlib', 'xml', 'json'] }]);
    if (!f) return;
    const { name, items } = await parseLibrary(f.contents, f.name);
    useUserLibraries.getState().createLibrary(name, items);
    useUi.getState().toast(t('panels.userLib.loaded', { count: items.length, name }), 'success');
  } catch (e) {
    useUi.getState().toast(String((e as Error).message ?? e), 'error');
  }
}

function LibrarySection({ lib, items, forceOpen }: { lib: UserLibrary; items: UserLibraryItem[]; forceOpen: boolean }) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const t = useT();
  const store = useUserLibraries.getState;
  const addSelection = () => {
    const s = useEditor.getState();
    const els = s.copySelection();
    if (els.length) store().addItem(lib.id, els);
  };
  const isOpen = forceOpen || open;
  return (
    <section className="mb-1">
      <div className="group flex h-8 items-center gap-1 rounded-lg px-1.5 hover:bg-hover">
        <button onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-1 text-left text-[12px] font-semibold text-fg">
          <ChevronRight className={cn('size-3.5 text-subtle transition-transform duration-200', isOpen && 'rotate-90')} />
          {renaming ? (
            <input
              autoFocus
              defaultValue={lib.name}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) store().renameLibrary(lib.id, e.target.value.trim());
                setRenaming(false);
              }}
              className="h-6 min-w-0 flex-1 rounded bg-panel px-1 font-normal text-fg outline-none ring-2 ring-accent/40"
            />
          ) : (
            <span className="truncate" onDoubleClick={() => lib.id !== SCRATCHPAD_ID && setRenaming(true)}>
              {libraryName(lib)}
            </span>
          )}
        </button>
        <span className="text-[11px] tabular-nums text-subtle">{lib.items.length}</span>
        <Tooltip label={hasSelection ? t('panels.userLib.addSelection') : t('panels.userLib.selectToAdd')} side="right">
          <button disabled={!hasSelection} onClick={addSelection} className="rounded p-0.5 text-subtle hover:bg-hover hover:text-fg disabled:opacity-40" aria-label={t('panels.userLib.addSelection')}>
            <Plus className="size-3.5" />
          </button>
        </Tooltip>
        <Tooltip label={t('panels.userLib.export')} side="right">
          <button
            onClick={() => void saveFile(serializeLibrary(lib), { defaultName: `${libraryName(lib)}.arkdrawlib`, filters: [{ name: t('panels.userLib.fileType'), extensions: ['arkdrawlib'] }], mime: 'application/json' })}
            className="rounded p-0.5 text-subtle opacity-0 hover:bg-hover hover:text-fg group-hover:opacity-100"
            aria-label={t('panels.userLib.export')}
          >
            <Download className="size-3.5" />
          </button>
        </Tooltip>
        {lib.id !== SCRATCHPAD_ID && (
          <button onClick={() => store().removeLibrary(lib.id)} className="rounded p-0.5 text-subtle opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100" aria-label={t('panels.userLib.delete')}>
            <Trash className="size-3.5" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="px-0.5 pb-2 pt-0.5">
          {items.length ? (
            <div className="grid grid-cols-4 gap-1">
              {items.map((item) => (
                <UserTile key={item.id} lib={lib} item={item} />
              ))}
            </div>
          ) : (
            <p
              className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-[11.5px] leading-relaxed text-subtle"
            >
              {lib.id === SCRATCHPAD_ID ? t('panels.userLib.scratchpadEmpty') : t('panels.userLib.empty')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const UserTile = memo(function UserTile({ lib, item }: { lib: UserLibrary; item: UserLibraryItem }) {
  const t = useT();
  const src = useMemo(() => {
    const doc: Doc = { elements: Object.fromEntries(item.elements.map((e) => [e.id, e])), order: item.elements.map((e) => e.id) };
    try {
      const { svg } = renderSvg(doc, { background: null, padding: 4, embedFont: false });
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      return '';
    }
  }, [item]);
  return (
    <Tooltip label={item.title} side="right" delay={500}>
      <div className="group relative">
        <button
          onPointerDown={(e) =>
            startLibraryDrag(e, {
              size: { w: item.w, h: item.h },
              create: (at) => cloneElements(item.elements, { x: at.x - item.w / 2, y: at.y - item.h / 2 }),
            })
          }
          className="flex aspect-square w-full items-center justify-center rounded-lg p-1.5 transition-[background,transform] hover:bg-hover active:scale-95"
          aria-label={item.title}
        >
          {src && <img src={src} alt="" draggable={false} className="size-full object-contain" />}
        </button>
        <button
          onClick={() => useUserLibraries.getState().removeItem(lib.id, item.id)}
          className="absolute -right-0.5 -top-0.5 hidden size-4 items-center justify-center rounded-full bg-panel text-subtle shadow-panel hover:text-danger group-hover:flex"
          aria-label={t('panels.userLib.removeItem')}
        >
          <X className="size-2.5" />
        </button>
      </div>
    </Tooltip>
  );
});
