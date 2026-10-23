/**
 * Start screen (draw.io's splash): shown on launch when nothing else was
 * opened — new blank diagram, a few templates, recent files, open from disk
 * or from browser storage. "Don't show again" turns it off (Preferences
 * brings it back).
 */
import { useEffect, useState } from 'react';
import { Clock, FilePlus, FolderOpen, HardDrive, LayoutTemplate } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { usePreferences } from '@/app/preferences';
import { markUnsaved, openDocument, openPath } from '@/app/fileCommands';
import { getRecentFiles, type RecentFile } from '@/io/native';
import { isTauri } from '@/lib/platform';
import { cn } from '@/lib/cn';
import { TEMPLATES, type Template } from '@/templates';
import { thumbnail, type Thumb } from '@/templates/thumbnails';
import { DialogHeader } from '@/ui/Dialog';
import { openAutomationDialog } from '@/automation/ui';

const QUICK = ['flowchart', 'org', 'mind', 'kanban', 'network', 'uml', 'erd', 'sequence'];

/** A handful of popular templates (by id/name keywords), falling back to the first ones. */
function quickTemplates(): Template[] {
  const pool = TEMPLATES.filter((t) => t.id !== 'blank');
  const picked: Template[] = [];
  for (const k of QUICK) {
    const t = pool.find((x) => !picked.includes(x) && (x.id.includes(k) || x.name.toLowerCase().includes(k)));
    if (t) picked.push(t);
    if (picked.length === 5) break;
  }
  for (const t of pool) if (picked.length < 5 && !picked.includes(t)) picked.push(t);
  return picked;
}

function TemplateThumb({ t }: { t: Template }) {
  const [thumb, setThumb] = useState<Thumb | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    thumbnail(t).then((v) => alive && setThumb(v));
    return () => {
      alive = false;
    };
  }, [t]);
  return thumb ? <img src={thumb.src} alt="" className="h-full w-full object-contain p-2" draggable={false} /> : <div className="h-full w-full animate-pulse bg-panel-2" />;
}

/** True when the editor holds an untouched, untitled, empty document. */
export function isPristine(): boolean {
  const s = useEditor.getState();
  return !s.file.path && s.file.name === 'Untitled' && s.pages.length === 1 && s.doc.order.length === 0 && s.past.length === 0;
}

export function StartScreenBody({ close }: { close: () => void }) {
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const show = usePreferences((p) => p.startScreen !== false);
  const update = usePreferences((p) => p.update);
  const [quick] = useState(quickTemplates);

  useEffect(() => {
    getRecentFiles()
      .then((r) => setRecent(r.slice(0, 6)))
      .catch(() => {});
  }, []);

  const createFrom = (t: Template) => {
    close();
    useEditor.getState().loadPages(t.build(), { path: null, name: t.name });
    markUnsaved();
    requestAnimationFrame(() => useEditor.getState().zoomToFit());
  };

  const big = (icon: React.ReactNode, label: string, sub: string, onClick: () => void) => (
    <button onClick={onClick} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-hover">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-[18px]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        <span className="block truncate text-[11.5px] text-muted">{sub}</span>
      </span>
    </button>
  );

  return (
    <div onKeyDown={(e) => e.stopPropagation()}>
      <DialogHeader title="Welcome to OpenDraw" subtitle="Start a new diagram or pick up where you left off." onClose={close} />
      <div className="grid grid-cols-[230px_1fr] gap-4 px-4 pb-3">
        <div className="flex flex-col gap-0.5">
          {big(<FilePlus />, 'Blank diagram', 'Start from an empty canvas', close)}
          {big(<LayoutTemplate />, 'Templates…', 'Browse the gallery and My templates', () => {
            close();
            useUi.getState().set({ templatesOpen: true });
          })}
          {big(<FolderOpen />, 'Open…', isTauri() ? 'A file on this computer' : 'A file from your device', () => {
            close();
            void openDocument();
          })}
          {!isTauri() &&
            big(<HardDrive />, 'Open from browser…', 'Diagrams saved in this browser', () => {
              close();
              openAutomationDialog({ kind: 'library' });
            })}
        </div>
        <div className="min-w-0 space-y-3">
          <section>
            <h3 className="mb-1.5 text-[11.5px] font-medium text-muted">Templates</h3>
            <div className="grid grid-cols-5 gap-2">
              {quick.map((t) => (
                <button key={t.id} onClick={() => createFrom(t)} className="group text-left" title={t.description}>
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-white ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-accent/50">
                    <TemplateThumb t={t} />
                  </div>
                  <div className="mt-1 truncate text-[11.5px] text-fg">{t.name}</div>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-1 text-[11.5px] font-medium text-muted">Recent</h3>
            {recent.length ? (
              <div className="grid grid-cols-2 gap-x-2">
                {recent.map((r) => (
                  <button
                    key={r.path}
                    onClick={() => {
                      close();
                      void openPath(r.path);
                    }}
                    className="flex h-8 items-center gap-2 truncate rounded-lg px-2 text-left text-[12.5px] text-fg hover:bg-hover"
                    title={r.path.startsWith('web-recent:') ? r.name : r.path}
                  >
                    <Clock className="size-3.5 shrink-0 text-subtle" />
                    <span className="truncate">{r.name.replace(/\.opendraw$/i, '')}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-2 py-1.5 text-[12px] text-subtle">Files you open or save will show up here.</p>
            )}
          </section>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
          <input type="checkbox" className={cn('size-3.5 accent-[var(--accent)]')} checked={!show} onChange={(e) => update({ startScreen: !e.target.checked })} />
          Don’t show this again
        </label>
        <span className="text-[11.5px] text-subtle">Turn it back on in Preferences</span>
      </div>
    </div>
  );
}
