/**
 * Automation dialogs: Configuration, Layout from JSON, Print, Embed, Edit
 * Mermaid and Replay. Mounted through AutomationHost.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { Page, PaperSize } from '@/model/types';
import { cn } from '@/lib/cn';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { parsePages } from '@/io/fileFormat';
import { renderSvg, renderSvgStandalone } from '@/io/export/svg';
import { SHARE_URL_WARN_LENGTH } from '@/io/export/config';
import { listRevisions, type Revision } from '@/app/revisions';
import { DEFAULT_PRINT_OPTIONS, printWithOptions, type PrintOptions } from '@/app/print';
import { PAPER_SIZES } from '@/canvas/paper';
import { Button } from '@/ui/Button';
import { DialogHeader } from '@/ui/Dialog';
import { Segmented, Select, Switch } from '@/ui/controls';
import { CONFIG_EXAMPLE, applyConfig, loadConfig, parseConfig, saveConfig } from './configuration';
import { LAYOUT_JSON_EXAMPLE, parseLayoutJson, runLayoutSteps } from './layouts';
import { commitDoc } from './editorBridge';
import { iframeSnippet, imageSnippet, markdownImage, markdownLink, svgDataUri, viewerUrl } from './embedSnippets';
import { mermaidGroupOf, regenerateMermaid } from './mermaidRegen';
import { Field, inputCls, rich, segLabel, stopKeys, textareaCls } from './formUi';
import { formatDate, t as tNow, useT } from '@/i18n';

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{children}</div>;
}

function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <ul className="space-y-0.5 rounded-lg bg-danger/10 px-3 py-2 text-[12px] text-danger">
      {errors.slice(0, 6).map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function ConfigurationBody({ close }: { close: () => void }) {
  const [text, setText] = useState(() => {
    const c = loadConfig();
    return JSON.stringify(Object.keys(c).length ? c : {}, null, 2);
  });
  const t = useT();
  const { errors } = useMemo(() => parseConfig(text), [text, t]);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const { config } = parseConfig(text);
    if (!config) return;
    setBusy(true);
    saveConfig(config);
    const notes = await applyConfig(config);
    setBusy(false);
    useUi.getState().toast(tNow('automation.config.applied'), 'success');
    notes.forEach((n) => useUi.getState().toast(n, 'info'));
    close();
  };

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title={t('automation.config.title')} subtitle={t('automation.config.subtitle')} onClose={close} />
      <div className="space-y-2 px-5 pb-4">
        <textarea className={cn(textareaCls, 'h-[300px]')} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <ErrorList errors={errors} />
        <div className="flex items-center gap-3 text-[11.5px] text-subtle">
          <button className="text-accent hover:underline" onClick={() => setText(JSON.stringify(CONFIG_EXAMPLE, null, 2))}>
            {t('automation.config.insertExample')}
          </button>
          <span>{t('automation.config.keys')}</span>
        </div>
      </div>
      <Footer>
        <Button
          onClick={() => {
            saveConfig({});
            setText('{}');
          }}
        >
          {t('common.reset')}
        </Button>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={!!errors.length || busy} onClick={() => void apply()}>
          {t('common.apply')}
        </Button>
      </Footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout from JSON
// ---------------------------------------------------------------------------

const LAYOUT_KEY = 'arkdraw:layout-json';

export function LayoutJsonBody({ close }: { close: () => void }) {
  const t = useT();
  const [text, setText] = useState(() => localStorage.getItem(LAYOUT_KEY) ?? LAYOUT_JSON_EXAMPLE);
  const error = useMemo(() => {
    try {
      parseLayoutJson(text);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [text]);

  const apply = () => {
    const steps = parseLayoutJson(text);
    try {
      localStorage.setItem(LAYOUT_KEY, text);
    } catch {
      /* ignore */
    }
    const s = useEditor.getState();
    const { doc, changed } = runLayoutSteps(s.doc, s.selection, steps);
    if (!changed.length) return useUi.getState().toast(tNow('automation.layoutJson.nothing'));
    commitDoc(doc);
    close();
    requestAnimationFrame(() => useEditor.getState().zoomToFit(changed.length > 1 ? changed : undefined));
  };

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader
        title={t('automation.layoutJson.title')}
        subtitle={t('automation.layoutJson.subtitle')}
        onClose={close}
      />
      <div className="space-y-2 px-5 pb-4">
        <textarea className={cn(textareaCls, 'h-[220px]')} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <ErrorList errors={error ? [error] : []} />
      </div>
      <Footer>
        <Button onClick={() => setText(LAYOUT_JSON_EXAMPLE)}>{t('automation.layoutJson.example')}</Button>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={!!error} onClick={apply}>
          {t('automation.layoutJson.apply')}
        </Button>
      </Footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------

