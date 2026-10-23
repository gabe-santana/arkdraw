/**
 * Power-user dialogs: Edit Data (Ctrl+M), Edit Style (Ctrl+E), Edit Diagram
 * (raw page source), Find & Replace (Ctrl+F) and Import from text.
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Link2, Plus, Replace, Trash, X } from 'lucide-react';
import type { DiagramElement, ElementStyle } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { parseDoc, serializeDoc } from '@/io/fileFormat';
import { IMPORTERS } from '@/io/import';
import { cloneElements, selectionBounds } from '@/store/editor';
import { viewportCenter } from '@/canvas/viewport';
import { revealElement } from '@/app/commands';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { Segmented, Select, Switch } from '@/ui/controls';
import { withMermaidSource } from '@/automation/mermaidRegen';
import { applyDrawioStylePatch, diffDrawioStyle, formatDrawioStyle } from '@/extensibility/styleString';
import { useT } from '@/i18n';

const input =
  'h-8 w-full rounded-lg bg-panel-2 px-2.5 text-[12.5px] text-fg outline-none ring-1 ring-transparent transition-shadow placeholder:text-subtle hover:ring-line focus:bg-panel focus:ring-2 focus:ring-accent/40';
const stop = (e: React.KeyboardEvent) => e.stopPropagation();

/** Renders a translated sentence with its `{token}` placeholder replaced by a React node. */
function withNode(render: (marker: string) => string, node: React.ReactNode) {
  const [before, after = ''] = render('\u0001').split('\u0001');
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}

// ---------------------------------------------------------------------------
// Edit Data
// ---------------------------------------------------------------------------

export function EditDataDialog() {
  const id = useUi((s) => s.editDataId);
  const set = useUi((s) => s.set);
  const el = useEditor((s) => (id ? s.doc.elements[id] : undefined));
  return (
    <Dialog open={!!id && !!el} onClose={() => set({ editDataId: null })} className="w-[520px]">
      {el && <EditDataBody el={el} close={() => set({ editDataId: null })} />}
    </Dialog>
  );
}

