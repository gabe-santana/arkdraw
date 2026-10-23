/**
 * Rich hover card for library items: a larger preview, name, source and a
 * one-line description. Opens beside the library panel (never covering the
 * tiles), after a short delay; instant while moving between tiles.
 */
import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface HoverCardContent {
  title: string;
  /** Small line under the title, e.g. "AWS · Compute". */
  meta?: ReactNode;
  description?: ReactNode;
  preview?: ReactNode;
  /** Accent dot color (provider brand). */
  accent?: string;
  hint?: ReactNode;
}

let warmUntil = 0;

export function HoverCard({ content, children, delay = 380 }: { content: () => HoverCardContent; children: ReactElement; delay?: number }) {
  const [anchor, setAnchor] = useState<{ rect: DOMRect; panelRight: number } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const timer = useRef(0);
  const card = useRef<HTMLDivElement>(null);

  const show = (e: React.PointerEvent) => {
    if (e.buttons) return; // not while dragging a tile
    const wrapper = e.currentTarget as HTMLElement;
    const target = (wrapper.firstElementChild as HTMLElement | null) ?? wrapper;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        const panel = target.closest('aside');
        setAnchor({ rect: target.getBoundingClientRect(), panelRight: panel ? panel.getBoundingClientRect().right : target.getBoundingClientRect().right });
      },
      performance.now() < warmUntil ? 0 : delay,
    );
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    if (anchor) warmUntil = performance.now() + 400;
    setAnchor(null);
    setPos(null);
  };

  useLayoutEffect(() => {
    if (!anchor || !card.current) return;
    const c = card.current.getBoundingClientRect();
    let left = anchor.panelRight + 10;
    if (left + c.width > window.innerWidth - 8) left = anchor.rect.left - c.width - 10;
    let top = anchor.rect.top + anchor.rect.height / 2 - c.height / 2;
    top = Math.max(8, Math.min(window.innerHeight - c.height - 8, top));
    setPos({ left, top });
  }, [anchor]);

  const data = anchor ? content() : null;
  return (
    <>
      <span className="contents" onPointerEnter={show} onPointerLeave={hide} onPointerDown={hide}>
        {children}
      </span>
      {anchor &&
        data &&
        createPortal(
          <div
            ref={card}
            role="tooltip"
            className="animate-pop pointer-events-none fixed z-[100] w-[288px] overflow-hidden rounded-2xl bg-panel shadow-pop"
            style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
          >
            {data.preview && (
              <div className="flex h-[120px] items-center justify-center border-b border-line bg-panel-2 p-4">{data.preview}</div>
            )}
            <div className="space-y-1 p-3.5">
              <div className="flex items-start gap-2">
                {data.accent && <span className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: data.accent }} />}
                <div className="text-[13.5px] font-semibold leading-snug text-fg">{data.title}</div>
              </div>
              {data.meta && <div className="text-[11.5px] font-medium text-muted">{data.meta}</div>}
              {data.description && <p className="pt-1 text-[12.5px] leading-relaxed text-fg/85">{data.description}</p>}
              {data.hint && <div className="pt-1.5 text-[11px] text-subtle">{data.hint}</div>}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