const PRINT_KEY = 'arkdraw:print-options';
type Scaling = PrintOptions['scaling']['mode'];
const PAPERS = ['A3', 'A4', 'A5', 'Letter', 'Legal', 'Tabloid'] as const satisfies readonly Exclude<PaperSize, 'Custom'>[];

export function PrintBody({ close }: { close: () => void }) {
  const t = useT();
  const pageCount = useEditor((s) => s.pages.length);
  const firstPaper = useEditor((s) => s.pages[0]?.settings.paper);
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(PRINT_KEY) || '{}') as Partial<{ mode: Scaling; cols: number; rows: number; percent: number; background: boolean; paper: string; landscape: boolean }>;
    } catch {
      return {};
    }
  }, []);
  const [which, setWhich] = useState<'all' | 'current' | 'range'>('all');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(pageCount);
  const [mode, setMode] = useState<Scaling>(saved.mode ?? 'fit');
  const [cols, setCols] = useState(saved.cols ?? 2);
  const [rows, setRows] = useState(saved.rows ?? 1);
  const [percent, setPercent] = useState(saved.percent ?? 100);
  const [background, setBackground] = useState(saved.background ?? true);
  const [paper, setPaper] = useState<string>(saved.paper ?? (firstPaper && firstPaper !== 'Custom' && (PAPERS as readonly string[]).includes(firstPaper) ? firstPaper : 'A4'));
  const [landscape, setLandscape] = useState(saved.landscape ?? false);

  const print = () => {
    const opts: PrintOptions = {
      ...DEFAULT_PRINT_OPTIONS,
      pages: which === 'range' ? { from: Math.max(1, from), to: Math.max(from, to) } : which,
      scaling: mode === 'fit' ? { mode } : mode === 'sheets' ? { mode, cols, rows } : { mode, percent },
      paper: paper as Exclude<PaperSize, 'Custom'>,
      landscape,
      background,
    };
    try {
      localStorage.setItem(PRINT_KEY, JSON.stringify({ mode, cols, rows, percent, background, paper, landscape }));
    } catch {
      /* ignore */
    }
    close();
    void printWithOptions(opts);
  };

  const num = (v: number, set: (n: number) => void, min: number, max: number, suffix?: string) => (
    <span className="inline-flex items-center gap-1">
      <input type="number" min={min} max={max} value={v} onChange={(e) => set(Math.min(max, Math.max(min, Number(e.target.value) || min)))} className={cn(inputCls, 'w-16 text-center tabular-nums')} />
      {suffix && <span className="text-[12px] text-muted">{suffix}</span>}
    </span>
  );

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title={t('automation.print.title')} subtitle={t('automation.print.subtitle')} onClose={close} />
      <div className="space-y-3.5 px-5 pb-4">
        <Field label={t('common.pages')}>
          <Segmented<'all' | 'current' | 'range'>
            size="sm"
            value={which}
            onChange={setWhich}
            options={[
              { value: 'all', label: segLabel(t('automation.print.all', { count: pageCount })) },
              { value: 'current', label: segLabel(t('automation.print.current')) },
              { value: 'range', label: segLabel(t('automation.print.range')) },
            ]}
          />
        </Field>
        {which === 'range' && (
          <div className="flex items-center gap-2 text-[12px] text-muted">
            {rich(t, 'automation.print.fromTo', { from: num(from, setFrom, 1, pageCount), to: num(to, setTo, 1, pageCount) })}
          </div>
        )}
        <Field label={t('automation.print.scaling')}>
          <Segmented<Scaling>
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'fit', label: segLabel(t('automation.print.fitOne')) },
              { value: 'sheets', label: segLabel(t('automation.print.fitSheets')) },
              { value: 'scale', label: segLabel(t('automation.print.scale')) },
            ]}
          />
        </Field>
        {mode === 'sheets' && (
          <div className="flex items-center gap-2 text-[12px] text-muted">
            {rich(t, 'automation.print.sheets', { cols: num(cols, setCols, 1, 20), rows: num(rows, setRows, 1, 20) })}
          </div>
        )}
        {mode === 'scale' && <div className="flex items-center gap-2 text-[12px] text-muted">{rich(t, 'automation.print.scaleHint', { percent: num(percent, setPercent, 5, 1000, '%') })}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('automation.print.paper')}>
            <Select value={paper} onChange={setPaper} options={PAPERS.map((p) => ({ value: p, label: PAPER_SIZES[p].label }))} />
          </Field>
          <Field label={t('automation.print.orientation')}>
            <Segmented<'p' | 'l'>
              size="sm"
              value={landscape ? 'l' : 'p'}
              onChange={(v) => setLandscape(v === 'l')}
              options={[
                { value: 'p', label: segLabel(t('automation.print.portrait')) },
                { value: 'l', label: segLabel(t('automation.print.landscape')) },
              ]}
            />
          </Field>
        </div>
        <Switch label={t('automation.print.background')} checked={background} onChange={setBackground} />
      </div>
      <Footer>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" onClick={print}>
          {t('automation.print.print')}
        </Button>
      </Footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Embed snippets
