import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AppWindow, Check, ChevronLeft, ChevronRight, Clapperboard, Copy, FileCode2, FileImage, FileText, Film, Image, ImageDown, Info, Link2, Loader2, Network, Shapes, TriangleAlert,
} from 'lucide-react';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { saveFile } from '@/io/native';
import { exportSubset, inlineIcons, loadExportFonts, renderSvg } from '@/io/export/svg';
import { autoGifDuration, estimateGifBytes } from '@/io/export/gif';
import { estimateVideoBytes, videoDuration, videoFrameSize, videoSupported, type VideoAspect } from '@/io/export/videoPlan';
import {
  DEFAULT_EXPORT_SETTINGS, FORMATS, estimateSize, exportBundle, formatBytes, isRaster, pagesInScope, supports, svgOptionsFor,
  type ExportFormat, type ExportSettings, type ExportSource, type PageScope,
} from '@/io/export';
import { encodeShareUrl, shareUrlTooLong } from '@/io/export/share';
import { SHARE_URL_WARN_LENGTH } from '@/io/export/config';
import { hasAnimation } from '@/animation/timeline';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { NumberField, Segmented, Slider, Switch } from '@/ui/controls';
import { formatNumber, t as translate, useT, type MessageKey } from '@/i18n';

// MP4 only where the browser can encode video (WebCodecs).
const ORDER: ExportFormat[] = (['png', 'jpeg', 'webp', 'svg', 'gif', 'mp4', 'pdf', 'html', 'drawio', 'vsdx', 'url'] as const).filter(
  (f) => f !== 'mp4' || videoSupported(),
);

/** Icon and tint per format — a little color makes the grid scannable. */
const LOOK: Record<ExportFormat, { icon: ReactNode; hue: string }> = {
  png: { icon: <FileImage />, hue: '#3b82f6' },
  jpeg: { icon: <Image />, hue: '#0ea5e9' },
  webp: { icon: <ImageDown />, hue: '#06b6d4' },
  svg: { icon: <FileCode2 />, hue: '#8b5cf6' },
  gif: { icon: <Film />, hue: '#ec4899' },
  mp4: { icon: <Clapperboard />, hue: '#f43f5e' },
  pdf: { icon: <FileText />, hue: '#ef4444' },
  html: { icon: <AppWindow />, hue: '#14b8a6' },
  drawio: { icon: <Network />, hue: '#f59e0b' },
  vsdx: { icon: <Shapes />, hue: '#2563eb' },
  url: { icon: <Link2 />, hue: '#10b981' },
};

/** Format-card subtitles (FORMATS[id].desc), translated at render. */
const DESC_KEYS: Record<ExportFormat, MessageKey> = {
  png: 'export.format.png.desc',
  jpeg: 'export.format.jpeg.desc',
  webp: 'export.format.webp.desc',
  svg: 'export.format.svg.desc',
  gif: 'export.format.gif.desc',
  mp4: 'export.format.mp4.desc',
  pdf: 'export.format.pdf.desc',
  html: 'export.format.html.desc',
  drawio: 'export.format.drawio.desc',
  vsdx: 'export.format.vsdx.desc',
  url: 'export.format.url.desc',
};

/** A format's display name: file-format names stay as-is, "Link" is translated. */
const formatLabel = (id: ExportFormat) => (id === 'url' ? translate('export.format.url') : FORMATS[id].label);

/** A translated sentence whose `{name}` placeholders are React nodes (e.g. bold words). */
function rich(key: MessageKey, nodes: Record<string, ReactNode>): ReactNode {
  const marks = Object.fromEntries(Object.keys(nodes).map((k) => [k, `\u0001${k}\u0001`]));
  return translate(key, marks)
    .split('\u0001')
    .map((part, i) => (i % 2 ? <Fragment key={i}>{nodes[part]}</Fragment> : part));
}

const PREFS_KEY = 'arkdraw:export-prefs:v2';

function loadPrefs(): ExportSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as Partial<ExportSettings>;
    const s = { ...DEFAULT_EXPORT_SETTINGS, ...saved };
    return FORMATS[s.format] && ORDER.includes(s.format) ? s : DEFAULT_EXPORT_SETTINGS;
  } catch {
    return DEFAULT_EXPORT_SETTINGS;
  }
}

