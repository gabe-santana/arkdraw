/**
 * Read-only diagram viewer / lightbox (`?viewer=1` or `?lightbox=1`).
 *
 * Renders with the editor's own element bodies for full fidelity, adds page
 * tabs, zoom/pan/pinch, layer toggles, hover cards for tooltips and links,
 * and an "Edit" button that hands the same diagram to the editor.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileUp,
  Layers,
  Link2,
  Loader2,
  Maximize,
  Minus,
  Moon,
  PenLine,
  Plus,
  SquareArrowOutUpRight,
  Sun,
} from 'lucide-react';
import type { DiagramElement, Page } from '@/model/types';
import { SvgDefs } from '@/canvas/ElementBodies';
import { visualBounds } from '@/io/export/svg';
import { clearTextCache } from '@/lib/text';
import { cn } from '@/lib/cn';
import { isTauri } from '@/lib/platform';
import { resolvePageParam, urlWithoutSource, type LaunchParams } from '@/web/launch';
import { pagesFromContent, resolveSource } from '@/web/loadDiagram';
import { PwaUpdatePrompt } from '@/web/PwaUpdatePrompt';
import { ViewerScene } from './ViewerScene';
import { useCameraState, useViewerGestures } from './useViewerCamera';
import { classifyLink, editorUrl, fitCamera, toggleableLayers, visibleOrder, withLayerOverrides } from './model';

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pages: Page[]; name: string };

const inFrame = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

function plainEditorUrl() {
  const url = new URL(urlWithoutSource(location.href));
  for (const p of ['viewer', 'lightbox', 'toolbar']) url.searchParams.delete(p);
  return url.toString();
}

export default function Viewer({ launch }: { launch: LaunchParams }) {
  const [state, setState] = useState<LoadState>(() =>
    launch.source ? { status: 'loading' } : launch.error ? { status: 'error', message: launch.error } : { status: 'empty' },
  );
  const [dark, setDark] = useState(() => launch.theme === 'dark' || (launch.theme !== 'light' && document.documentElement.classList.contains('dark')));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (!launch.source) return;
    const ac = new AbortController();
    resolveSource(launch.source, launch.title, ac.signal)
      .then(({ pages, name }) => setState({ status: 'ready', pages, name }))
      .catch((e) => !ac.signal.aborted && setState({ status: 'error', message: (e as Error)?.message ?? String(e) }));
    return () => ac.abort();
  }, [launch]);

  const openFile = useCallback(async (file: File) => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pages = await pagesFromContent(bytes, file.name);
      setState({ status: 'ready', pages, name: file.name.replace(/(\.drawio)?\.[^.]+$/, '') });
    } catch (e) {
      setState({ status: 'error', message: (e as Error)?.message ?? String(e) });
    }
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-canvas text-fg"
      onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
      onDrop={(e) => {
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        e.preventDefault();
        void openFile(f);
      }}
    >
      {state.status === 'ready' ? (
        <DiagramViewer key={state.pages[0]?.id} pages={state.pages} name={state.name} launch={launch} dark={dark} onToggleTheme={() => setDark((d) => !d)} />
      ) : (
        <Placeholder state={state} onOpen={openFile} />
      )}
      <PwaUpdatePrompt />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / empty / error
// ---------------------------------------------------------------------------

function Placeholder({ state, onOpen }: { state: Exclude<LoadState, { status: 'ready' }>; onOpen: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  if (state.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center gap-2.5 text-muted" role="status">
        <Loader2 className="size-4 animate-spin" />
        Loading diagram…
      </div>
    );
  }
  const error = state.status === 'error';
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl bg-panel px-7 py-8 text-center shadow-panel">
        <div className={cn('mb-4 flex size-11 items-center justify-center rounded-xl', error ? 'bg-danger/10 text-danger' : 'bg-accent-soft text-accent')}>
          {error ? <AlertTriangle className="size-5" /> : <FileUp className="size-5" />}
        </div>
        <h1 className="text-[15px] font-semibold">{error ? 'Couldn’t open this diagram' : 'View a diagram'}</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {error ? state.message : 'Drop an OpenDraw or draw.io file here, or open one from your device. Nothing is uploaded.'}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="h-8 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Open a file…
          </button>
          <a href={plainEditorUrl()} className="flex h-8 items-center rounded-lg px-3.5 text-[13px] font-medium text-fg shadow-[0_0_0_1px_var(--line-strong)] transition-colors hover:bg-hover">
            Open the editor
          </a>
        </div>
        <input
          ref={input}
          type="file"
          hidden
          accept=".opendraw,.drawio,.xml,.json,.svg,.png"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onOpen(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The viewer proper
// ---------------------------------------------------------------------------

interface Hover {
  el: DiagramElement;
  x: number;
  y: number;
}

function DiagramViewer({ pages, name, launch, dark, onToggleTheme }: { pages: Page[]; name: string; launch: LaunchParams; dark: boolean; onToggleTheme: () => void }) {
  const [pageIndex, setPageIndex] = useState(() => {
    const start = resolvePageParam(pages, launch.page);
    return start ? pages.indexOf(start) : 0;
  });
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const [fontsVersion, setFontsVersion] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<Hover | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const userMoved = useRef(false);
  const cam = useCameraState(size);
  const chrome = launch.toolbar;

  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const doc = useMemo(() => withLayerOverrides(page.doc, overrides[page.id] ?? {}), [page, overrides]);
  const order = useMemo(() => visibleOrder(doc), [doc]);
  const bounds = useMemo(
    () => visualBounds(doc, order.map((id) => doc.elements[id])),
    [doc, order, fontsVersion], // fontsVersion: re-measure once fonts load
  );
  const layers = useMemo(() => toggleableLayers(doc), [doc]);
  const vars = useMemo(
    () => ({ pageName: page.name, pageNumber: pageIndex + 1, pageCount: pages.length, fileName: name }),
    [page.name, pageIndex, pages.length, name],
  );

  useEffect(() => {
    document.title = `${name} · OpenDraw`;
  }, [name]);

  // Text is measured on a canvas; re-measure once the real fonts are in.
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      clearTextCache();
      setFontsVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const insets = useMemo(() => (chrome ? { top: 64, right: 28, bottom: 72, left: 28 } : { top: 16, right: 16, bottom: 16, left: 16 }), [chrome]);
  const fitTarget = useCallback(
    () => fitCamera(bounds ?? { x: 0, y: 0, w: 100, h: 100 }, size.w, size.h, size.w < 520 ? { top: insets.top, right: 12, bottom: insets.bottom, left: 12 } : insets),
    [bounds, size, insets],
  );
  const fit = useCallback(
    (animate = true) => {
      userMoved.current = false;
      if (animate) cam.animateTo(fitTarget());
      else cam.set(fitTarget());
    },
    [cam, fitTarget],
  );

  // Fit on first layout, page switches, and resizes (until the user takes over).
  const fittedPage = useRef<string | null>(null);
  useEffect(() => {
    if (!size.w || !size.h) return;
    if (fittedPage.current !== page.id) {
      const first = fittedPage.current === null;
      fittedPage.current = page.id;
      fit(!first);
    } else if (!userMoved.current) {
      cam.set(fitTarget());
    }
  }, [size.w, size.h, page.id, bounds]);

  const goTo = useCallback(
    (i: number) => {
      setHover(null);
      setPageIndex(Math.max(0, Math.min(pages.length - 1, i)));
    },
    [pages.length],
  );

  const follow = useCallback(
    (link: string) => {
      const t = classifyLink(link, pages);
      if (t.kind === 'page') goTo(pages.findIndex((p) => p.id === t.pageId));
      else if (t.kind === 'external') window.open(t.url, '_blank', 'noopener,noreferrer');
    },
    [pages, goTo],
  );

  const elementAt = useCallback(
    (target: Element | null): DiagramElement | undefined => {
      const id = target?.closest?.('[data-el]')?.getAttribute('data-el');
      return id ? doc.elements[id] : undefined;
    },
    [doc],
  );

  useViewerGestures(containerRef, cam, {
    onTap: (target) => {
      setLayersOpen(false);
      const el = elementAt(target);
      if (el?.link) follow(el.link);
    },
    onHover: (target, x, y) => {
      const el = elementAt(target);
      const node = containerRef.current;
      if (node) node.style.cursor = el?.link ? 'pointer' : '';
      setHover(el && (el.tooltip || el.link) ? { el, x, y } : null);
    },
    onInteract: () => {
      userMoved.current = true;
      setLayersOpen(false);
    },
  });

  const editHref = useMemo(() => editorUrl(location.href, launch, pages, pageIndex), [launch, pages, pageIndex]);
  const openEditor = () => {
    if (inFrame) window.open(editHref, '_blank', 'noopener');
    else location.assign(editHref);
  };

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || (e.target as Element)?.closest?.('input, textarea, select')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === '+' || e.key === '=') cam.zoomBy(1.25, undefined, true);
      else if (e.key === '-' || e.key === '_') cam.zoomBy(0.8, undefined, true);
      else if (e.key === '0' && !mod) cam.zoomBy(1 / cam.ref.current.z, undefined, true);
      else if ((e.key === '1' && e.shiftKey) || e.key === '!' || e.key.toLowerCase() === 'f') fit();
      else if ((e.key === 'ArrowRight' || e.key === 'PageDown') && pages.length > 1) goTo(pageIndex + 1);
      else if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && pages.length > 1) goTo(pageIndex - 1);
      else if (e.key === 'Escape') setLayersOpen(false);
      else return;
      if (mod && (e.key === '+' || e.key === '=' || e.key === '-')) e.preventDefault();
      userMoved.current = true;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cam, fit, goTo, pageIndex, pages.length]);

  const labelBg = page.settings.background ?? '#f7f7f9';
  const { camera } = cam;

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 touch-none select-none data-[panning]:cursor-grabbing" role="img" aria-label={`${name} — ${page.name}`}>
        <svg className={cn('absolute inset-0 h-full w-full', dark && 'diagram-adapt')} style={{ overflow: 'visible' }}>
          <SvgDefs />
          <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.z})`}>
            <ViewerScene key={`${page.id}:${fontsVersion}`} doc={doc} order={order} settings={page.settings} bounds={bounds} vars={vars} labelBg={labelBg} />
          </g>
        </svg>
      </div>

      {hover && <HoverCard hover={hover} pages={pages} />}

      {chrome && (
        <>
          {/* Title */}
          <div data-viewer-ui className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center sm:max-w-[45%]">
            <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-xl bg-panel/90 py-1.5 pl-1.5 pr-3 shadow-panel backdrop-blur-md">
              <Logo />
              <div className="min-w-0 truncate text-[13px] font-medium">{name}</div>
              {pages.length > 1 && <div className="hidden shrink-0 text-[12px] text-muted sm:block">{pages.length} pages</div>}
            </div>
          </div>

          {/* Actions */}
          <div data-viewer-ui className="absolute right-3 top-3 flex items-start gap-2">
            <Pill>
              {layers.length > 0 && (
                <div className="relative">
                  <IconButton label="Layers" active={layersOpen} onClick={() => setLayersOpen((o) => !o)}>
                    <Layers />
                  </IconButton>
                  {layersOpen && (
                    <div className="absolute right-0 top-10 w-56 rounded-xl bg-panel p-1 shadow-pop" role="menu">
                      <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">Layers</div>
                      {[...layers].reverse().map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={l.visible}
                          onClick={() => setOverrides((o) => ({ ...o, [page.id]: { ...(o[page.id] ?? {}), [l.id]: !l.visible } }))}
                          className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors hover:bg-hover"
                        >
                          {l.visible ? <Eye className="size-3.5 text-accent" /> : <EyeOff className="size-3.5 text-subtle" />}
                          <span className={cn('truncate', !l.visible && 'text-muted')}>{l.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <IconButton label={dark ? 'Light theme' : 'Dark theme'} onClick={onToggleTheme}>
                {dark ? <Sun /> : <Moon />}
              </IconButton>
              {inFrame && (
                <IconButton label="Open in a new tab" onClick={() => window.open(location.href, '_blank', 'noopener')}>
                  <SquareArrowOutUpRight />
                </IconButton>
              )}
            </Pill>
            {!isTauri() && (
              <button
                type="button"
                onClick={openEditor}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13px] font-medium text-accent-fg shadow-panel transition-colors hover:bg-accent-hover"
              >
                <PenLine className="size-3.5" />
                <span className="hidden sm:inline">Edit in OpenDraw</span>
                <span className="sm:hidden">Edit</span>
              </button>
            )}
          </div>

          {/* Pages */}
          {pages.length > 1 && (
            <div data-viewer-ui className="absolute bottom-3 left-1/2 flex max-w-[calc(100%-22rem)] -translate-x-1/2 justify-center max-sm:bottom-16 max-sm:max-w-[calc(100%-1.5rem)]">
              <Pill className="max-w-full">
                <IconButton label="Previous page" disabled={pageIndex === 0} onClick={() => goTo(pageIndex - 1)}>
                  <ChevronLeft />
                </IconButton>
                <div className="no-scrollbar flex min-w-0 items-center gap-0.5 overflow-x-auto" role="tablist">
                  {pages.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={i === pageIndex}
                      onClick={() => goTo(i)}
                      className={cn(
                        'h-8 max-w-[180px] shrink-0 truncate rounded-lg px-3 text-[12.5px] font-medium transition-colors',
                        i === pageIndex ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg',
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <IconButton label="Next page" disabled={pageIndex === pages.length - 1} onClick={() => goTo(pageIndex + 1)}>
                  <ChevronRight />
                </IconButton>
              </Pill>
            </div>
          )}

          {/* Zoom */}
          <div data-viewer-ui className="absolute bottom-3 right-3">
            <Pill>
              <IconButton label="Zoom out" onClick={() => ((userMoved.current = true), cam.zoomBy(0.8, undefined, true))}>
                <Minus />
              </IconButton>
              <button
                type="button"
                title="Reset to 100%"
                onClick={() => ((userMoved.current = true), cam.zoomBy(1 / cam.ref.current.z, undefined, true))}
                className="h-8 w-12 rounded-lg text-center text-[12px] font-medium tabular-nums text-muted transition-colors hover:bg-hover hover:text-fg"
              >
                {Math.round(camera.z * 100)}%
              </button>
              <IconButton label="Zoom in" onClick={() => ((userMoved.current = true), cam.zoomBy(1.25, undefined, true))}>
                <Plus />
              </IconButton>
              <div className="mx-0.5 h-5 w-px bg-line" />
              <IconButton label="Fit to screen" onClick={() => fit()}>
                <Maximize />
              </IconButton>
            </Pill>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Bits
// ---------------------------------------------------------------------------

function HoverCard({ hover, pages }: { hover: Hover; pages: Page[] }) {
  const { el } = hover;
  const target = el.link ? classifyLink(el.link, pages) : null;
  const linkLabel =
    target?.kind === 'page'
      ? `Go to “${pages.find((p) => p.id === target.pageId)?.name ?? 'page'}”`
      : target?.kind === 'external'
        ? target.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
        : el.link
          ? 'Unsupported link'
          : null;
  const W = 300;
  const left = Math.min(hover.x + 14, window.innerWidth - W - 8);
  const top = hover.y + 18 + 80 > window.innerHeight ? hover.y - 12 : hover.y + 18;
  return (
    <div
      data-viewer-ui
      className="pointer-events-none fixed z-50 max-w-[300px] rounded-lg bg-panel px-2.5 py-1.5 text-[12.5px] leading-snug shadow-pop"
      style={{ left, top, transform: top < hover.y ? 'translateY(-100%)' : undefined }}
    >
      {el.tooltip && <div className="whitespace-pre-wrap break-words text-fg">{el.tooltip}</div>}
      {linkLabel && (
        <div className={cn('flex items-center gap-1.5 truncate text-accent', el.tooltip && 'mt-1')}>
          <Link2 className="size-3 shrink-0" />
          <span className="truncate">{linkLabel}</span>
        </div>
      )}
    </div>
  );
}

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-0.5 rounded-xl bg-panel/90 p-1 shadow-panel backdrop-blur-md', className)}>{children}</div>;
}

function IconButton({ label, onClick, children, active, disabled }: { label: string; onClick: () => void; children: ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4',
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function Logo() {
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c7fff] via-[#5b4bf5] to-[#3a2bb8] shadow-[0_1px_3px_rgb(58_43_184/0.4),inset_0_1px_0_rgb(255_255_255/0.25)]">
      <svg viewBox="0 0 1024 1024" className="size-4" aria-hidden>
        <path d="M330 372 H512 V652 H694" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="196" y="272" width="268" height="200" rx="48" fill="#fff" />
        <circle cx="694" cy="652" r="118" fill="#fff" />
        <path d="M694 186 L790 282 L694 378 L598 282 Z" fill="#C9C5FF" stroke="#fff" strokeWidth="24" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
