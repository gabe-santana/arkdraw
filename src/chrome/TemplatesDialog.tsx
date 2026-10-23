/**
 * Template gallery: category rail, search, a grid of live thumbnails (real
 * renderer, generated lazily as cards scroll into view) and a large preview
 * of the focused template with "Create" / "Insert into current diagram".
 */
import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import {
  AppWindow,
  BrainCircuit,
  BriefcaseBusiness,
  ChartPie,
  CircuitBoard,
  Cloud,
  CodeXml,
  CornerDownLeft,
  FilePlus,
  Files,
  GraduationCap,
  Import,
  LayoutGrid,
  Map as MapIcon,
  Network,
  Plus,
  SearchX,
  Shapes,
  SquareKanban,
  Table2,
  Users,
  Workflow,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUi } from '@/store/ui';
import { cloneElements, useEditor } from '@/store/editor';
import { confirmDiscard, markUnsaved } from '@/app/fileCommands';
import { viewportCenter } from '@/canvas/viewport';
import { visualBounds } from '@/io/export/svg';
import { isShape } from '@/model/types';
import { CATEGORIES, TEMPLATES, searchTemplates, type Template, type TemplateCategory } from '@/templates';
import { cachedThumb, previewPages, thumbnail, type Thumb } from '@/templates/thumbnails';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { SearchInput } from '@/ui/controls';
import { Kbd } from '@/ui/Kbd';

type CategoryFilter = 'all' | TemplateCategory;

const CATEGORY_ICONS: Record<TemplateCategory, ComponentType<LucideProps>> = {
  Basic: Shapes,
  Flowcharts: Workflow,
  Software: CodeXml,
  Cloud: Cloud,
  Network: Network,
  Business: BriefcaseBusiness,
  'Tables & ERD': Table2,
  'Mind maps': BrainCircuit,
  'Org charts': Users,
  Wireframes: AppWindow,
  Engineering: CircuitBoard,
  Maps: MapIcon,
  Agile: SquareKanban,
  'Charts & Infographics': ChartPie,
  'Education & Other': GraduationCap,
};

const LAST_KEY = 'opendraw:templates-category';

export function TemplatesDialog() {
  const open = useUi((s) => s.templatesOpen);
  const close = () => useUi.getState().set({ templatesOpen: false });
  return (
    <Dialog open={open} onClose={close} labelledBy="templates-title" className="flex h-[min(820px,92vh)] w-[1260px] max-w-[96vw] flex-col overflow-hidden">
      {open && <Gallery close={close} />}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function createFrom(t: Template, close: () => void) {
  close();
  if (!(await confirmDiscard())) {
    useUi.getState().set({ templatesOpen: true });
    return;
  }
  const pages = t.build();
  useEditor.getState().loadPages(pages, { path: null, name: t.id === 'blank' ? 'Untitled' : t.name });
  markUnsaved();
  requestAnimationFrame(() => useEditor.getState().zoomToFit());
  if (t.id !== 'blank') useUi.getState().toast(`Created “${t.name}”`, 'success');
}

function insertFrom(t: Template, pageIndex: number, close: () => void) {
  const pages = t.build();
  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const els = page.doc.order.map((id) => page.doc.elements[id]);
  if (!els.length) return;
  const b = visualBounds(page.doc, els) ?? { x: 0, y: 0, w: 0, h: 0 };
  const c = viewportCenter();
  const clones = cloneElements(els, { x: Math.round(c.x - (b.x + b.w / 2)), y: Math.round(c.y - (b.y + b.h / 2)) });
  close();
  const ed = useEditor.getState();
  ed.addElements(clones);
  ed.zoomToFit(clones.filter(isShape).map((e) => e.id));
  useUi.getState().toast(`Inserted “${t.name}”`, 'success');
}

// ---------------------------------------------------------------------------
// Thumbnails
// ---------------------------------------------------------------------------

function useThumb(t: Template, pageIndex: number, large: boolean, enabled: boolean): Thumb | null | undefined {
  const [state, setState] = useState<{ key: string; thumb: Thumb | null | undefined }>(() => ({
    key: `${t.id}:${pageIndex}`,
    thumb: cachedThumb(t, pageIndex, large),
  }));
  const key = `${t.id}:${pageIndex}`;
  useEffect(() => {
    if (!enabled || t.id === 'blank') return;
    let live = true;
    const cached = cachedThumb(t, pageIndex, large);
    if (cached !== undefined) setState({ key, thumb: cached });
    else thumbnail(t, pageIndex, large).then((thumb) => live && setState({ key, thumb }));
    return () => {
      live = false;
    };
  }, [t, pageIndex, large, enabled, key]);
  return state.key === key ? state.thumb : cachedThumb(t, pageIndex, large);
}

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

function ThumbView({ t, pageIndex = 0, large = false, enabled }: { t: Template; pageIndex?: number; large?: boolean; enabled: boolean }) {
  const thumb = useThumb(t, pageIndex, large, enabled);
  if (t.id === 'blank') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className={cn('flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400', large ? 'size-28' : 'size-16')}>
          <Plus className={large ? 'size-10' : 'size-7'} strokeWidth={1.5} />
        </div>
      </div>
    );
  }
  if (thumb === undefined) return <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-50" />;
  if (thumb === null) return null;
  return <img src={thumb.src} alt="" draggable={false} className={cn('animate-fade h-full w-full object-contain', large ? 'p-5' : 'p-2.5')} />;
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

function loadCategory(): CategoryFilter {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v && (v === 'all' || (CATEGORIES as readonly string[]).includes(v)) ? (v as CategoryFilter) : 'all';
  } catch {
    return 'all';
  }
}

