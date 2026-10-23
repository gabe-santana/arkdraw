import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Shortcut } from './Kbd';

interface TooltipProps {
  label: ReactNode;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactElement;
  delay?: number;
}

/**
 * Lightweight tooltip: waits briefly on first hover, then shows instantly
 * while moving between toolbar buttons (like native apps do).
 */
let warmUntil = 0;

export function Tooltip({ label, shortcut, side = 'bottom', children, delay = 450 }: TooltipProps) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const timer = useRef<number>(0);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = (e: React.PointerEvent) => {
    // The wrapper is `display: contents` (no box of its own) — measure the real element,
    // and only when the tooltip appears (the list may have scrolled meanwhile).
    const wrapper = e.currentTarget as HTMLElement;
    const target = (wrapper.firstElementChild as HTMLElement | null) ?? wrapper;
    window.clearTimeout(timer.current);
    const wait = performance.now() < warmUntil ? 0 : delay;
    timer.current = window.setTimeout(() => setAnchor(target.getBoundingClientRect()), wait);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    if (anchor) warmUntil = performance.now() + 500;
    setAnchor(null);
    setPos(null);
  };

  useLayoutEffect(() => {
    if (!anchor || !tipRef.current) return;
    const t = tipRef.current.getBoundingClientRect();
    const gap = 8;
    let left = anchor.left + anchor.width / 2 - t.width / 2;
    let top = side === 'top' ? anchor.top - t.height - gap : anchor.bottom + gap;
    if (side === 'right') {
      left = anchor.right + gap;
      top = anchor.top + anchor.height / 2 - t.height / 2;
    } else if (side === 'left') {
      left = anchor.left - t.width - gap;
      top = anchor.top + anchor.height / 2 - t.height / 2;
    }
    left = Math.max(6, Math.min(window.innerWidth - t.width - 6, left));
    top = Math.max(6, Math.min(window.innerHeight - t.height - 6, top));
    setPos({ left, top });
  }, [anchor, side]);

  return (
    <>
      <span className="contents" onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
        {children}
      </span>
      {anchor &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="animate-fade pointer-events-none fixed z-[100] flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#1c1c22] px-2 py-1 text-[12px] font-medium text-white shadow-pop dark:bg-[#2a2a32]"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
          >
            {label}
            {shortcut && <Shortcut combo={shortcut} className="[&>kbd]:border-white/15 [&>kbd]:bg-white/10 [&>kbd]:text-white/80 [&>kbd]:shadow-none" />}
          </div>,
          document.body,
        )}
    </>
  );
}