function EditDataBody({ el, close }: { el: DiagramElement; close: () => void }) {
  const t = useT();
  const pages = useEditor((s) => s.pages);
  const [name, setName] = useState(el.name ?? '');
  const [tooltip, setTooltip] = useState(el.tooltip ?? '');
  const [link, setLink] = useState(el.link ?? '');
  const [tags, setTags] = useState((el.tags ?? []).join(', '));
  const [rows, setRows] = useState<Array<[string, string]>>(Object.entries(el.data ?? {}).filter(([k]) => !k.startsWith('__')));
  const [placeholders, setPlaceholders] = useState(!!el.style.placeholders);
  const linkKind = link.startsWith('page:') ? 'page' : 'url';

  const save = () => {
    const data = Object.fromEntries(rows.filter(([k]) => k.trim()).map(([k, v]) => [k.trim(), v]));
    const hidden = Object.fromEntries(Object.entries(el.data ?? {}).filter(([k]) => k.startsWith('__')));
    const merged = { ...hidden, ...data };
    useEditor.getState().updateElements({
      [el.id]: {
        name: name.trim() || undefined,
        tooltip: tooltip.trim() || undefined,
        link: link.trim() || undefined,
        tags: tags.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean),
        data: Object.keys(merged).length ? merged : undefined,
        style: { ...el.style, placeholders: placeholders || undefined },
      },
    });
    close();
  };

  return (
    <div onKeyDown={stop}>
      <DialogHeader title={t('chrome.editData.title')} subtitle={<span className="font-mono text-[11.5px]">{t('chrome.editData.id', { id: el.id })}</span>} onClose={close} />
      <div className="scroll-thin max-h-[60vh] space-y-3 overflow-y-auto px-5 pb-4">
        <Field label={t('common.name')}>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('chrome.editData.namePlaceholder')} />
        </Field>
        <Field label={t('chrome.editData.tooltip')}>
          <input className={input} value={tooltip} onChange={(e) => setTooltip(e.target.value)} placeholder={t('chrome.editData.tooltipPlaceholder')} />
        </Field>
        <Field label={t('chrome.editData.link')}>
          <div className="flex gap-1.5">
            <Segmented
              className="w-[120px] shrink-0"
              size="sm"
              value={linkKind}
              onChange={(k) => setLink(k === 'page' ? `page:${pages[0]?.id ?? ''}` : '')}
              options={[
                { value: 'url', label: t('chrome.editData.linkUrl') },
                { value: 'page', label: t('common.page') },
              ]}
            />
            {linkKind === 'page' ? (
              <Select value={link.slice(5)} onChange={(v) => setLink(`page:${v}`)} options={pages.map((p) => ({ value: p.id, label: p.name }))} />
            ) : (
              <div className="relative flex-1">
                <Link2 className="pointer-events-none absolute left-2.5 top-2 size-4 text-subtle" />
                <input className={cn(input, 'pl-8')} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
              </div>
            )}
          </div>
        </Field>
        <Field label={t('chrome.editData.tags')}>
          <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('chrome.editData.tagsPlaceholder')} />
        </Field>
        <Field label={t('chrome.editData.properties')}>
          <div className="space-y-1.5">
            {rows.map(([k, v], i) => (
              <div key={i} className="flex gap-1.5">
                <input className={cn(input, 'w-[38%] font-mono text-[12px]')} value={k} placeholder={t('chrome.editData.keyPlaceholder')} onChange={(e) => setRows(rows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
                <input className={input} value={v} placeholder={t('chrome.editData.valuePlaceholder')} onChange={(e) => setRows(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
                <button className="rounded-lg px-2 text-subtle hover:bg-hover hover:text-danger" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={t('common.remove')}>
                  <Trash className="size-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => setRows([...rows, ['', '']])} className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12px] text-accent hover:bg-accent-soft">
              <Plus className="size-3.5" /> {t('chrome.editData.addProperty')}
            </button>
          </div>
        </Field>
        <Switch label={withNode((token) => t('chrome.editData.placeholders', { token }), <code className="rounded bg-panel-2 px-1">%property%</code>)} checked={placeholders} onChange={setPlaceholders} />
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={save}>
          {t('common.apply')}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11.5px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Edit Style (raw)
// ---------------------------------------------------------------------------

export function styleToString(style: ElementStyle): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(';\n') + ';';
}

export function stringToStyle(text: string, base: ElementStyle): ElementStyle {
  const out: Record<string, unknown> = { ...base };
  for (const part of text.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    if (!key) continue;
    const prev = (base as unknown as Record<string, unknown>)[key];
    out[key] =
      raw === 'true' ? true : raw === 'false' ? false : typeof prev === 'number' || (/^-?\d+(\.\d+)?$/.test(raw) && key !== 'fill' && key !== 'stroke') ? Number(raw) : raw;
  }
  return out as unknown as ElementStyle;
}

export function EditStyleDialog() {
  const open = useUi((s) => s.editStyleOpen);
  const set = useUi((s) => s.set);
  const first = useEditor((s) => s.doc.elements[s.selection[0]]);
  return (
    <Dialog open={open && !!first} onClose={() => set({ editStyleOpen: false })} className="w-[480px]">
      {first && <EditStyleBody el={first} close={() => set({ editStyleOpen: false })} />}
    </Dialog>
  );
}

function EditStyleBody({ el, close }: { el: DiagramElement; close: () => void }) {
  const t = useT();
  // strings by default (src/extensibility/styleString.ts); OpenDraw keys on request.
  const [format, setFormat] = useState<'drawio' | 'opendraw'>(() => (localStorage.getItem('opendraw:styleFormat') === 'opendraw' ? 'opendraw' : 'drawio'));
  const initial = (f: 'drawio' | 'opendraw') => (f === 'drawio' ? formatDrawioStyle(el) : styleToString(el.style));
  const [text, setText] = useState(() => initial(format));
  const [error, setError] = useState<string | null>(null);
  const switchFormat = (f: 'drawio' | 'opendraw') => {
    setFormat(f);
    setText(initial(f));
    setError(null);
    try {
      localStorage.setItem('opendraw:styleFormat', f);
    } catch {
      /* storage unavailable */
    }
  };
  const apply = () => {
    const s = useEditor.getState();
    if (format === 'drawio') {
      try {
        const patch = diffDrawioStyle(el, text);
        s.updateElements(Object.fromEntries(s.selection.map((id) => [id, applyDrawioStylePatch(s.doc.elements[id], patch, el.type)])));
      } catch (e) {
        setError(String((e as Error).message ?? e));
        return;
      }
      close();
      return;
    }
    const style = stringToStyle(text, el.style);
    s.updateElements(Object.fromEntries(s.selection.map((id) => [id, { style: { ...s.doc.elements[id].style, ...style } }])));
    close();
  };
  return (
    <div onKeyDown={stop}>
      <DialogHeader
        title={t('chrome.editStyle.title')}
        subtitle={format === 'drawio' ? t('chrome.editStyle.subtitleDrawio') : t('chrome.editStyle.subtitleOpendraw')}
        onClose={close}
      />
      <div className="px-5 pb-4">
        <Segmented
          className="mb-2.5 w-[220px]"
          size="sm"
          value={format}
          onChange={switchFormat}
          options={[
            { value: 'drawio', label: t('chrome.editStyle.styleString') },
            { value: 'opendraw', label: 'OpenDraw' },
          ]}
        />
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          spellCheck={false}
          className="scroll-thin h-[320px] w-full resize-none rounded-xl bg-panel-2 p-3 font-mono text-[12px] leading-relaxed text-fg outline-none ring-1 ring-line focus:ring-2 focus:ring-accent/40"
        />
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        {format === 'drawio' && !error && <p className="mt-2 text-[11.5px] text-subtle">{t('chrome.editStyle.keptKeys')}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={apply}>
          {t('common.apply')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Diagram (raw page source)
// ---------------------------------------------------------------------------

export function EditDiagramDialog() {
  const open = useUi((s) => s.editDiagramOpen);
  const set = useUi((s) => s.set);
  return (
    <Dialog open={open} onClose={() => set({ editDiagramOpen: false })} className="w-[760px] max-w-[94vw]">
      {open && <EditDiagramBody close={() => set({ editDiagramOpen: false })} />}
    </Dialog>
  );
}

function EditDiagramBody({ close }: { close: () => void }) {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const [text, setText] = useState(() => serializeDoc(doc));
  const [error, setError] = useState<string | null>(null);
  const apply = () => {
    try {
      const next = parseDoc(text);
      const s = useEditor.getState();
      s.beginInteraction();
      s.setDoc({ ...next, layers: next.layers ?? s.doc.layers });
      s.endInteraction();
      close();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  };
  return (
    <div onKeyDown={stop}>
      <DialogHeader title={t('chrome.editDiagram.title')} subtitle={t('chrome.editDiagram.subtitle')} onClose={close} />
      <div className="px-5 pb-4">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          spellCheck={false}
          className="scroll-thin h-[52vh] w-full resize-none rounded-xl bg-panel-2 p-3 font-mono text-[11.5px] leading-relaxed text-fg outline-none ring-1 ring-line focus:ring-2 focus:ring-accent/40"
        />
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={() => navigator.clipboard?.writeText(text)}>{t('common.copy')}</Button>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={apply}>
          {t('common.apply')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Find & Replace
// ---------------------------------------------------------------------------

interface Hit {
  pageId: string;
  id: string;
  field: 'text' | 'name' | 'tooltip' | 'data';
}

export function FindPanel() {
  const open = useUi((s) => s.findOpen);
  if (!open) return null;
  return <FindBody />;
}

function FindBody() {
  const t = useT();
  const set = useUi((s) => s.set);
  const pages = useEditor((s) => s.pages);
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [opts, setOpts] = useState({ caseSensitive: false, wholeWord: false, regex: false, allPages: false, showReplace: false });
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  const matcher = useMemo(() => {
    if (!query) return null;
    try {
      const src = opts.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(opts.wholeWord ? `\\b${src}\\b` : src, opts.caseSensitive ? 'g' : 'gi');
    } catch {
      return null;
    }
  }, [query, opts.caseSensitive, opts.wholeWord, opts.regex]);

  const hits = useMemo<Hit[]>(() => {
    if (!matcher) return [];
    const out: Hit[] = [];
    const all = useEditor.getState().allPages();
    for (const p of all) {
      if (!opts.allPages && p.id !== activePageId) continue;
      const d = p.id === activePageId ? doc : p.doc;
      for (const id of d.order) {
        const el = d.elements[id];
        const test = (v?: string) => {
          if (!v) return false;
          matcher.lastIndex = 0;
          return matcher.test(v);
        };
        if (test(el.text)) out.push({ pageId: p.id, id, field: 'text' });
        else if (test(el.name)) out.push({ pageId: p.id, id, field: 'name' });
        else if (test(el.tooltip)) out.push({ pageId: p.id, id, field: 'tooltip' });
        else if (Object.values(el.data ?? {}).some(test)) out.push({ pageId: p.id, id, field: 'data' });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matcher, doc, opts.allPages, activePageId, pages]);

  useEffect(() => {
    setIndex(0);
    setStarted(false);
  }, [query]);
  const go = (i: number) => {
    if (!hits.length) return;
    const n = (i + hits.length) % hits.length;
    setIndex(n);
    revealElement(hits[n].id, hits[n].pageId);
  };

  const replaceIn = (all: boolean) => {
    if (!matcher) return;
    const s = useEditor.getState();
    const targets = all ? hits.filter((h) => h.pageId === s.activePageId) : hits[index] ? [hits[index]] : [];
    const patches: Record<string, Partial<DiagramElement>> = {};
    for (const h of targets) {
      const el = s.doc.elements[h.id];
      if (!el || h.field !== 'text') continue;
      matcher.lastIndex = 0;
      patches[h.id] = { text: el.text.replace(matcher, replacement) };
    }
    s.updateElements(patches);
  };

  const toggle = (k: keyof typeof opts, label: string) => (
    <button
      onClick={() => setOpts({ ...opts, [k]: !opts[k] })}
      title={label}
      className={cn('h-6 rounded-md px-1.5 font-mono text-[11px] transition-colors', opts[k] ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg')}
    >
      {k === 'caseSensitive' ? 'Aa' : k === 'wholeWord' ? 'ab' : k === 'regex' ? '.*' : t('chrome.find.allPagesShort')}
    </button>
  );

  return (
    <div className="animate-pop pointer-events-auto absolute left-1/2 top-3 z-30 w-[440px] -translate-x-1/2 rounded-2xl bg-panel p-2 shadow-pop" onKeyDown={stop}>
      <div className="flex items-center gap-1.5">
        <button onClick={() => setOpts({ ...opts, showReplace: !opts.showReplace })} className="rounded-md p-1 text-subtle hover:bg-hover hover:text-fg" aria-label={t('chrome.find.toggleReplace')}>
          {opts.showReplace ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        <input
          autoFocus
          className={cn(input, 'flex-1')}
          placeholder={t('chrome.find.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (!started) {
                setStarted(true);
                go(0);
              } else go(index + (e.shiftKey ? -1 : 1));
            }
            if (e.key === 'Escape') set({ findOpen: false });
          }}
        />
        <span className="w-12 text-center text-[11.5px] tabular-nums text-muted">{query ? `${hits.length ? index + 1 : 0}/${hits.length}` : ''}</span>
        <button onClick={() => go(index - 1)} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label={t('common.previous')}>
          <ChevronUp className="size-4" />
        </button>
        <button onClick={() => go(index + 1)} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label={t('common.next')}>
          <ChevronDown className="size-4" />
        </button>
        <button onClick={() => set({ findOpen: false })} className="rounded-md p-1 text-muted hover:bg-hover hover:text-fg" aria-label={t('common.close')}>
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-0.5 pl-8">
        {toggle('caseSensitive', t('chrome.find.matchCase'))}
        {toggle('wholeWord', t('chrome.find.wholeWord'))}
        {toggle('regex', t('chrome.find.regex'))}
        {toggle('allPages', t('chrome.find.allPages'))}
      </div>
      {opts.showReplace && (
        <div className="mt-1.5 flex items-center gap-1.5 pl-8">
          <input className={cn(input, 'flex-1')} placeholder={t('chrome.find.replaceWith')} value={replacement} onChange={(e) => setReplacement(e.target.value)} />
          <Button size="sm" onClick={() => replaceIn(false)} icon={<Replace className="size-3.5" />}>
            {t('chrome.find.replace')}
          </Button>
          <Button size="sm" onClick={() => replaceIn(true)}>
            {t('chrome.find.replaceAll')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import from text (Mermaid, CSV, SQL, …)
// ---------------------------------------------------------------------------

export function ImportDialog() {
  const open = useUi((s) => s.importOpen);
  const set = useUi((s) => s.set);
  return (
    <Dialog open={open} onClose={() => set({ importOpen: false })} className="w-[760px] max-w-[94vw]">
      {open && <ImportBody close={() => set({ importOpen: false })} />}
    </Dialog>
  );
}

function ImportBody({ close }: { close: () => void }) {
  const t = useT();
  const textImporters = IMPORTERS.filter((i) => i.acceptsText);
  const [id, setId] = useState(textImporters[0]?.id ?? '');
  const importer = textImporters.find((i) => i.id === id);
  const [text, setText] = useState(importer?.example ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useUi((s) => s.toast);

  useEffect(() => {
    setText(importer?.example ?? '');
    setError(null);
  }, [importer]);

  const run = async (mode: 'insert' | 'pages') => {
    if (!importer) return;
    setBusy(true);
    setError(null);
    try {
      const res = await importer.run(text);
      const s = useEditor.getState();
      if (mode === 'pages' || res.pages.length > 1) {
        for (const p of res.pages) s.addPage(p.name, p.doc);
      } else {
        const page = res.pages[0];
        const els = page.doc.order.map((oid) => page.doc.elements[oid]);
        const b = selectionBounds(page.doc, page.doc.order);
        const c = viewportCenter();
        // Mermaid keeps its source for "Edit Mermaid…" (src/automation/mermaidRegen.ts).
        const clones = withMermaidSource(importer.id, text, cloneElements(els, b ? { x: c.x - (b.x + b.w / 2), y: c.y - (b.y + b.h / 2) } : { x: 0, y: 0 }));
        s.addElements(clones);
        requestAnimationFrame(() => useEditor.getState().zoomToFit(clones.map((e) => e.id)));
      }
      res.warnings?.slice(0, 2).forEach((w) => toast(w));
      close();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  if (!textImporters.length) {
    return (
      <>
        <DialogHeader title={t('common.import')} onClose={close} />
        <p className="px-5 pb-6 text-[13px] text-muted">{t('chrome.import.none')}</p>
      </>
    );
  }

  return (
    <div onKeyDown={stop}>
      <DialogHeader title={t('chrome.import.fromText')} subtitle={importer?.description} onClose={close} />
      <div className="grid grid-cols-[170px_1fr] gap-4 px-5 pb-4">
        <div className="space-y-0.5">
          {textImporters.map((i) => (
            <button
              key={i.id}
              onClick={() => setId(i.id)}
              className={cn('flex h-8 w-full items-center rounded-lg px-2.5 text-left text-[12.5px] transition-colors', i.id === id ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-hover')}
            >
              {i.label.replace(/…$/, '')}
            </button>
          ))}
        </div>
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder={importer?.example}
            className="scroll-thin h-[340px] w-full resize-none rounded-xl bg-panel-2 p-3 font-mono text-[12px] leading-relaxed text-fg outline-none ring-1 ring-line focus:ring-2 focus:ring-accent/40"
          />
          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button onClick={() => run('pages')} disabled={busy || !text.trim()}>
          {t('chrome.import.asNewPage')}
        </Button>
        <Button variant="primary" onClick={() => run('insert')} disabled={busy || !text.trim()}>
          {t('common.insert')}
        </Button>
      </div>
    </div>
  );
}
