import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Cloud, Shapes, Star } from 'lucide-react';
import { createShape } from '@/model/defaults';
import { LIBRARIES } from '@/shapes/libraries';
import { getShapeDef } from '@/shapes/registry';
import type { LibraryItem } from '@/shapes/types';
import { useEditor } from '@/store/editor';
import { useUi, type LeftTab } from '@/store/ui';
import { cn } from '@/lib/cn';
import { iconUrl } from '@/shapes/IconImage';
import {
  createIconElement, ICON_STYLE, iconPath, loadPack, loadProviders, searchIcons, useIconPacks, ICON_SIZE, type IconEntry, type IconPack,
} from '@/icons/iconPacks';
import { SearchInput, Segmented } from '@/ui/controls';
import { ShapePreview } from './ShapePreview';
import { HoverCard } from '@/ui/HoverCard';
import { loadIconDescriptions, shapeDescription, useIconDescriptions } from '@/icons/descriptions';
import { searchShapes } from '@/search/indexes';
import { UserLibrariesSection } from './UserLibrariesSection';
import { connectableSelection, startLibraryDrag } from './libraryDrag';
import { hasRef, refKey, useLibraryHistory, type LibraryRef } from './libraryHistory';
import { ContextMenu } from '@/ui/Menu';
import { t, tx, useT } from '@/i18n';
import { segLabel } from './sections';

/** A built-in library's display name; unknown (plugin / stencil) libraries keep their own name. */
const libraryName = (id: string, name: string) => tx(`panels.library.${id}`, name);

export function LeftPanel() {
  const tab = useUi((s) => s.leftTab);
  const set = useUi((s) => s.set);
  const t = useT();
  return (
    <aside aria-label={t('panels.left.aria')} className="animate-slide-up pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-2xl bg-panel shadow-panel">
      <div data-dock-handle className="p-2 pb-1.5">
        <Segmented<LeftTab>
          value={tab}
          onChange={(leftTab) => set({ leftTab })}
          options={[
            { value: 'shapes', label: <><Shapes className="shrink-0" /> {segLabel(t('common.shapes'))}</>, title: t('common.shapes') },
            { value: 'icons', label: <><Cloud className="shrink-0" /> {segLabel(t('panels.left.cloud'))}</>, title: t('panels.left.cloud') },
          ]}
        />
      </div>
      {tab === 'shapes' && <ShapesTab />}
      {tab === 'icons' && <IconsTab />}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

const COLLAPSE_KEY = 'opendraw:collapsed-libraries';

function useCollapsed(key: string) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  });
  const toggle = (id: string) =>
    setCollapsed((c) => {
      const next = { ...c, [id]: !c[id] };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  return [collapsed, toggle] as const;
}

function ShapesTab() {
  const [query, setQuery] = useState('');
  const [collapsed, toggle] = useCollapsed(COLLAPSE_KEY);
  const t = useT();
  const q = query.trim().toLowerCase();
  const deferredQ = useDeferredValue(q);
  const results = useMemo(() => (deferredQ ? searchShapes(deferredQ, 96) : null), [deferredQ]);
  const libs = useMemo(() => (results ? [] : LIBRARIES), [results]);
  return (
    <>
      <div className="px-2 pb-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('panels.left.searchShapes')} />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        {!q && <HistorySections collapsed={collapsed} toggle={toggle} />}
        <UserLibrariesSection query={query} />
        {results && results.length > 0 && (
          <Section title={t('panels.left.bestMatches')} count={results.length} open onToggle={() => {}}>
            <div className="grid grid-cols-4 gap-1">
              {results.map((h, i) => (
                <ShapeTile key={`${h.libraryId}-${i}-${h.item.label}`} item={h.item} libraryId={h.libraryId} library={h.library} />
              ))}
            </div>
          </Section>
        )}
        {libs.map((lib) => (
          <Section key={lib.id} title={libraryName(lib.id, lib.name)} count={lib.items.length} open={!!q || !collapsed[lib.id]} onToggle={() => toggle(lib.id)}>
            <div className="grid grid-cols-4 gap-1">
              {lib.items.map((item, i) => (
                <ShapeTile key={i} item={item} libraryId={lib.id} library={lib.name} />
              ))}
            </div>
          </Section>
        ))}
        {results && !results.length && <Empty>{t('panels.left.noShapes', { query })}</Empty>}
      </div>
    </>
  );
}

function Section({
  title, count, open, onToggle, action, children,
}: { title: string; count?: number; open: boolean; onToggle: () => void; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-1" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 200px' }}>
      <div className="group flex h-8 w-full items-center rounded-lg hover:bg-hover">
        <button onClick={onToggle} className="flex h-full min-w-0 flex-1 items-center gap-1 px-1.5 text-[12px] font-semibold text-fg">
          <ChevronRight className={cn('size-3.5 text-subtle transition-transform duration-200', open && 'rotate-90')} />
          <span className="flex-1 truncate text-left" title={title}>{title}</span>
          {count !== undefined && <span className="text-[11px] font-normal tabular-nums text-subtle">{count}</span>}
        </button>
        {action}
      </div>
      <div className={cn('grid transition-[grid-template-rows,opacity] duration-200 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="overflow-hidden">
          <div className="px-0.5 pb-2 pt-0.5">{open && children}</div>
        </div>
      </div>
    </section>
  );
}

/** Hover-card hint for library tiles; mentions click-to-connect when it applies. */
const tileHint = () =>
  connectableSelection()
    ? t('panels.left.hintConnect')
    : t('panels.left.hintInsert');

/** Tile wrapper: star toggle on hover (top-right) and a right-click menu for favorites. */
function FavoriteFrame({ libRef, children }: { libRef: LibraryRef; children: React.ReactNode }) {
  const fav = useLibraryHistory((s) => hasRef(s.favorites, libRef));
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const toggleFav = () => useLibraryHistory.getState().toggleFavorite(libRef);
  const t = useT();
  const favLabel = fav ? t('panels.left.removeFavorite') : t('panels.left.addFavorite');
  return (
    <div
      className="group/tile relative"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {children}
      <button
        onClick={toggleFav}
        className={cn(
          'absolute right-0 top-0 hidden size-4 items-center justify-center rounded-full bg-panel shadow-panel transition-colors group-hover/tile:flex',
          fav ? 'text-amber-500' : 'text-subtle hover:text-amber-500',
        )}
        aria-label={favLabel}
        aria-pressed={fav}
      >
        <Star className={cn('size-2.5', fav && 'fill-current')} />
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[{ label: favLabel, icon: <Star className={cn(fav && 'fill-current')} />, onSelect: toggleFav }]}
        />
      )}
    </div>
  );
}

