import { useEffect, useRef } from 'react';
import { MousePointer2, Shapes, Sparkles } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { Kbd } from '@/ui/Kbd';
import { SceneLayer } from './SceneLayer';
import { OverlayLayer } from './OverlayLayer';
import { TextEditor } from './TextEditor';
import { ExtraLabelEditor } from './ExtraLabelEditor';
import { useCanvasInteractions } from './useCanvasInteractions';
import { registerCanvasElement } from './viewport';
import { ShapePicker } from './ShapePicker';
import { InteractionLayer } from '@/interaction/InteractionLayer';
import { Scrollbars } from '@/styling/Scrollbars';

export function Canvas({ dark }: { dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { onPointerDown, onPointerMove, onPointerUp, onDoubleClick, onContextMenu, panning, spaceHeld, freehand } =
    useCanvasInteractions(ref);
  const tool = useEditor((s) => s.tool);
  const camera = useEditor((s) => s.camera);
  const settings = useEditor((s) => s.settings);
  const empty = useEditor((s) => s.doc.order.length === 0);
  const pageBg = useEditor((s) => s.pages.find((p) => p.id === s.activePageId)?.settings.background ?? null);

  useEffect(() => {
    const el = ref.current;
    registerCanvasElement(el);
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const s = useEditor.getState();
      // First layout: put the world origin in the middle of the screen.
      if (s.viewport.w === 1200 && s.viewport.h === 800 && s.camera.x === 0 && s.camera.y === 0 && s.doc.order.length === 0) {
        s.setCamera({ x: width / 2, y: height / 2, z: 1 });
      }
      s.setViewport(width, height);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      registerCanvasElement(null);
    };
  }, []);

  // Dot grid via CSS: zero cost while panning/zooming. Coarsens when zoomed out.
  let step = settings.gridSize * 2 * camera.z;
  while (step < 14) step *= 5;
  const dot = Math.max(1, Math.min(1.6, camera.z * 1.2));

  const cursor = panning
    ? 'grabbing'
    : spaceHeld || tool === 'hand'
      ? 'grab'
      : tool.startsWith('shape:') || tool === 'connector' || tool === 'freehand'
        ? 'crosshair'
        : 'default';

  return (
    <div
      ref={ref}
      data-canvas
      tabIndex={0}
      role="application"
      aria-roledescription="diagram canvas"
      aria-label="Diagram canvas. Tab moves between shapes, Alt+Arrow follows connections, Shift+F10 opens the context menu."
      className="absolute inset-0 overflow-hidden bg-canvas outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--selection)]"
      style={{
        cursor,
        backgroundColor: pageBg ?? undefined,
        backgroundImage: settings.grid ? `radial-gradient(circle, ${settings.gridColor ?? 'var(--grid-dot)'} ${dot}px, transparent ${dot + 0.4}px)` : undefined,
        backgroundSize: `${step}px ${step}px`,
        backgroundPosition: `${camera.x - step / 2}px ${camera.y - step / 2}px`,
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <SceneLayer dark={dark} />
      <OverlayLayer freehand={freehand} />
      <InteractionLayer />
      <TextEditor />
      <ExtraLabelEditor />
      {empty && <EmptyState />}
      <ShapePicker />
      {settings.scrollbars && <Scrollbars />}
    </div>
  );
}

function EmptyState() {
  const leftOpen = useUi((s) => s.leftOpen);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className={cn('animate-fade flex flex-col items-center text-center', leftOpen && 'translate-x-[60px]')}>
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-[22px] bg-accent/25 blur-2xl" />
          <div className="relative flex size-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#7c7fff] via-[#5b4bf5] to-[#3a2bb8] shadow-lg ring-1 ring-white/20">
            <Shapes className="size-7 text-white" strokeWidth={1.75} />
          </div>
        </div>
        <h2 className="text-[17px] font-semibold tracking-tight text-fg">Start with a blank canvas</h2>
        <p className="mt-1.5 max-w-[340px] text-[13px] leading-relaxed text-muted">
          Drag shapes from the library, draw with the toolbar, or describe a diagram and let AI sketch it for you.
        </p>
        <div className="mt-5 flex items-center gap-4 text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            <MousePointer2 className="size-3.5" /> <Kbd>R</Kbd> rectangle
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>L</Kbd> connector
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> <Kbd>Ctrl</Kbd>
            <Kbd>I</Kbd> AI
          </span>
        </div>
      </div>
    </div>
  );
}
