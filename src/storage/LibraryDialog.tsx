/**
 * File → Open from browser: the browser file library (IndexedDB). Open,
 * rename, duplicate, download and delete documents, save the current one, or
 * add files from disk.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, FileUp, FolderOpen, HardDrive, MoreHorizontal, Pencil, Save, Trash } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUi } from '@/store/ui';
import { confirmDiscard } from '@/app/fileCommands';
import { saveFile } from '@/io/native';
import { Button } from '@/ui/Button';
import { DialogHeader } from '@/ui/Dialog';
import { ContextMenu, type MenuEntry } from '@/ui/Menu';
import { SearchInput } from '@/ui/controls';
import { addToLibrary, deleteLibraryDoc, duplicateLibraryDoc, openLibraryDoc, renameLibraryDoc, saveCurrentToLibrary, useBrowserLibrary, type LibraryDoc } from './library';
import { docOrigin } from './origin';
import { formatDate, formatNumber, t as tNow, useT } from '@/i18n';

const fmtSize = (n: number) =>
  n < 1024 ? `${formatNumber(n)} B` : n < 1024 * 1024 ? `${formatNumber(Math.round(n / 1024))} KB` : `${formatNumber(Math.round(n / 1024 / 102.4) / 10)} MB`;
const fmtWhen = (time: number) => {
  const d = Date.now() - time;
  if (d < 60_000) return tNow('storage.justNow');
  if (d < 3_600_000) return tNow('storage.minutesAgo', { count: Math.round(d / 60_000) });
  if (d < 86_400_000) return tNow('storage.hoursAgo', { count: Math.round(d / 3_600_000) });
  return formatDate(time, { dateStyle: 'short' });
};

export function LibraryBody({ close }: { close: () => void }) {
  const t = useT();
  const { docs, loaded, refresh } = useBrowserLibrary();
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ doc: LibraryDoc; x: number; y: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ui = useUi.getState();
  const origin = docOrigin();
  const currentId = origin?.kind === 'library' ? origin.id : null;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? docs.filter((d) => d.name.toLowerCase().includes(q)) : docs;
  }, [docs, query]);

  const open = async (d: LibraryDoc) => {
    close();
    if (!(await confirmDiscard())) return;
    if (await openLibraryDoc(d.id)) ui.toast(tNow('storage.opened', { name: d.name }), 'success');
  };
  const saveHere = async () => {
    const entry = await saveCurrentToLibrary({ asNew: !currentId });
    if (entry) ui.toast(tNow('storage.savedToBrowser', { name: entry.name }), 'success');
  };
  const download = async (d: LibraryDoc) => {
    try {
      await saveFile(d.data, { defaultName: `${d.name}.arkdraw`, filters: [{ name: tNow('storage.fileType'), extensions: ['arkdraw'] }], mime: 'application/json' });
    } catch (e) {
      ui.toast(String((e as Error)?.message ?? e), 'error');
    }
  };
  const remove = async (d: LibraryDoc) => {
    const choice = await ui.ask({ title: tNow('storage.deleteTitle', { name: d.name }), message: tNow('storage.deleteMessage'), confirmLabel: tNow('common.delete') });
    if (choice === 'confirm') await deleteLibraryDoc(d.id);
  };
  const upload = async (files: FileList) => {
    for (const f of Array.from(files)) {
      try {
        await addToLibrary(f.name, await f.text());
      } catch {
        ui.toast(tNow('storage.notADiagram', { name: f.name }), 'error');
      }
    }
  };

  const items = (d: LibraryDoc): MenuEntry[] => [
    { label: t('common.open'), icon: <FolderOpen />, onSelect: () => void open(d) },
    { label: t('common.rename'), icon: <Pencil />, onSelect: () => setRenaming(d.id) },
    { label: t('common.duplicate'), icon: <Copy />, onSelect: () => void duplicateLibraryDoc(d.id) },
    { label: t('storage.download'), icon: <Download />, onSelect: () => void download(d) },
    { type: 'separator' },
    { label: t('common.delete'), icon: <Trash />, danger: true, onSelect: () => void remove(d) },
  ];

  return (
    <div onKeyDown={(e) => e.stopPropagation()} className="flex max-h-[80vh] flex-col">
      <DialogHeader title={t('storage.title')} subtitle={t('storage.subtitle')} onClose={close} />
      <div className="flex items-center gap-2 px-5 pb-3">
        <SearchInput value={query} onChange={setQuery} placeholder={t('storage.searchPlaceholder')} className="flex-1" />
        <Button size="sm" icon={<FileUp className="size-3.5" />} onClick={() => fileRef.current?.click()}>
          {t('storage.addFiles')}
        </Button>
        <Button size="sm" variant="primary" icon={<Save className="size-3.5" />} onClick={() => void saveHere()}>
          {currentId ? t('common.save') : t('storage.saveCurrent')}
        </Button>
        <input ref={fileRef} type="file" hidden multiple accept=".arkdraw,.json" onChange={(e) => e.target.files && void upload(e.target.files).finally(() => (e.target.value = ''))} />
      </div>
      <div className="scroll-thin min-h-[220px] flex-1 overflow-y-auto border-t border-line px-3 py-2">
        {loaded && !shown.length && (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center text-[12.5px] text-muted">
            <HardDrive className="size-6 text-subtle" strokeWidth={1.5} />
            {docs.length ? t('storage.noMatches') : t('storage.empty')}
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {shown.map((d) => (
            <div
              key={d.id}
              className={cn('group relative flex flex-col rounded-xl p-1.5 transition-colors hover:bg-hover', d.id === currentId && 'ring-2 ring-accent/50')}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ doc: d, x: e.clientX, y: e.clientY });
              }}
            >
              <button onClick={() => void open(d)} className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-white ring-1 ring-line" aria-label={t('storage.openDoc', { name: d.name })}>
                {d.thumb ? <img src={d.thumb} alt="" className="h-full w-full object-contain p-1.5" draggable={false} /> : <span className="text-[11px] text-subtle">{t('storage.emptyThumb')}</span>}
              </button>
              <div className="mt-1.5 flex items-start gap-1 px-0.5">
                <div className="min-w-0 flex-1">
                  {renaming === d.id ? (
                    <input
                      autoFocus
                      defaultValue={d.name}
                      className="h-6 w-full rounded bg-panel px-1 text-[12px] text-fg outline-none ring-2 ring-accent/40"
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      onBlur={(e) => {
                        void renameLibraryDoc(d.id, e.target.value);
                        setRenaming(null);
                      }}
                    />
                  ) : (
                    <div className="truncate text-[12.5px] font-medium text-fg" title={d.name}>
                      {d.name}
                    </div>
                  )}
                  <div className="truncate text-[11px] text-muted">
                    {fmtWhen(d.modified)} · {d.pages > 1 ? `${t('common.pageCount', { count: d.pages })} · ` : ''}
                    {fmtSize(d.size)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setMenu({ doc: d, x: r.left, y: r.bottom + 4 });
                  }}
                  className="rounded p-1 text-subtle opacity-0 hover:bg-panel hover:text-fg group-hover:opacity-100"
                  aria-label={t('storage.docActions')}
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={items(menu.doc)} onClose={() => setMenu(null)} />}
    </div>
  );
}