const ShapeTile = memo(function ShapeTile({ item, libraryId, library }: { item: LibraryItem; libraryId: string; library?: string }) {
  const adapt = useEditor((s) => s.settings.adaptColors);
  const libRef = useMemo<LibraryRef>(() => ({ type: 'shape', libraryId, label: item.label }), [libraryId, item.label]);
  return (
    <HoverCard
      content={() => ({
        title: item.label,
        meta: library && libraryName(libraryId, library),
        description: shapeDescription(item.kind) ?? undefined,
        preview: <ShapePreview item={item} size={92} />,
        hint: tileHint(),
      })}
    >
      <FavoriteFrame libRef={libRef}>
        <button
          onPointerDown={(e) =>
            startLibraryDrag(e, {
              size: { w: item.w, h: item.h },
              create: (at) => [createShape(item.kind, { x: at.x - item.w / 2, y: at.y - item.h / 2, w: item.w, h: item.h }, item.style, item.text ?? defaultText(item))],
              replaceWith: { kind: item.kind, style: item.style },
              onUse: () => useLibraryHistory.getState().recordUse(libRef),
            })
          }
          className={cn(
            'flex aspect-square w-full items-center justify-center rounded-lg transition-[background,transform] duration-150 hover:bg-hover active:scale-95',
            adapt && 'diagram-adapt-tile',
          )}
          aria-label={item.label}
        >
          <ShapePreview item={item} size={38} />
        </button>
      </FavoriteFrame>
    </HoverCard>
  );
});

type Resolved =
  | { key: string; type: 'shape'; item: LibraryItem; libraryId: string; library: string }
  | { key: string; type: 'icon'; provider: string; icon: IconEntry };

function resolveRefs(refs: LibraryRef[], packs: Record<string, IconPack>): Resolved[] {
  const out: Resolved[] = [];
  for (const r of refs) {
    if (r.type === 'shape') {
      const lib = LIBRARIES.find((l) => l.id === r.libraryId);
      const item = lib?.items.find((i) => i.label === r.label);
      if (lib && item) out.push({ key: refKey(r), type: 'shape', item, libraryId: lib.id, library: lib.name });
    } else {
      const icon = packs[r.provider]?.icons.find((i) => i.id === r.iconId);
      if (icon) out.push({ key: refKey(r), type: 'icon', provider: r.provider, icon });
    }
  }
  return out;
}

