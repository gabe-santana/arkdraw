import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { useUi } from '@/store/ui';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { ACTIONS } from '@/app/actions';
import { createShape } from '@/model/defaults';
import { SearchIndex } from '@/search/engine';
import { searchShapes } from '@/search/indexes';
import { viewportCenter } from '@/canvas/viewport';
import { iconUrl } from '@/shapes/IconImage';
import { createIconElement, iconPath, loadPack, loadProviders, searchIcons, useIconPacks } from '@/icons/iconPacks';
import { ShapePreview } from '@/panels/ShapePreview';
import { Dialog } from '@/ui/Dialog';
import { Shortcut } from '@/ui/Kbd';

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

let actionIndex: SearchIndex<(typeof ACTIONS)[number]> | null = null;
const searchActions = (q: string) => {
  actionIndex ??= new SearchIndex(
    ACTIONS.filter((a) => !a.hidden),
    (a) => [
      { text: a.label, weight: 3 },
      { text: a.keywords ?? '', weight: 1.6 },
      { text: a.group, weight: 0.6 },
    ],
  );
  return actionIndex.search(q, 40);
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

  useEffect(() => {
    if (query.length >= 2) loadProviders().then((ps) => ps.forEach((p) => loadPack(p.id)));
  }, [query]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const q = query.trim();
    const enabled = (a: (typeof ACTIONS)[number]) => !a.enabled || a.enabled();
    if (!q) {
      for (const a of ACTIONS) if (!a.hidden && enabled(a)) out.push({ id: a.id, group: a.group === 'Tools' ? 'Tools' : 'Commands', label: a.label, icon: a.icon, shortcut: a.shortcuts?.[0], run: a.run, score: 0 });
      return out.slice(0, 60);
    }
    for (const r of searchActions(q)) {
      const a = r.item;
      if (!enabled(a)) continue;
      out.push({ id: a.id, group: 'Commands', label: a.label, icon: a.icon, shortcut: a.shortcuts?.[0], run: a.run, score: r.score });
    }
    if (q.length >= 2) {
      for (const h of searchShapes(q, 10)) {
        const item = h.item;
        out.push({
          id: `shape:${h.libraryId}:${item.label}`,
          group: 'Insert shape',
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
          group: 'Insert icon',
          label: icon.name,
          hint: provider.toUpperCase(),
          icon: <img src={iconUrl(iconPath(provider, icon))} alt="" className="size-4 object-contain" />,
          score: 0,
          run: () => useEditor.getState().addElements([createIconElement(provider, icon, viewportCenter())]),
        });
      }
    }
    return out;
  }, [query, packs]);

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
          placeholder="Type a command, or search shapes and cloud icons…"
          className="h-[52px] flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
          spellCheck={false}
        />
        <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-subtle">ESC</kbd>
      </div>
      <div ref={listRef} className="scroll-thin max-h-[380px] overflow-y-auto p-1.5">
        {!items.length && <div className="py-10 text-center text-[13px] text-muted">No results for “{query}”</div>}
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