// ---------------------------------------------------------------------------

function Snippet({ label, value, note }: { label: string; value: string; note?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <Field label={label} hint={note}>
      <div className="relative">
        <textarea readOnly className={cn(textareaCls, 'h-[64px] pr-10 text-[11px]')} value={value} onFocus={(e) => e.target.select()} />
        <button
          className="absolute right-1.5 top-1.5 rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg"
          aria-label={t('automation.embed.copy', { label })}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </Field>
  );
}

export function EmbedBody({ close }: { close: () => void }) {
  const t = useT();
  const name = useEditor((s) => s.file.name.replace(/\.arkdraw$/i, ''));
  const [scope, setScope] = useState<'all' | 'current'>('all');
  const [toolbar, setToolbar] = useState(true);
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('480');
  const [svg, setSvg] = useState<string | null>(null);
  const pages: Page[] = useMemo(() => {
    const s = useEditor.getState();
    const all = s.allPages();
    return scope === 'all' ? all : all.filter((p) => p.id === s.activePageId);
  }, [scope]);
  const url = useMemo(() => viewerUrl(pages, { toolbar }), [pages, toolbar]);

  useEffect(() => {
    let alive = true;
    const s = useEditor.getState();
    const page = s.allPages().find((p) => p.id === s.activePageId);
    if (!page) return;
    renderSvgStandalone(page.doc, { background: page.settings.background ?? '#ffffff', padding: 16, embedFont: false })
      .then((r) => alive && setSvg(r.svg))
      .catch(() => alive && setSvg(null));
    return () => {
      alive = false;
    };
  }, []);
  const dataUri = svg ? svgDataUri(svg) : '';

  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title={t('automation.embed.title')} subtitle={t('automation.embed.subtitle')} onClose={close} />
      <div className="scroll-thin max-h-[64vh] space-y-3 overflow-y-auto px-5 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<'all' | 'current'>
            className="w-[220px]"
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: segLabel(t('automation.embed.allPages')) },
              { value: 'current', label: segLabel(t('automation.embed.currentPage')) },
            ]}
          />
          <div className="w-[150px]">
            <Switch label={t('automation.embed.toolbar')} checked={toolbar} onChange={setToolbar} />
          </div>
          <span className="flex items-center gap-1 text-[12px] text-muted">
            <input className={cn(inputCls, 'w-16')} value={width} onChange={(e) => setWidth(e.target.value)} aria-label={t('common.width')} /> ×
            <input className={cn(inputCls, 'w-16')} value={height} onChange={(e) => setHeight(e.target.value)} aria-label={t('common.height')} />
          </span>
        </div>
        <Snippet
          label={t('automation.embed.iframe')}
          value={iframeSnippet(url, { width, height, title: name })}
          note={url.length > SHARE_URL_WARN_LENGTH ? t('automation.embed.longLink', { count: Math.round(url.length / 1000) }) : undefined}
        />
        <Snippet label={t('automation.embed.viewerLink')} value={url} />
        <Snippet label={t('automation.embed.markdownLink')} value={markdownLink(url, name)} />
        {dataUri && (
          <>
            <Snippet label={t('automation.embed.imageHtml')} value={imageSnippet(dataUri, { alt: name, link: url })} note={t('automation.embed.dataUriSize', { size: Math.round(dataUri.length / 1024) })} />
            <Snippet label={t('automation.embed.imageMarkdown')} value={markdownImage(dataUri, { alt: name, link: url })} />
          </>
        )}
      </div>
      <Footer>
        <Button variant="primary" onClick={close}>
          {t('common.done')}
        </Button>
      </Footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Mermaid
// ---------------------------------------------------------------------------

export function MermaidBody({ groupId, close }: { groupId: string; close: () => void }) {
  const t = useT();
  const initial = useMemo(() => mermaidGroupOf(useEditor.getState().doc, groupId)?.source ?? '', [groupId]);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      await regenerateMermaid(groupId, text);
      close();
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
      setBusy(false);
    }
  };
  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title={t('automation.mermaid.title')} subtitle={t('automation.mermaid.subtitle')} onClose={close} />
      <div className="space-y-2 px-5 pb-4">
        <textarea
          className={cn(textareaCls, 'h-[280px]')}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void apply();
          }}
        />
        <ErrorList errors={error ? [error] : []} />
      </div>
      <Footer>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={busy || !text.trim()} onClick={() => void apply()}>
          {t('common.apply')}
        </Button>
      </Footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Replay (revision history as an animation)