/** Favorites + Recent (), shown at the top of the Shapes tab when non-empty. */
function HistorySections({ collapsed, toggle }: { collapsed: Record<string, boolean>; toggle: (id: string) => void }) {
  const favorites = useLibraryHistory((s) => s.favorites);
  const recent = useLibraryHistory((s) => s.recent);
  const packs = useIconPacks((s) => s.packs);
  // Icon entries need their provider's pack (loaded lazily).
  const providers = useMemo(
    () => [...new Set([...favorites, ...recent].flatMap((r) => (r.type === 'icon' ? [r.provider] : [])))].sort().join(','),
    [favorites, recent],
  );
  useEffect(() => {
    if (!providers) return;
    loadProviders();
    for (const p of providers.split(',')) {
      loadPack(p).catch(() => {});
      loadIconDescriptions(p);
    }
  }, [providers]);
  const favItems = useMemo(() => resolveRefs(favorites, packs), [favorites, packs]);
  const recentItems = useMemo(() => resolveRefs(recent, packs), [recent, packs]);
  const t = useT();
  const grid = (items: Resolved[]) => (
    <div className="grid grid-cols-4 gap-1">
      {items.map((r) =>
        r.type === 'shape' ? (
          <ShapeTile key={r.key} item={r.item} libraryId={r.libraryId} library={r.library} />
        ) : (
          <IconTile key={r.key} provider={r.provider} icon={r.icon} />
        ),
      )}
    </div>
  );
  return (
    <>
      {favItems.length > 0 && (
        <Section title={t('panels.left.favorites')} count={favItems.length} open={!collapsed['__favorites']} onToggle={() => toggle('__favorites')}>
          {grid(favItems)}
        </Section>
      )}
      {recentItems.length > 0 && (
        <Section
          title={t('panels.left.recent')}
          count={recentItems.length}
          open={!collapsed['__recent']}
          onToggle={() => toggle('__recent')}
          action={
            <button
              onClick={() => useLibraryHistory.getState().clearRecent()}
              className="mr-1 rounded px-1.5 py-0.5 text-[11px] text-subtle opacity-0 transition-opacity hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
            >
              {t('common.clear')}
            </button>
          }
        >
          {grid(recentItems)}
        </Section>
      )}
    </>
  );
}

function defaultText(item: LibraryItem): string {
  const def = getShapeDef(item.kind);
  return def.textPlacement === 'below' && item.kind.startsWith('net.') ? item.label : '';
}

// ---------------------------------------------------------------------------
// Cloud & vendor icons
// ---------------------------------------------------------------------------

const PROVIDER_ACCENT: Record<string, string> = {
  aws: '#ff9900',
  azure: '#0078d4',
  gcp: '#4285f4',
  oci: '#c74634',
  alibaba: '#ff6a00',
  ibm: '#0f62fe',
  kubernetes: '#326ce5',
  logos: '#8b5cf6',
  material: '#1a73e8',
  fontawesome: '#538dd7',
  fluent: '#0f6cbd',
  'bootstrap-icons': '#7952b3',
};

