/**
 * Review & history surfaces: comments panel, revision history dialog and
 * preferences dialog.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, CornerDownRight, History, MessageSquare, RotateCcw, Trash, X } from 'lucide-react';
import type { Comment, DiagramElement } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { uid } from '@/lib/id';
import { cn } from '@/lib/cn';
import { parsePages } from '@/io/fileFormat';
import { renderSvg } from '@/io/export/svg';
import { revealElement } from '@/app/commands';
import { markUnsaved, confirmDiscard } from '@/app/fileCommands';
import { deleteRevision, listRevisions, type Revision } from '@/app/revisions';
import { authorName, usePreferences } from '@/app/preferences';
import { FONT_LABELS } from '@/model/defaults';
import type { FontKey } from '@/model/types';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { Select } from '@/ui/controls';

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
};

const label = (el: DiagramElement) => el.name || el.text.split('\n')[0] || (el.type === 'connector' ? 'Connector' : 'Shape');

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

function updateComments(id: string, fn: (c: Comment[]) => Comment[]) {
  const s = useEditor.getState();
  const el = s.doc.elements[id];
  if (!el) return;
  const next = fn(el.comments ?? []);
  s.updateElements({ [id]: { comments: next.length ? next : undefined } });
}

export function CommentsPanel() {
  const open = useUi((s) => s.commentsOpen);
  if (!open) return null;
  return <CommentsBody />;
}

function CommentsBody() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const [showResolved, setShowResolved] = useState(false);
  const [draft, setDraft] = useState('');
  const threads = useMemo(
    () =>
      doc.order
        .map((id) => doc.elements[id])
        .filter((el) => el.comments?.length)
        .flatMap((el) => el.comments!.map((c) => ({ el, c })))
        .filter(({ c }) => showResolved || !c.resolved)
        .sort((a, b) => b.c.createdAt - a.c.createdAt),
    [doc, showResolved],
  );
  const target = selection.length === 1 ? doc.elements[selection[0]] : undefined;
  const add = () => {
    if (!target || !draft.trim()) return;
    updateComments(target.id, (cs) => [...cs, { id: uid(), author: authorName(), text: draft.trim(), createdAt: Date.now() }]);
    setDraft('');
  };

  return (
    <div className="animate-slide-up pointer-events-auto absolute bottom-2.5 right-2.5 top-2.5 z-20 flex w-[340px] flex-col overflow-hidden rounded-2xl bg-panel shadow-pop" onKeyDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 px-4 pb-2 pt-3.5">
        <MessageSquare className="size-4 text-accent" />
        <h2 className="flex-1 text-[14px] font-semibold text-fg">Comments</h2>
        <button onClick={() => setShowResolved(!showResolved)} className={cn('rounded-md px-2 py-0.5 text-[11.5px]', showResolved ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover')}>
          Resolved
        </button>
        <button onClick={() => useUi.getState().set({ commentsOpen: false })} className="rounded-md p-1 text-subtle hover:bg-hover hover:text-fg" aria-label="Close comments">
          <X className="size-4" />
        </button>
      </div>
      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {!threads.length && (
          <div className="px-4 py-12 text-center text-[12.5px] leading-relaxed text-muted">
            No comments yet. Select a shape and leave a note for your team — comments are saved in the file.
          </div>
        )}
        {threads.map(({ el, c }) => (
          <Thread key={c.id} el={el} c={c} />
        ))}
      </div>
      <div className="border-t border-line p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add();
          }}
          disabled={!target}
          placeholder={target ? `Comment on “${label(target)}”…` : 'Select an element to comment on it'}
          className="h-[68px] w-full resize-none rounded-xl bg-panel-2 p-2.5 text-[12.5px] text-fg outline-none ring-1 ring-transparent placeholder:text-subtle focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="primary" disabled={!target || !draft.trim()} onClick={add}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}

function Thread({ el, c }: { el: DiagramElement; c: Comment }) {
  const [reply, setReply] = useState('');
  return (
    <div className={cn('rounded-xl p-3 ring-1 ring-line transition-opacity', c.resolved && 'opacity-60')}>
      <button onClick={() => revealElement(el.id)} className="mb-1.5 max-w-full truncate rounded-md bg-panel-2 px-1.5 py-0.5 text-[11px] text-muted hover:text-fg">
        {label(el)}
      </button>
      <CommentBody c={c} />
      {c.replies?.map((r) => (
        <div key={r.id} className="mt-2 border-l-2 border-line pl-2.5">
          <CommentBody c={r} />
        </div>
      ))}
      <div className="mt-2 flex items-center gap-1.5">
        <CornerDownRight className="size-3.5 shrink-0 text-subtle" />
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && reply.trim()) {
              updateComments(el.id, (cs) => cs.map((x) => (x.id === c.id ? { ...x, replies: [...(x.replies ?? []), { id: uid(), author: authorName(), text: reply.trim(), createdAt: Date.now() }] } : x)));
              setReply('');
            }
          }}
          placeholder="Reply…"
          className="h-7 min-w-0 flex-1 rounded-lg bg-panel-2 px-2 text-[12px] text-fg outline-none placeholder:text-subtle focus:ring-2 focus:ring-accent/40"
        />
        <button
          title={c.resolved ? 'Reopen' : 'Resolve'}
          onClick={() => updateComments(el.id, (cs) => cs.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)))}
          className={cn('rounded-md p-1', c.resolved ? 'bg-success/15 text-success' : 'text-subtle hover:bg-hover hover:text-success')}
        >
          <Check className="size-3.5" />
        </button>
        <button title="Delete" onClick={() => updateComments(el.id, (cs) => cs.filter((x) => x.id !== c.id))} className="rounded-md p-1 text-subtle hover:bg-danger/10 hover:text-danger">
          <Trash className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function CommentBody({ c }: { c: Comment }) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-fg">{c.author.slice(0, 1).toUpperCase()}</span>
        <span className="text-[12px] font-semibold text-fg">{c.author}</span>
        <span className="text-[11px] text-subtle">{ago(c.createdAt)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap pl-[26px] text-[12.5px] leading-relaxed text-fg">{c.text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revision history
// ---------------------------------------------------------------------------

export function RevisionsDialog() {
  const open = useUi((s) => s.revisionsOpen);
  const set = useUi((s) => s.set);
  return (
    <Dialog open={open} onClose={() => set({ revisionsOpen: false })} className="w-[820px] max-w-[94vw]">
      {open && <RevisionsBody close={() => set({ revisionsOpen: false })} />}
    </Dialog>
  );
}

function RevisionsBody({ close }: { close: () => void }) {
  const [revs, setRevs] = useState<Revision[] | null>(null);
  const [active, setActive] = useState<Revision | null>(null);
  const fileName = useEditor((s) => s.file.name);
  useEffect(() => {
    listRevisions().then((r) => {
      setRevs(r);
      setActive(r[0] ?? null);
    });
  }, []);
  const preview = useMemo(() => {
    if (!active) return null;
    try {
      const page = parsePages(active.data)[0];
      const { svg } = renderSvg(page.doc, { background: '#ffffff', padding: 16, embedFont: false });
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      return null;
    }
  }, [active]);
  const restore = async (asCopy: boolean) => {
    if (!active || !(await confirmDiscard())) return;
    const pages = parsePages(active.data);
    const s = useEditor.getState();
    const f = s.file;
    s.loadPages(pages, asCopy ? { path: null, name: `${f.name.replace(/\.opendraw$/i, '')} (restored)` } : { path: f.path, name: f.name });
    markUnsaved();
    close();
  };
  return (
    <>
      <DialogHeader title="Revision history" subtitle={`Local snapshots of “${fileName}” — taken on every save and while you work.`} onClose={close} />
      <div className="grid grid-cols-[260px_1fr] gap-4 px-5 pb-5">
        <div className="scroll-thin max-h-[420px] space-y-0.5 overflow-y-auto">
          {revs === null && <div className="py-8 text-center text-[12.5px] text-muted">Loading…</div>}
          {revs?.length === 0 && <div className="py-8 text-center text-[12.5px] text-muted">No revisions yet. Save the diagram to create one.</div>}
          {revs?.map((r) => (
            <div
              key={r.id}
              onClick={() => setActive(r)}
              className={cn('group flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2', active?.id === r.id ? 'bg-accent-soft' : 'hover:bg-hover')}
            >
              <History className={cn('size-4 shrink-0', r.kind === 'save' ? 'text-accent' : 'text-subtle')} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-fg">{new Date(r.createdAt).toLocaleString()}</div>
                <div className="text-[11px] text-muted">
                  {r.kind === 'save' ? 'Saved' : 'Autosnapshot'} · {r.elements} elements
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteRevision(r.id).then(() => setRevs((x) => x?.filter((y) => y.id !== r.id) ?? null));
                }}
                className="rounded p-1 text-subtle opacity-0 hover:text-danger group-hover:opacity-100"
                aria-label="Delete revision"
              >
                <Trash className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col">
          <div className="flex min-h-[340px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line">
            {preview ? <img src={preview} alt="Revision preview" className="max-h-[320px] max-w-[95%] object-contain" /> : <span className="text-[12.5px] text-muted">Select a revision</span>}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button disabled={!active} onClick={() => void restore(true)}>
              Open as copy
            </Button>
            <Button variant="primary" disabled={!active} icon={<RotateCcw className="size-3.5" />} onClick={() => void restore(false)}>
              Restore
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export function PreferencesDialog() {
  const open = useUi((s) => s.prefsOpen);
  const set = useUi((s) => s.set);
  return (
    <Dialog open={open} onClose={() => set({ prefsOpen: false })} className="w-[460px]">
      {open && <PrefsBody close={() => set({ prefsOpen: false })} />}
    </Dialog>
  );
}

function PrefsBody({ close }: { close: () => void }) {
  const prefs = usePreferences();
  const [colors, setColors] = useState(prefs.customColors.join(', '));
  const input = 'h-8 w-full rounded-lg bg-panel-2 px-2.5 text-[12.5px] text-fg outline-none focus:ring-2 focus:ring-accent/40';
  return (
    <div onKeyDown={(e) => e.stopPropagation()}>
      <DialogHeader title="Preferences" onClose={close} />
      <div className="space-y-4 px-5 pb-5">
        <label className="block space-y-1.5">
          <span className="text-[11.5px] font-medium text-muted">Your name (for comments)</span>
          <input className={input} defaultValue={prefs.author} onBlur={(e) => prefs.update({ author: e.target.value.trim() })} placeholder="e.g. Ada Lovelace" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11.5px] font-medium text-muted">Default font for new shapes</span>
          <Select<FontKey> value={prefs.defaultFont} onChange={(defaultFont) => prefs.update({ defaultFont })} options={(Object.keys(FONT_LABELS) as FontKey[]).map((k) => ({ value: k, label: FONT_LABELS[k] }))} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11.5px] font-medium text-muted">Custom palette (hex colors, comma separated)</span>
          <input
            className={input}
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            onBlur={() => prefs.update({ customColors: colors.split(/[,\s]+/).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c)) })}
            placeholder="#0ea5e9, #f43f5e"
          />
          {prefs.customColors.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {prefs.customColors.map((c) => (
                <span key={c} className="size-5 rounded" style={{ background: c, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / .1)' }} />
              ))}
            </div>
          )}
        </label>
        <div className="flex justify-end">
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