// ---------------------------------------------------------------------------

interface Frame {
  rev: Revision;
  svg: string | null;
}

export function ReplayBody({ close }: { close: () => void }) {
  const t = useT();
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    let alive = true;
    void listRevisions().then((revs) => {
      const s = useEditor.getState();
      const ordered = [...revs].reverse();
      // Plus the current state as the last frame.
      const now: Revision = { id: 'now', doc: '', createdAt: Date.now(), kind: 'auto', data: '', elements: s.doc.order.length };
      const pageId = s.activePageId;
      const render = (pages: Page[]) => {
        const page = pages.find((p) => p.id === pageId) ?? pages[0];
        if (!page?.doc.order.length) return null;
        try {
          const r = renderSvg(page.doc, { background: '#ffffff', padding: 24, embedFont: false });
          return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg)}`;
        } catch {
          return null;
        }
      };
      const list: Frame[] = ordered.map((rev) => {
        try {
          return { rev, svg: render(parsePages(rev.data)) };
        } catch {
          return { rev, svg: null };
        }
      });
      list.push({ rev: now, svg: render(s.allPages()) });
      if (!alive) return;
      setFrames(list);
      setI(0);
      setPlaying(list.length > 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    window.clearInterval(timer.current);
    if (!playing || !frames) return;
    timer.current = window.setInterval(() => {
      setI((x) => {
        if (x >= frames.length - 1) {
          setPlaying(false);
          return x;
        }
        return x + 1;
      });
    }, 900);
    return () => window.clearInterval(timer.current);
  }, [playing, frames]);

  const f = frames?.[i];
  return (
    <div onKeyDown={stopKeys}>
      <DialogHeader title={t('automation.replay.title')} subtitle={t('automation.replay.subtitle')} onClose={close} />
      <div className="px-5 pb-3">
        <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line">
          {!frames ? (
            <span className="text-[12px] text-subtle">{t('automation.replay.loading')}</span>
          ) : f?.svg ? (
            <img key={f.rev.id} src={f.svg} alt="" className="animate-fade h-full w-full object-contain p-2" />
          ) : (
            <span className="text-[12px] text-subtle">{t('automation.replay.emptyPage')}</span>
          )}
        </div>
        {frames && (
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" aria-label={t('automation.replay.first')} onClick={() => setI(0)} icon={<SkipBack className="size-3.5" />} />
            <Button size="sm" variant="primary" onClick={() => (i >= frames.length - 1 ? (setI(0), setPlaying(true)) : setPlaying(!playing))} icon={playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}>
              {playing ? t('automation.replay.pause') : t('automation.replay.play')}
            </Button>
            <Button size="sm" aria-label={t('automation.replay.last')} onClick={() => setI(frames.length - 1)} icon={<SkipForward className="size-3.5" />} />
            <input type="range" min={0} max={Math.max(0, frames.length - 1)} value={i} onChange={(e) => (setPlaying(false), setI(Number(e.target.value)))} className="flex-1 accent-[var(--accent)]" aria-label={t('automation.replay.revision')} />
            <span className="w-[150px] truncate text-right text-[11.5px] tabular-nums text-muted">
              {f?.rev.id === 'now' ? t('automation.replay.now') : f ? formatDate(f.rev.createdAt) : ''} · {i + 1}/{frames.length}
            </span>
          </div>
        )}
        {frames && frames.length <= 1 && <p className="mt-2 text-[12px] text-subtle">{t('automation.replay.noRevisions')}</p>}
      </div>
      <Footer>
        <Button onClick={close}>{t('common.close')}</Button>
      </Footer>
    </div>
  );
}

/** The lazily loaded dialogs, picked by kind (see AutomationHost). */
export function LazyDialogs({ dialog, close }: { dialog: import('./ui').AutomationDialog; close: () => void }) {
  switch (dialog.kind) {
    case 'configuration':
      return <ConfigurationBody close={close} />;
    case 'layoutJson':
      return <LayoutJsonBody close={close} />;
    case 'print':
      return <PrintBody close={close} />;
    case 'embed':
      return <EmbedBody close={close} />;
    case 'mermaid':
      return <MermaidBody groupId={dialog.groupId} close={close} />;
    case 'replay':
      return <ReplayBody close={close} />;
    default:
      return null;
  }
}