function IconsTab() {
  const providers = useIconPacks((s) => s.providers);
  const packs = useIconPacks((s) => s.packs);
  const error = useIconPacks((s) => s.error);
  const [provider, setProvider] = useState<string>(() => localStorage.getItem('opendraw:icon-provider') ?? 'aws');
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [collapsed, toggle] = useCollapsed(`opendraw:collapsed-icons:${provider}`);
  const t = useT();

  useEffect(() => {
    loadProviders();
  }, []);
  useEffect(() => {
    if (providers?.some((p) => p.id === provider)) loadPack(provider);
    try {
      localStorage.setItem('opendraw:icon-provider', provider);
    } catch {
      /* ignore */
    }
  }, [provider, providers]);
  // Searching spans every provider.
  useEffect(() => {
    if (deferred && providers) providers.forEach((p) => loadPack(p.id));
  }, [deferred, providers]);
  // Descriptions for hover cards (small JSON per provider, loaded on demand).
  useEffect(() => {
    if (deferred && providers) providers.forEach((p) => loadIconDescriptions(p.id));
    else loadIconDescriptions(provider);
  }, [deferred, providers, provider]);

  const pack = packs[provider];
  const results = useMemo(() => (deferred ? searchIcons(Object.values(packs), deferred) : null), [deferred, packs]);
  const categories = useMemo(() => {
    if (!pack) return [];
    const map = new Map<string, IconEntry[]>();
    for (const icon of pack.icons) {
      if (!map.has(icon.category)) map.set(icon.category, []);
      map.get(icon.category)!.push(icon);
    }
    return [...map];
  }, [pack]);

  if (providers && !providers.length) {
    return (
      <Empty>
        <Cloud className="mx-auto mb-2 size-6 text-subtle" />
        {error ?? t('panels.icons.none')}
        <div className="mt-2 font-mono text-[11px] text-subtle">npm run icons:fetch</div>
      </Empty>
    );
  }

  return (
    <>
      <div className="px-2 pb-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('panels.icons.searchPlaceholder', { count: Math.max(4, Math.floor((providers ?? []).reduce((n, p) => n + p.count, 0) / 1000)) * 1000 })} />
      </div>
      {!query && (
        <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 [mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-18px),transparent)]">
          {(providers ?? []).map((p) => (
            <button
              key={p.id}
              ref={(el) => {
                if (el && p.id === provider) el.scrollIntoView({ inline: 'nearest', block: 'nearest' });
              }}
              onClick={() => setProvider(p.id)}
              className={cn(
                'flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors',
                p.id === provider ? 'bg-fg text-panel' : 'bg-panel-2 text-muted hover:bg-hover hover:text-fg',
              )}
            >
              <span className="size-1.5 rounded-full" style={{ background: PROVIDER_ACCENT[p.id] ?? 'var(--accent)' }} />
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        {results ? (
          results.length ? (
            <div className="grid grid-cols-4 gap-1 pt-1">
              {results.map(({ provider: pv, icon }) => (
                <IconTile key={icon.id} provider={pv} icon={icon} />
              ))}
            </div>
          ) : (
            <Empty>{t('panels.icons.noMatch', { query })}</Empty>
          )
        ) : !pack ? (
          <IconSkeleton />
        ) : (
          <>
            {categories.map(([cat, icons]) => (
              <Section key={cat} title={cat} count={icons.length} open={!collapsed[cat]} onToggle={() => toggle(cat)}>
                <div className="grid grid-cols-4 gap-1">
                  {icons.map((icon) => (
                    <IconTile key={icon.id} provider={provider} icon={icon} />
                  ))}
                </div>
              </Section>
            ))}
            <PackFooter pack={pack} />
          </>
        )}
      </div>
    </>
  );
}

/** Mirrors the style createIconElement() gives new icons. */
const IconTile = memo(function IconTile({ provider, icon }: { provider: string; icon: IconEntry }) {
  const libRef = useMemo<LibraryRef>(() => ({ type: 'icon', provider, iconId: icon.id }), [provider, icon.id]);
  return (
    <HoverCard
      content={() => {
        const name = useIconPacks.getState().providers?.find((p) => p.id === provider)?.name ?? provider.toUpperCase();
        const desc = useIconDescriptions.getState()[provider]?.[icon.id];
        return {
          title: icon.name,
          meta: `${name} · ${icon.category}`,
          accent: PROVIDER_ACCENT[provider],
          description: desc ?? t('panels.icons.description', { provider: name, category: icon.category.toLowerCase() }),
          preview: <img src={iconUrl(iconPath(provider, icon))} alt="" className="size-[84px] object-contain" />,
          hint: tileHint(),
        };
      }}
    >
      <FavoriteFrame libRef={libRef}>
        <button
          onPointerDown={(e) =>
            startLibraryDrag(e, {
              size: { w: ICON_SIZE, h: ICON_SIZE },
              create: (at) => [createIconElement(provider, icon, at)],
              replaceWith: { kind: 'icon', style: ICON_STYLE, icon: iconPath(provider, icon) },
              onUse: () => useLibraryHistory.getState().recordUse(libRef),
            })
          }
          className="group flex aspect-square w-full items-center justify-center rounded-lg p-2 transition-[background,transform] duration-150 hover:bg-hover active:scale-95"
          aria-label={icon.name}
        >
          <img
            src={iconUrl(iconPath(provider, icon))}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="size-full object-contain transition-transform duration-150 group-hover:scale-110"
          />
        </button>
      </FavoriteFrame>
    </HoverCard>
  );
});

function IconSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-1 pt-2">
      {Array.from({ length: 24 }, (_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-lg bg-panel-2" style={{ animationDelay: `${i * 30}ms` }} />
      ))}
    </div>
  );
}

function PackFooter({ pack }: { pack: IconPack }) {
  const t = useT();
  return (
    <p className="px-1.5 pt-3 text-[10.5px] leading-relaxed text-subtle">
      {t('panels.icons.footer', { name: pack.name, version: pack.version })}
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-[12.5px] leading-relaxed text-muted">{children}</div>;
}