function Gallery({ close }: { close: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>(loadCategory);
  const [focusId, setFocusId] = useState<string>(TEMPLATES[0].id);
  const [pageIndex, setPageIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // The dialog focuses its first control (the close button); search should win.
  const railRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const t = setTimeout(() => railRef.current?.querySelector('input')?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_KEY, category);
    } catch {
      /* storage unavailable */
    }
  }, [category]);

  const matches = useMemo(() => searchTemplates(TEMPLATES, query), [query]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of matches) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    return m;
  }, [matches]);
  const visible = useMemo(() => (category === 'all' ? matches : matches.filter((t) => t.category === category)), [matches, category]);
  const focused = visible.find((t) => t.id === focusId) ?? visible[0];
  const sections = useMemo(() => {
    if (category !== 'all' || query) return [{ title: query ? `Results for “${query}”` : category, items: visible }];
    return CATEGORIES.map((c) => ({ title: c, items: visible.filter((t) => t.category === c) })).filter((s) => s.items.length);
  }, [category, query, visible]);

  const focus = (t: Template | undefined) => {
    if (!t) return;
    setFocusId(t.id);
    setPageIndex(0);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-template="${t.id}"]`)?.scrollIntoView({ block: 'nearest' }));
  };

  /** Geometric arrow navigation (works across section breaks). */
  const move = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (!focused) return;
    const idx = visible.indexOf(focused);
    if (dir === 'left' || dir === 'right') return focus(visible[Math.max(0, Math.min(visible.length - 1, idx + (dir === 'right' ? 1 : -1)))]);
    const cards = [...(gridRef.current?.querySelectorAll<HTMLElement>('[data-template]') ?? [])];
    const cur = cards.find((c) => c.dataset.template === focused.id);
    if (!cur) return;
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const rows = cards
      .map((c) => ({ c, r: c.getBoundingClientRect() }))
      .filter(({ r: o }) => (dir === 'down' ? o.top > r.top + 4 : o.top < r.top - 4));
    if (!rows.length) return;
    const rowTop = dir === 'down' ? Math.min(...rows.map((o) => o.r.top)) : Math.max(...rows.map((o) => o.r.top));
    const row = rows.filter((o) => Math.abs(o.r.top - rowTop) < 4);
    row.sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx));
    focus(visible.find((t) => t.id === row[0].c.dataset.template));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const inInput = (e.target as HTMLElement).tagName === 'INPUT';
    const keys: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const dir = keys[e.key];
    if (dir && !(inInput && (dir === 'left' || dir === 'right'))) {
      e.preventDefault();
      e.stopPropagation();
      move(dir);
    } else if (e.key === 'Enter' && focused && !(e.target as HTMLElement).closest('button')) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        if (focused.id !== 'blank') insertFrom(focused, pageIndex, close);
      } else void createFrom(focused, close);
    } else if ((e.key === 'Home' || e.key === 'End') && !inInput) {
      e.preventDefault();
      focus(e.key === 'Home' ? visible[0] : visible[visible.length - 1]);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDownCapture={onKeyDown}>
      <DialogHeader
        id="templates-title"
        title="Start from a template"
        subtitle={`${TEMPLATES.length} templates across ${CATEGORIES.length} categories — every one fully editable.`}
        onClose={close}
      />
      <div className="flex min-h-0 flex-1 border-t border-line">
        {/* Category rail */}
        <nav ref={railRef} className="flex w-[220px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-line bg-panel-2/60 p-2.5" aria-label="Template categories">
          <SearchInput value={query} onChange={setQuery} placeholder="Search templates" autoFocus className="mb-2" />
          <RailItem active={category === 'all'} icon={LayoutGrid} label="All templates" count={matches.length} onClick={() => setCategory('all')} />
          <div className="mx-2 my-1.5 h-px bg-line" />
          {CATEGORIES.map((c) => (
            <RailItem key={c} active={category === c} icon={CATEGORY_ICONS[c]} label={c} count={counts.get(c) ?? 0} onClick={() => setCategory(c)} />
          ))}
        </nav>

        {/* Grid */}
        <div ref={gridRef} role="listbox" aria-label="Templates" className="min-w-0 flex-1 overflow-y-auto px-5 pb-6">
          {visible.length === 0 ? (
            <EmptyState query={query} onClear={() => setQuery('')} />
          ) : (
            sections.map((s) => (
              <section key={s.title}>
                <h3 className="sticky top-0 z-[2] -mx-5 flex items-baseline gap-2 bg-panel/90 px-5 pb-2 pt-4 text-[12px] font-semibold tracking-tight text-fg backdrop-blur">
                  {s.title}
                  <span className="font-normal text-subtle">{s.items.length}</span>
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(178px,1fr))] gap-x-3.5 gap-y-4">
                  {s.items.map((t) => (
                    <Card
                      key={t.id}
                      t={t}
                      active={t.id === focused?.id}
                      onFocus={() => focus(t)}
                      onOpen={() => void createFrom(t, close)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Preview */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-line bg-panel-2/40">
          {focused ? (
            <Preview t={focused} pageIndex={pageIndex} setPageIndex={setPageIndex} close={close} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[12.5px] text-subtle">Nothing selected</div>
          )}
        </aside>
      </div>
      <footer className="flex items-center gap-4 border-t border-line px-5 py-2 text-[11.5px] text-muted">
        <Hint keys={['←', '→', '↑', '↓']} label="Browse" />
        <Hint keys={[<CornerDownLeft key="e" className="size-3" />]} label="Create" />
        <Hint keys={['⇧', <CornerDownLeft key="e" className="size-3" />]} label="Insert into current diagram" />
        <span className="ml-auto">Double-click a card to create</span>
      </footer>
    </div>
  );
}

function RailItem({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: ComponentType<LucideProps>; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active || undefined}
      className={cn(
        'group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-left text-[12.5px] transition-colors',
        active ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-hover',
        count === 0 && !active && 'opacity-45',
      )}
    >
      <Icon className={cn('size-[15px] shrink-0', active ? 'text-accent' : 'text-muted group-hover:text-fg')} strokeWidth={1.75} />
      <span className="flex-1 truncate">{label}</span>
      <span className={cn('tabular-nums text-[11px]', active ? 'text-accent' : 'text-subtle')}>{count}</span>
    </button>
  );
}

function Card({ t, active, onFocus, onOpen }: { t: Template; active: boolean; onFocus: () => void; onOpen: () => void }) {
  const [ref, inView] = useInView<HTMLButtonElement>();
  const thumb = useThumb(t, 0, false, inView);
  const pages = thumb ? previewPages(t).length : 1;
  return (
    <button
      ref={ref}
      data-template={t.id}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onClick={onFocus}
      onDoubleClick={onOpen}
      className="group flex min-w-0 flex-col rounded-xl text-left outline-none"
    >
      <div
        className={cn(
          'relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white ring-1 transition-[transform,box-shadow] duration-200 ease-out',
          'shadow-[0_1px_2px_rgb(15_23_42/0.06)] group-hover:-translate-y-1 group-hover:shadow-[0_14px_28px_-12px_rgb(15_23_42/0.35)]',
          active ? 'ring-2 ring-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'ring-line group-hover:ring-line-strong',
        )}
      >
        <ThumbView t={t} enabled={inView} />
        {pages > 1 && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            <Files className="size-3" />
            {pages}
          </span>
        )}
      </div>
      <div className="min-w-0 px-0.5 pt-2">
        <div className={cn('truncate text-[12.5px] font-medium', active ? 'text-accent' : 'text-fg')}>{t.name}</div>
        <div className="truncate text-[11px] text-muted">{t.category}</div>
      </div>
    </button>
  );
}

function Preview({ t, pageIndex, setPageIndex, close }: { t: Template; pageIndex: number; setPageIndex: (i: number) => void; close: () => void }) {
  const pages = t.id === 'blank' ? null : previewPages(t);
  const stats = useMemo(() => {
    if (!pages) return null;
    const page = pages[Math.min(pageIndex, pages.length - 1)];
    const els = Object.values(page.doc.elements);
    return { shapes: els.filter(isShape).length, links: els.length - els.filter(isShape).length };
  }, [pages, pageIndex]);
  const Icon = CATEGORY_ICONS[t.category];
  return (
    <div key={t.id} className="animate-fade flex min-h-0 flex-1 flex-col p-4">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgb(15_23_42/0.08)] ring-1 ring-line">
        <ThumbView t={t} pageIndex={pageIndex} large enabled />
      </div>
      {pages && pages.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-1" role="tablist" aria-label="Pages">
          {pages.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === pageIndex}
              onClick={() => setPageIndex(i)}
              className={cn(
                'h-6 rounded-md px-2 text-[11.5px] font-medium transition-colors',
                i === pageIndex ? 'bg-panel text-fg shadow-[0_0_0_1px_var(--line-strong)]' : 'text-muted hover:bg-hover hover:text-fg',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          <Icon className="size-3.5" strokeWidth={2} />
          {t.category}
        </div>
        <h3 className="mt-1 text-[17px] font-semibold tracking-tight text-fg">{t.name}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{t.description}</p>
        {stats && pages && (
          <div className="mt-3 flex gap-3 text-[11.5px] text-muted">
            <Meta>{pages.length === 1 ? '1 page' : `${pages.length} pages`}</Meta>
            <Meta>{stats.shapes} shapes</Meta>
            {stats.links > 0 && <Meta>{stats.links} connectors</Meta>}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1">
          {t.keywords.slice(0, 6).map((k) => (
            <span key={k} className="rounded-md bg-panel px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-line">
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="primary" className="h-9 w-full" icon={<FilePlus className="size-4" />} onClick={() => void createFrom(t, close)}>
          {t.id === 'blank' ? 'Create blank diagram' : 'Create new diagram'}
        </Button>
        <Button
          variant="secondary"
          className="h-9 w-full"
          icon={<Import className="size-4" />}
          disabled={t.id === 'blank'}
          onClick={() => insertFrom(t, pageIndex, close)}
        >
          Insert into current diagram
        </Button>
      </div>
    </div>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 before:size-1 before:rounded-full before:bg-line-strong first:before:hidden">{children}</span>;
}

function Hint({ keys, label }: { keys: ReactNode[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-0.5">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </span>
      {label}
    </span>
  );
}

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-panel-2 text-subtle ring-1 ring-line">
        <SearchX className="size-5" />
      </div>
      <div>
        <div className="text-[13.5px] font-medium text-fg">No templates match “{query}”</div>
        <div className="mt-0.5 text-[12px] text-muted">Try a broader term like “cloud”, “uml” or “wireframe”.</div>
      </div>
      <Button size="sm" onClick={onClear}>
        Clear search
      </Button>
    </div>
  );
}