export function ExportDialog() {
  const open = useUi((s) => s.exportOpen);
  const set = useUi((s) => s.set);
  return (
    <Dialog open={open} onClose={() => set({ exportOpen: false })} className="flex max-h-[94vh] w-[980px] max-w-[96vw] flex-col" labelledBy="export-title">
      {open && <ExportBody close={() => set({ exportOpen: false })} />}
    </Dialog>
  );
}

interface Preview {
  url: string;
  w: number;
  h: number;
  length: number;
}

function ExportBody({ close }: { close: () => void }) {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const activePageId = useEditor((s) => s.activePageId);
  const pageCount = useEditor((s) => s.pages.length);
  const gridSize = useEditor((s) => s.settings.gridSize);
  const fileName = useEditor((s) => s.file.name.replace(/\.arkdraw$/i, ''));
  const toast = useUi((s) => s.toast);
  const [prefs, setPrefsState] = useState<ExportSettings>(() => {
    const p = loadPrefs();
    const scope: PageScope = selection.length ? 'selection' : p.scope === 'selection' ? 'current' : p.scope;
    return { ...p, scope, rangeFrom: Math.min(p.rangeFrom, pageCount), rangeTo: Math.min(Math.max(p.rangeTo, 1), pageCount) };
  });
  const [progress, setProgress] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const setPrefs = (p: Partial<ExportSettings>) =>
    setPrefsState((cur) => {
      const next = { ...cur, ...p };
      if (!supports.scopes(next.format).includes(next.scope)) next.scope = 'current';
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  // A snapshot of the document. `doc` is the live active page; allPages() merges it in.
  const src: ExportSource = useMemo(
    () => ({ pages: useEditor.getState().allPages(), activePageId, selection, fileName, gridSize }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, activePageId, selection, fileName, gridSize],
  );
  const fmt = FORMATS[prefs.format];
  const scopes = supports.scopes(prefs.format).filter((s) => (s === 'selection' ? selection.length > 0 : s === 'all' || s === 'range' ? pageCount > 1 : true));
  const pages = useMemo(() => pagesInScope(src, prefs), [src, prefs]);
  const pageIdx = Math.min(previewIdx, Math.max(0, pages.length - 1));
  const previewPage = pages[pageIdx];
  const empty = pages.every((p) => !p.doc.order.length);
  const animated = hasAnimation(doc);
  const activePage = src.pages.find((p) => p.id === activePageId);

  // Live preview of one page, rendered with the real export options (debounced).
  const previewKey = JSON.stringify([prefs.format, prefs.scope, prefs.rangeFrom, prefs.rangeTo, prefs.border, prefs.background, prefs.area, prefs.grid, prefs.appearance, prefs.embedFonts, pageIdx]);
  useEffect(() => {
    if (!previewPage || !previewPage.doc.order.length) {
      setPreview(null);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const opts = svgOptionsFor(previewPage, src, prefs);
      const els = exportSubset(previewPage.doc);
      const [resolve] = await Promise.all([inlineIcons(els), loadExportFonts(els)]);
      if (!live) return;
      const r = renderSvg(previewPage.doc, opts, resolve);
      setPreview({ url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg)}`, w: r.width, h: r.height, length: r.svg.length });
    }, 90);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, previewPage]);

  const shareUrl = useMemo(() => (prefs.format === 'url' && !empty ? encodeShareUrl(pages) : ''), [prefs.format, pages, empty]);

  const gifDuration = useMemo(() => (animated ? autoGifDuration(doc) : 2), [doc, animated]);
  const videoSeconds = useMemo(() => (prefs.format === 'mp4' ? Math.round(videoDuration(pages.map((p) => p.doc)) * 10) / 10 : 0), [prefs.format, pages]);
  const estimate = useMemo(() => {
    if (!preview) return null;
    if (prefs.format === 'mp4') {
      const size = videoFrameSize([{ width: preview.w, height: preview.h }], { resolution: prefs.videoResolution, aspect: prefs.videoAspect });
      return { ...size, bytes: estimateVideoBytes(size.width, size.height, prefs.videoFps, videoSeconds) };
    }
    if (prefs.format === 'gif') {
      const w = Math.round(preview.w * prefs.scale);
      const h = Math.round(preview.h * prefs.scale);
      return { bytes: estimateGifBytes(w, h, Math.round(gifDuration * prefs.fps)), width: w, height: h };
    }
    return estimateSize(src, prefs, preview.length, preview.w, preview.h);
  }, [preview, prefs, src, gifDuration, videoSeconds]);

  const multiFile = pages.length > 1 && fmt.multiPage === 'zip';
  const busy = progress !== null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: shareUrl });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    toast(t('export.linkCopied'), 'success');
  };

  const run = async () => {
    if (prefs.format === 'url') return copyLink();
    if (empty && prefs.format !== 'drawio') return;
    setProgress(0);
    abort.current = new AbortController();
    try {
      const file = await exportBundle(src, prefs, { onProgress: setProgress, signal: abort.current.signal });
      const ext = file.name.split('.').pop()!;
      const res = await saveFile(file.data, {
        defaultName: file.name,
        filters: [{ name: ext === 'zip' ? t('export.zipArchive') : fmt.label, extensions: [ext] }],
        mime: file.mime,
      });
      if (res) {
        toast(t('export.exported', { name: res.name }), 'success');
        close();
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(t('export.failed', { error: String((e as Error).message ?? e) }), 'error');
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  const transparent = prefs.background === 'transparent' && supports.transparent(prefs.format);
  const previewBg = transparent
    ? 'repeating-conic-gradient(var(--panel-2) 0% 25%, var(--panel) 0% 50%) 50% / 16px 16px'
    : 'var(--panel-2)';

  return (
    <>
      <DialogHeader id="export-title" title={t('common.export')} subtitle={t('export.subtitle')} onClose={close} />

      {/* Format cards */}
      <div className={cn('grid gap-2 px-5 pb-4', ORDER.length > 10 ? 'grid-cols-6' : 'grid-cols-5')} role="radiogroup" aria-label={t('export.formatGroup')}>
        {ORDER.map((id) => {
          const desc = t(DESC_KEYS[id]);
          const on = prefs.format === id;
          return (
            <button
              key={id}
              role="radio"
              aria-checked={on}
              onClick={() => setPrefs({ format: id })}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ring-1 transition-[background,box-shadow] duration-150',
                on ? 'bg-accent-soft ring-2 ring-accent' : 'ring-line hover:bg-hover hover:ring-line-strong',
              )}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[17px]"
                style={{ color: LOOK[id].hue, background: `color-mix(in srgb, ${LOOK[id].hue} 13%, transparent)` }}
              >
                {LOOK[id].icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold leading-tight text-fg">{formatLabel(id)}</span>
                <span className="block truncate text-[11px] leading-tight text-muted" title={desc}>{desc}</span>
              </span>
              {on && <Check className="absolute right-2 top-2 size-3.5 text-accent" />}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] gap-5 px-5">
        {/* Preview */}
        <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-xl ring-1 ring-line" style={{ background: previewBg }}>
          <div className={cn('relative flex flex-1 items-center justify-center p-6', pages.length > 1 && 'pb-14')}>
            {preview ? (
              <img
                key={preview.url.length}
                src={preview.url}
                alt={t('export.previewAlt')}
                className={cn('animate-fade max-w-full object-contain', pages.length > 1 ? 'max-h-[290px]' : 'max-h-[330px]', !transparent && 'rounded-[3px] shadow-[0_0_0_1px_var(--line),0_10px_30px_-12px_rgb(0_0_0/0.35)]')}
                draggable={false}
              />
            ) : (
              <span className="text-[13px] text-muted">{empty ? t('export.empty') : t('export.rendering')}</span>
            )}
          </div>

          {/* Badges */}
          {preview && (
            <div className="pointer-events-none absolute left-2.5 top-2.5 flex gap-1.5">
              <Badge>{isRaster(prefs.format) || prefs.format === 'gif' || prefs.format === 'mp4' ? `${estimate?.width ?? 0} × ${estimate?.height ?? 0}px` : `${preview.w} × ${preview.h}`}</Badge>
              {pages.length > 1 && <Badge>{t('common.pageCount', { count: pages.length })}</Badge>}
            </div>
          )}
          {prefs.format === 'gif' && animated && (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
              <Film className="size-3" /> {t('export.gifLoop', { seconds: gifDuration })}
            </span>
          )}
          {prefs.format === 'mp4' && (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
              <Clapperboard className="size-3" /> {t('export.videoLength', { seconds: videoSeconds })}
            </span>
          )}

          {/* Page switcher */}
          {pages.length > 1 && (
            <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-panel/90 p-1 shadow-pop backdrop-blur">
              <PagerButton label={t('export.prevPage')} disabled={pageIdx === 0} onClick={() => setPreviewIdx(pageIdx - 1)}>
                <ChevronLeft />
              </PagerButton>
              <span className="max-w-[220px] truncate px-1.5 text-[12px] tabular-nums text-fg">
                <span className="text-muted">{pageIdx + 1}/{pages.length}</span> · {previewPage?.name}
              </span>
              <PagerButton label={t('export.nextPage')} disabled={pageIdx >= pages.length - 1} onClick={() => setPreviewIdx(pageIdx + 1)}>
                <ChevronRight />
              </PagerButton>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="scroll-thin -mr-2 flex max-h-[440px] min-h-0 flex-col gap-4 overflow-y-auto pb-1 pr-2">
          {scopes.length > 1 && (
            <Field label={t('common.pages')}>
              <Segmented<PageScope>
                value={prefs.scope}
                onChange={(scope) => setPrefs(scope === 'range' && prefs.rangeFrom >= prefs.rangeTo ? { scope, rangeFrom: 1, rangeTo: pageCount } : { scope })}
                options={scopes.map((s) => ({ value: s, label: { current: t('export.scope.current'), all: t('export.scope.all'), selection: t('export.scope.selection'), range: t('export.scope.range') }[s] }))}
              />
              {prefs.scope === 'range' && (
                <div className="mt-2 flex items-center gap-2">
                  <NumberField label={t('export.rangeFrom')} value={prefs.rangeFrom} min={1} max={pageCount} onChange={(v) => setPrefs({ rangeFrom: Math.round(v) })} className="flex-1 [&>span]:w-10" />
                  <NumberField label={t('export.rangeTo')} value={prefs.rangeTo} min={1} max={pageCount} onChange={(v) => setPrefs({ rangeTo: Math.round(v) })} className="flex-1 [&>span]:w-8" />
                </div>
              )}
              {multiFile && <Hint>{t('export.zipHint', { format: fmt.label })}</Hint>}
            </Field>
          )}

          {supports.scale(prefs.format) && (
            <Field label={prefs.format === 'gif' ? t('export.scale') : t('export.scaleResolution')}>
              <div className="flex items-center gap-2">
                <Segmented
                  className="flex-1"
                  value={String(prefs.scale)}
                  onChange={(v) => setPrefs({ scale: Number(v) })}
                  options={(prefs.format === 'gif' ? ['0.5', '1', '1.5', '2'] : ['1', '2', '3', '4']).map((v) => ({ value: v, label: `${v}×` }))}
                />
                {prefs.format !== 'gif' && (
                  <NumberField
                    label={t('export.dpi')}
                    value={Math.round(prefs.scale * 96)}
                    min={24}
                    max={1200}
                    step={12}
                    onChange={(v) => setPrefs({ scale: Math.round((v / 96) * 100) / 100 })}
                    className="w-[92px] [&>span]:w-8"
                  />
                )}
              </div>
            </Field>
          )}

          {supports.quality(prefs.format) && (
            <Field label={t('export.quality')} aside={`${Math.round(prefs.quality * 100)}%`}>
              <Slider value={Math.round(prefs.quality * 100)} min={10} max={100} onChange={(v) => setPrefs({ quality: v / 100 })} />
            </Field>
          )}

          {supports.area(prefs.format) && (
            <Field label={t('export.area')}>
              <div className="flex items-center gap-2">
                <Segmented<'content' | 'page'>
                  className="flex-1"
                  value={prefs.scope === 'selection' ? 'content' : prefs.area}
                  onChange={(area) => setPrefs({ area })}
                  options={[
                    { value: 'content', label: t('export.cropToContent') },
                    { value: 'page', label: t('export.wholePage'), title: activePage?.settings.pageView ? t('export.wholePageTitlePageView') : t('export.wholePageTitle') },
                  ]}
                />
                <NumberField label={t('export.border')} value={prefs.border} min={0} max={400} onChange={(v) => setPrefs({ border: Math.round(v) })} className="w-[96px] [&>span]:w-11" suffix="px" />
              </div>
            </Field>
          )}

          {supports.background(prefs.format) && (
            <Field label={t('export.background')}>
              <Segmented<ExportSettings['background']>
                value={prefs.format === 'jpeg' && prefs.background === 'transparent' ? 'page' : prefs.background}
                onChange={(background) => setPrefs({ background })}
                options={[
                  { value: 'page', label: t('common.page') },
                  { value: 'white', label: t('export.bg.white') },
                  ...(supports.transparent(prefs.format) || prefs.format === 'pdf' ? [{ value: 'transparent' as const, label: t('export.bg.transparent') }] : []),
                ]}
              />
            </Field>
          )}

          {supports.appearance(prefs.format) && (
            <Field label={t('export.appearance')}>
              <Segmented<ExportSettings['appearance']>
                value={prefs.appearance}
                onChange={(appearance) => setPrefs({ appearance })}
                options={[
                  { value: 'light', label: t('export.light') },
                  { value: 'dark', label: t('export.dark') },
                  { value: 'auto', label: t('common.auto'), title: t('export.autoTitle') },
                ]}
              />
              {prefs.appearance === 'auto' && <Hint>{t('export.autoHint')}</Hint>}
            </Field>
          )}

          {prefs.format === 'pdf' && (
            <Field label={t('export.sheetSize')}>
              <Segmented<ExportSettings['pdfFit']>
                value={prefs.pdfFit}
                onChange={(pdfFit) => setPrefs({ pdfFit })}
                options={[
                  { value: 'content', label: t('export.fitContent') },
                  { value: 'paper', label: t('export.paperSize') },
                ]}
              />
              <Hint>{prefs.pdfFit === 'paper' ? t('export.paperHint') : t('export.contentHint')}</Hint>
            </Field>
          )}

          {prefs.format === 'gif' && (
            <>
              <Field label={t('export.frameRate')}>
                <Segmented value={String(prefs.fps)} onChange={(v) => setPrefs({ fps: Number(v) })} options={['10', '15', '20', '30'].map((v) => ({ value: v, label: `${v} fps` }))} />
              </Field>
              <Switch label={t('export.loopForever')} checked={prefs.loop} onChange={(loop) => setPrefs({ loop })} />
              {!animated && (
                <Callout tone="warn">
                  {rich('export.gifNoAnimation', { flow: <b>{t('export.gifFlow')}</b>, dots: <b>{t('export.gifDots')}</b> })}
                </Callout>
              )}
            </>
          )}

          {prefs.format === 'mp4' && (
            <>
              <Field label={t('export.videoResolution')}>
                <Segmented
                  value={String(prefs.videoResolution)}
                  onChange={(v) => setPrefs({ videoResolution: Number(v) })}
                  options={[
                    { value: '720', label: '720p' },
                    { value: '1080', label: '1080p' },
                    { value: '2160', label: '4K' },
                  ]}
                />
              </Field>
              <Field label={t('export.videoAspect')}>
                <Segmented<VideoAspect>
                  value={prefs.videoAspect}
                  onChange={(videoAspect) => setPrefs({ videoAspect })}
                  options={[
                    { value: 'auto', label: t('common.auto'), title: t('export.videoAspectAuto') },
                    { value: '16:9', label: '16:9' },
                    { value: '9:16', label: '9:16', title: t('export.videoAspectVertical') },
                    { value: '1:1', label: '1:1' },
                  ]}
                />
              </Field>
              <Field label={t('export.frameRate')}>
                <Segmented value={String(prefs.videoFps)} onChange={(v) => setPrefs({ videoFps: Number(v) })} options={['24', '30', '60'].map((v) => ({ value: v, label: `${v} fps` }))} />
              </Field>
              {pages.length > 1 && <Hint>{t('export.videoScenes')}</Hint>}
              {!pages.some((p) => hasAnimation(p.doc)) && (
                <Callout tone="warn">
                  {rich('export.gifNoAnimation', { flow: <b>{t('export.gifFlow')}</b>, dots: <b>{t('export.gifDots')}</b> })}
                </Callout>
              )}
            </>
          )}

          {(supports.grid(prefs.format) || supports.embed(prefs.format) || supports.fonts(prefs.format) || prefs.format === 'drawio') && (
            <div className="-my-0.5 space-y-0.5">
              {supports.grid(prefs.format) && <Switch label={t('export.includeGrid')} checked={prefs.grid} onChange={(grid) => setPrefs({ grid })} />}
              {supports.fonts(prefs.format) && <Switch label={t('export.embedFonts')} checked={prefs.embedFonts} onChange={(embedFonts) => setPrefs({ embedFonts })} />}
              {supports.images(prefs.format) && <Switch label={t('export.embedImages')} checked={prefs.embedImages} onChange={(embedImages) => setPrefs({ embedImages })} />}
              {supports.embed(prefs.format) && (
                <Switch
                  label={
                    <span className="inline-flex items-center gap-1.5">
                      {rich('export.editable', { hint: <span className="text-subtle">{t('export.editableHint')}</span> })}
                    </span>
                  }
                  checked={prefs.embedDiagram}
                  onChange={(embedDiagram) => setPrefs({ embedDiagram })}
                />
              )}
              {prefs.format === 'drawio' && <Switch label={t('export.compressedXml')} checked={prefs.compressed} onChange={(compressed) => setPrefs({ compressed })} />}
            </div>
          )}

          {prefs.format === 'svg' && <Hint icon>{t('export.hint.svg')}</Hint>}
          {prefs.format === 'html' && <Hint icon>{t('export.hint.html')}</Hint>}
          {prefs.format === 'vsdx' && <Hint icon>{t('export.hint.vsdx')}</Hint>}
          {prefs.format === 'drawio' && <Hint icon>{t('export.hint.drawio')}</Hint>}

          {prefs.format === 'url' && (
            <Field label={t('export.shareLink')} aside={shareUrl ? t('export.shareChars', { count: shareUrl.length }) : undefined}>
              <textarea
                readOnly
                value={shareUrl || t('export.shareEmpty')}
                onFocus={(e) => e.currentTarget.select()}
                spellCheck={false}
                className="scroll-thin h-[92px] w-full resize-none break-all rounded-lg bg-panel-2 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-fg outline-none ring-1 ring-transparent hover:ring-line focus:ring-2 focus:ring-accent/40"
              />
              {shareUrlTooLong(shareUrl) ? (
                <Callout tone="warn">
                  {t('export.shareTooLong', { max: SHARE_URL_WARN_LENGTH })}
                </Callout>
              ) : (
                <Hint>{t('export.shareHint')}</Hint>
              )}
            </Field>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-3 border-t border-line px-5 py-3.5">
        <div className="min-w-0 flex-1">
          {busy ? (
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${Math.max(4, Math.round((progress ?? 0) * 100))}%` }} />
              </div>
              <span className="text-[11.5px] tabular-nums text-muted">{Math.round((progress ?? 0) * 100)}%</span>
            </div>
          ) : (
            <span className="truncate text-[11.5px] text-subtle">
              {prefs.format === 'url'
                ? shareUrl && t('export.linkSize', { size: formatNumber(Math.round(shareUrl.length / 102.4) / 10) })
                : estimate && estimate.bytes > 0 && (multiFile ? t('export.estimateZip', { size: formatBytes(estimate.bytes), count: pages.length }) : t('export.estimate', { size: formatBytes(estimate.bytes) }))}
            </span>
          )}
        </div>
        {busy ? (
          <Button onClick={() => abort.current?.abort()}>{t('common.cancel')}</Button>
        ) : (
          <Button onClick={close}>{t('common.close')}</Button>
        )}
        <Button
          variant="primary"
          onClick={run}
          disabled={busy || (empty && prefs.format !== 'drawio')}
          icon={busy ? <Loader2 className="size-3.5 animate-spin" /> : prefs.format === 'url' ? copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" /> : undefined}
          className="min-w-[124px]"
        >
          {busy ? t('export.exporting') : prefs.format === 'url' ? (copied ? t('common.copied') : t('export.copyLink')) : multiFile ? t('export.exportFiles', { count: pages.length }) : t('export.exportFormat', { format: fmt.label })}
        </Button>
      </div>
    </>
  );
}

function Field({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11.5px] font-medium text-muted">
        <span>{label}</span>
        {aside && <span className="tabular-nums text-subtle">{aside}</span>}
      </div>
      {children}
    </div>
  );
}

function Hint({ children, icon }: { children: ReactNode; icon?: boolean }) {
  return (
    <p className="flex gap-1.5 pt-0.5 text-[11.5px] leading-relaxed text-subtle">
      {icon && <Info className="mt-[2px] size-3.5 shrink-0" />}
      <span>{children}</span>
    </p>
  );
}

function Callout({ children, tone }: { children: ReactNode; tone: 'warn' }) {
  return (
    <p className={cn('mt-1.5 flex gap-2 rounded-lg px-3 py-2 text-[12px] leading-relaxed', tone === 'warn' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400')}>
      <TriangleAlert className="mt-[2px] size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur">{children}</span>;
}

function PagerButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
