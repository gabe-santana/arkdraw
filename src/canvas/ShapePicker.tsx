/**
 * Quick shape picker: opens on double-click on blank canvas or when a
 * connector is dropped on empty space. Picking inserts the shape there — and
 * completes the dangling connector, if any.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ConnectorElement } from '@/model/types';
import { createShape } from '@/model/defaults';
import { LIBRARIES } from '@/shapes/libraries';
import type { LibraryItem } from '@/shapes/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { useDismiss } from '@/ui/Menu';
import { SearchInput } from '@/ui/controls';
import { searchShapes } from '@/search/indexes';
import { ShapePreview } from '@/panels/ShapePreview';
import { cn } from '@/lib/cn';
import { replaceShapes } from '@/app/commands';
import { useT } from '@/i18n';

const FAVORITES: Array<[string, string]> = [
  ['general', 'Text'],
  ['general', 'Rectangle'],
  ['general', 'Ellipse'],
  ['general', 'Diamond'],
  ['flowchart', 'Start / End'],
  ['flowchart', 'Data (I/O)'],
  ['general', 'Cylinder'],
  ['flowchart', 'Document'],
  ['general', 'Hexagon'],
  ['general', 'Triangle'],
  ['general', 'Cloud'],
  ['general', 'Sticky note'],
  ['uml', 'Actor'],
  ['uml', 'Class'],
  ['general', 'Callout'],
  ['general', 'Container'],
];

export function ShapePicker() {
  const picker = useUi((s) => s.shapePicker);
  const set = useUi((s) => s.set);
  if (!picker) return null;
  return createPortal(<PickerBody picker={picker} close={() => set({ shapePicker: null })} />, document.body);
}

function PickerBody({ picker, close }: { picker: NonNullable<ReturnType<typeof useUi.getState>['shapePicker']>; close: () => void }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: picker.clientX, top: picker.clientY });
  useDismiss(true, close, ref);

  const items = useMemo<LibraryItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return FAVORITES.map(([lib, label]) => LIBRARIES.find((l) => l.id === lib)?.items.find((i) => i.label === label)).filter((i): i is LibraryItem => !!i);
    }
    return searchShapes(q, 24).map((h) => h.item);
  }, [query]);

  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({
      left: Math.min(Math.max(8, picker.clientX - r.width / 2), window.innerWidth - r.width - 8),
      top: Math.min(picker.clientY + 12, window.innerHeight - r.height - 8),
    });
  }, [picker.clientX, picker.clientY]);

  const pick = (item: LibraryItem) => {
    const s = useEditor.getState();
    if (picker.replaceIds) {
      replaceShapes(picker.replaceIds, { kind: item.kind, style: item.style });
      s.select(picker.replaceIds);
      close();
      return;
    }
    const el = createShape(
      item.kind,
      { x: picker.worldX - item.w / 2, y: picker.worldY - item.h / 2, w: item.w, h: item.h },
      item.style,
      item.text ?? (item.kind === 'text' ? '' : ''),
    );
    s.beginInteraction();
    s.addElements([el]);
    if (picker.connectFrom) {
      const conn = s.doc.elements[picker.connectFrom] as ConnectorElement | undefined;
      if (conn) s.updateElements({ [conn.id]: { target: { elementId: el.id, side: 'auto', x: picker.worldX, y: picker.worldY } } });
    }
    s.endInteraction();
    s.select([el.id]);
    if (item.kind === 'text') s.setEditing(el.id);
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const nav: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 };
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key in nav) {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, Math.max(0, a + nav[e.key])));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      pick(items[active]);
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      className="animate-pop fixed z-[95] w-[288px] rounded-2xl bg-panel p-2 shadow-pop"
      style={{ left: pos.left, top: pos.top }}
      // Portaled, but React still bubbles events to the canvas, whose pointerdown closes the picker.
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        onKey(e);
      }}
    >
      <SearchInput value={query} onChange={(v) => { setQuery(v); setActive(0); }} onKeyDown={onKey} placeholder={picker.replaceIds ? t('canvas.picker.replaceWith') : t('canvas.picker.insertShape')} autoFocus />
      <div className="mt-2 grid grid-cols-6 gap-0.5">
        {items.map((item, i) => (
          <button
            key={`${item.kind}-${item.label}`}
            title={item.label}
            onPointerEnter={() => setActive(i)}
            onClick={() => pick(item)}
            className={cn('flex aspect-square items-center justify-center rounded-lg transition-colors', i === active ? 'bg-accent-soft' : 'hover:bg-hover')}
          >
            <ShapePreview item={item} size={30} />
          </button>
        ))}
      </div>
      {!items.length && <div className="py-6 text-center text-[12px] text-muted">{t('canvas.picker.noMatch')}</div>}
      <div className="mt-1.5 px-1 text-[11px] text-subtle">{items[active]?.label ?? ''}</div>
    </div>
  );
}
