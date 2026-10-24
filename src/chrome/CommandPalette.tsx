import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { useUi } from '@/store/ui';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { ACTIONS, actionsVersion } from '@/app/actions';
import { createShape } from '@/model/defaults';
import { SearchIndex } from '@/search/engine';
import { searchShapes } from '@/search/indexes';
import { viewportCenter } from '@/canvas/viewport';
import { iconUrl } from '@/shapes/IconImage';
import { createIconElement, iconPath, loadPack, loadProviders, searchIcons, useIconPacks } from '@/icons/iconPacks';
import { ShapePreview } from '@/panels/ShapePreview';
import { Dialog } from '@/ui/Dialog';
import { Shortcut } from '@/ui/Kbd';
import { currentLocale, useT } from '@/i18n';
import { actionLabel, groupLabel } from '@/i18n/catalog';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  shortcut?: string;
  run: () => void;
  score: number;
}

type ActionItem = (typeof ACTIONS)[number];
let englishIndex: SearchIndex<ActionItem> | null = null;
let localIndex: SearchIndex<ActionItem> | null = null;
let indexedVersion = '';
/**
 * Command search. English always works, in every UI language: the English
 * index (labels + keywords, exactly as in the English UI) is searched next to
 * an index of the translated labels, so "save" and "salvar" both find
 * File → Save. Whichever index matches best leads; the other's extra hits
 * follow. English queries therefore rank exactly as in the English UI.
 */
export const searchActions = (q: string, limit = 40) => {
  // Re-index when plugins/extensions register actions at runtime, or the language changes.
  const version = `${actionsVersion}:${currentLocale()}`;
  if (indexedVersion !== version) englishIndex = localIndex = null;
  indexedVersion = version;
  const visible = () => ACTIONS.filter((a) => !a.hidden);
  englishIndex ??= new SearchIndex(visible(), (a) => [
    { text: a.label, weight: 3 },
    { text: a.keywords ?? '', weight: 1.6 },
    { text: a.group, weight: 0.6 },
  ]);
  const english = englishIndex.search(q, limit);
  if (currentLocale() === 'en') return english;
  localIndex ??= new SearchIndex(visible(), (a) => [
    { text: actionLabel(a), weight: 3 },
    { text: groupLabel(a.group), weight: 0.6 },
  ]);
  const local = localIndex.search(q, limit);
  const [first, second] = (local[0]?.score ?? 0) > (english[0]?.score ?? 0) ? [local, english] : [english, local];
  const seen = new Set(first.map((r) => r.item.id));
  return [...first, ...second.filter((r) => !seen.has(r.item.id))].slice(0, limit);
};

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const set = useUi((s) => s.set);
  const close = () => set({ paletteOpen: false });
  return (
    <Dialog open={open} onClose={close} placement="top" className="w-[600px] max-w-[92vw] overflow-hidden">
      {open && <PaletteBody close={close} />}
    </Dialog>
  );
}

function PaletteBody({ close }: { close: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const packs = useIconPacks((s) => s.packs);
  const t = useT();

  useEffect(() => {
    if (query.length >= 2) loadProviders().then((ps) => ps.forEach((p) => loadPack(p.id)));
  }, [query]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const q = query.trim();
    const enabled = (a: (typeof ACTIONS)[number]) => !a.enabled || a.enabled();
    if (!q) {
      for (const a of ACTIONS) if (!a.hidden && enabled(a)) out.push({ id: a.id, group: a.group === 'Tools' ? t('palette.tools') : t('palette.commands'), label: actionLabel(a), icon: a.icon, shortcut: a.shortcuts?.[0], run: a.run, score: 0 });
      return out.slice(0, 60);
    }
    for (const r of searchActions(q)) {
      const a = r.item;
      if (!enabled(a)) continue;
      out.push({ id: a.id, group: t('palette.commands'), label: actionLabel(a), icon: a.icon, shortcut: a.shortcuts?.[0], run: a.run, score: r.score });
    }
    if (q.length >= 2) {
      for (const h of searchShapes(q, 10)) {
        const item = h.item;
        out.push({
          id: `shape:${h.libraryId}:${item.label}`,
          group: t('palette.insertShape'),
          label: item.label,
          hint: h.library,
          icon: <ShapePreview item={item} size={16} />,
          score: 0,
          run: () => {
            const c = viewportCenter();
            useEditor.getState().addElements([createShape(item.kind, { x: c.x - item.w / 2, y: c.y - item.h / 2, w: item.w, h: item.h }, item.style, item.text ?? '')]);
          },
        });
      }
      for (const { provider, icon } of searchIcons(Object.values(packs), q, 12)) {
        out.push({
          id: `icon:${icon.id}`,
          group: t('palette.insertIcon'),
          label: icon.name,
          hint: provider.toUpperCase(),
          icon: <img src={iconUrl(iconPath(provider, icon))} alt="" className="size-4 object-contain" />,
          score: 0,
          run: () => useEditor.getState().addElements([createIconElement(provider, icon, viewportCenter())]),
        });
      }
    }
    return out;
  }, [query, packs, t]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (item: Item | undefined) => {
    if (!item) return;
    close();
    // Let the dialog unmount before running (actions may open other dialogs).
    requestAnimationFrame(() => item.run());
  };

  let lastGroup = '';
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((a) => Math.min(items.length - 1, a + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((a) => Math.max(0, a - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          run(items[active]);
        }
      }}
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-[18px] text-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('palette.placeholder')}
          className="h-[52px] flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
          spellCheck={false}
        />
        <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-subtle">ESC</kbd>
      </div>
      <div ref={listRef} className="scroll-thin max-h-[380px] overflow-y-auto p-1.5">
        {!items.length && <div className="py-10 text-center text-[13px] text-muted">{t('common.noResultsFor', { query })}</div>}
        {items.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <div key={item.id}>
              {header && <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium text-subtle">{header}</div>}
              <button
                data-idx={i}
                onPointerMove={() => setActive(i)}
                onClick={() => run(item)}
                className={cn('flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13.5px]', i === active ? 'bg-hover text-fg' : 'text-fg/90')}
              >
                <span className="flex w-4 items-center justify-center text-muted [&_svg]:size-4">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.hint && <span className="text-[11.5px] text-subtle">{item.hint}</span>}
                {item.shortcut && <Shortcut combo={item.shortcut} />}
                {i === active && !item.shortcut && <CornerDownLeft className="size-3.5 text-subtle" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
