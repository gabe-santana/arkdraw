/**
 * Menus: dropdowns for the title bar and the canvas context menu.
 * Keyboard navigable (↑ ↓ → ← Enter Esc), with hover-opening submenus.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatShortcut } from '@/lib/platform';

export type MenuEntry =
  | {
      type?: 'item';
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      onSelect?: () => void;
      disabled?: boolean;
      checked?: boolean;
      danger?: boolean;
      items?: MenuEntry[];
    }
  | { type: 'separator' }
  | { type: 'label'; label: string };

export type MenuItemEntry = Extract<MenuEntry, { type?: 'item' }>;

interface MenuListProps {
  items: MenuEntry[];
  onClose: () => void;
  /** Position (fixed, client coords). */
  x: number;
  y: number;
  /** Flip to the left of `x` when there's no room (submenus). */
  flipX?: number;
  minWidth?: number;
  autoFocus?: boolean;
  /** Open upwards from `y` (menus anchored to bottom-docked controls). */
  above?: boolean;
}

export function MenuList({ items, onClose, x, y, flipX, minWidth = 220, autoFocus = true, above = false }: MenuListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y, ready: false });
  const [active, setActive] = useState(-1);
  const [sub, setSub] = useState<{ index: number; x: number; y: number; flip: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = above ? y - r.height : y;
    if (left + r.width > window.innerWidth - 8) left = flipX !== undefined ? flipX - r.width : window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - r.height - 8);
    setPos({ left: Math.max(8, left), top, ready: true });
    if (autoFocus) el.focus();
  }, [x, y, flipX, autoFocus, above]);

  const selectable = items.map((it, i) => ((!it.type || it.type === 'item') && !it.disabled ? i : -1)).filter((i) => i >= 0);

  const activate = (i: number) => {
    const it = items[i];
    if (!it || (it.type && it.type !== 'item') || it.disabled) return;
    if (it.items) {
      const row = ref.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.getBoundingClientRect();
      if (row) setSub({ index: i, x: row.right + 2, y: row.top - 5, flip: row.left - 2 });
      return;
    }
    onClose();
    it.onSelect?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = selectable.indexOf(active);
      const next = e.key === 'ArrowDown' ? (cur + 1) % selectable.length : (cur - 1 + selectable.length) % selectable.length;
      setActive(selectable[next] ?? -1);
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (active >= 0) activate(active);
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className="animate-pop fixed z-[90] rounded-xl bg-panel p-1 shadow-pop outline-none"
      style={{ left: pos.left, top: pos.top, minWidth, visibility: pos.ready ? 'visible' : 'hidden' }}
    >
      {items.map((it, i) => {
        if (it.type === 'separator') return <div key={i} className="mx-2 my-1 h-px bg-line" />;
        if (it.type === 'label')
          return (
            <div key={i} className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
              {it.label}
            </div>
          );
        return (
          <div
            key={i}
            data-index={i}
            role="menuitem"
            aria-disabled={it.disabled}
            onPointerEnter={() => {
              setActive(i);
              if (it.items && !it.disabled) activate(i);
              else setSub(null);
            }}
            onClick={() => activate(i)}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px]',
              it.disabled ? 'text-subtle' : it.danger ? 'text-danger' : 'text-fg',
              active === i && !it.disabled && (it.danger ? 'bg-danger/10' : 'bg-hover'),
            )}
          >
            <span className="flex w-4 shrink-0 items-center justify-center text-muted [&_svg]:size-[15px]">
              {it.checked ? <Check className="text-accent" /> : it.icon}
            </span>
            <span className="flex-1 truncate">{it.label}</span>
            {it.shortcut && (
              <span className="ml-6 text-[11.5px] tracking-wide text-subtle">{formatShortcut(it.shortcut).join(isMacJoiner())}</span>
            )}
            {it.items && <ChevronRight className="size-3.5 text-subtle" />}
          </div>
        );
      })}
      {sub && (() => {
        const it = items[sub.index];
        return it && (!it.type || it.type === 'item') && it.items ? (
          <MenuList items={it.items} onClose={onClose} x={sub.x} y={sub.y} flipX={sub.flip} autoFocus={false} minWidth={200} />
        ) : null;
      })()}
    </div>
  );
}

const isMacJoiner = () => (navigator.userAgent.includes('Mac') ? '' : '+');

/** Closes on outside pointerdown / blur / Escape. */
export function useDismiss(open: boolean, onClose: () => void, ignore?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if ((t as Element).closest?.('[role="menu"]')) return;
      if (ignore?.current?.contains(t)) return;
      onClose();
    };
    const blur = () => onClose();
    // Escape closes the menu only (it shouldn't also clear the canvas selection).
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('blur', blur);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('blur', blur);
      window.removeEventListener('keydown', key, true);
    };
  }, [open, onClose, ignore]);
}

/** Floating menu at a client point (context menu). */
export function ContextMenu({ x, y, items, onClose, above, minWidth }: { x: number; y: number; items: MenuEntry[]; onClose: () => void; above?: boolean; minWidth?: number }) {
  useDismiss(true, onClose);
  return createPortal(<MenuList items={items} onClose={onClose} x={x} y={y} above={above} minWidth={minWidth} />, document.body);
}
