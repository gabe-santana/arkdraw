/**
 * Visible feedback while the AI assistant works on the diagram: a status pill
 * (with a Stop button) while it thinks, then, when it edits the canvas, a
 * brand-color glow around the window and a staggered pop on every element
 * it adds or changes.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { Sparkles, Square } from 'lucide-react';
import type { Doc } from '@/model/types';
import { useT } from '@/i18n';

export interface AiActivity {
  /** What the assistant is doing right now ("Searching icons…"). */
  label: string;
  stop: () => void;
}

interface ActivityState {
  run: AiActivity | null;
  /** Changes are being revealed on the canvas. */
  applying: boolean;
}

export const useAiActivity = create<ActivityState>(() => ({ run: null, applying: false }));

const STYLE_ID = 'od-ai-changes';
/** Stagger between elements, and the cap on the whole reveal. */
const STEP_MS = 55;
const MAX_STAGGER_MS = 1400;
const ANIM_MS = 650;
/** The window glow lasts at least this long, so it reads as "the AI is editing". */
const MIN_GLOW_MS = 1600;
let run = 0;

/**
 * Animates what changed between two versions of the document: new elements
 * appear one after another, changed ones bump with a glow.
 */
export function animateChanges(before: Doc, after: Doc) {
  const added: string[] = [];
  const changed: string[] = [];
  for (const id of after.order) {
    const prev = before.elements[id];
    if (!prev) added.push(id);
    else if (JSON.stringify(prev) !== JSON.stringify(after.elements[id])) changed.push(id);
  }
  const ids = [...changed, ...added];
  if (!ids.length) return;
  const step = Math.min(STEP_MS, MAX_STAGGER_MS / ids.length);
  const rules = ids.map((id, i) => {
    const el = after.elements[id];
    // Scaling needs a centered transform origin, which would distort an element's own rotate/flip transform: those fade instead.
    const scalable = el.type === 'shape' && !el.rotation && !el.flipH && !el.flipV;
    const anim = added.includes(id) ? (scalable ? 'od-ai-in' : 'od-ai-fade') : scalable ? 'od-ai-bump' : 'none';
    const delay = Math.round(i * step);
    const origin = scalable ? 'transform-box:fill-box;transform-origin:center;' : '';
    return `[data-canvas] [data-el="${CSS.escape(id)}"]{${origin}animation:${anim} ${ANIM_MS}ms cubic-bezier(.2,.9,.3,1.2) ${delay}ms both,od-ai-glow 1100ms ease-out ${delay}ms both}`;
  });
  document.getElementById(STYLE_ID)?.remove();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = rules.join('\n');
  document.head.append(style);

  // Done when the animations really are: they follow the document's animation
  // timeline (slowed down or sped up, e.g. by DevTools), unlike a fixed timer.
  const mine = ++run;
  useAiActivity.setState({ applying: true });
  const finish = () => {
    if (mine !== run) return;
    style.remove();
    useAiActivity.setState({ applying: false });
  };
  // Wait two frames so the changed elements are on the canvas with their animations.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const nodes = ids.flatMap((id) => [...document.querySelectorAll(`[data-canvas] [data-el="${CSS.escape(id)}"]`)]);
      const hold = document.documentElement.animate([], { duration: MIN_GLOW_MS });
      void Promise.allSettled([hold, ...nodes.flatMap((n) => n.getAnimations())].map((a) => a.finished)).then(finish);
    }),
  );
  window.setTimeout(finish, 30000); // safety net
}

/** Status pill while the assistant works; glow around the window while it edits the canvas. */
export function AgentGlow() {
  const run = useAiActivity((s) => s.run);
  const applying = useAiActivity((s) => s.applying);
  const t = useT();

  // Esc stops a run (capture phase, before the canvas uses Esc to deselect).
  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      run.stop();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [run]);

  if (!run && !applying) return null;
  return createPortal(
    <>
      {applying && <div aria-hidden className="od-ai-glow pointer-events-none fixed inset-0 z-[150]" />}
      {run && (
        <div
          role="status"
          className="animate-pop fixed left-1/2 top-12 z-[151] flex -translate-x-1/2 items-center gap-2 rounded-full bg-panel py-1 pl-3 pr-1 text-[12.5px] shadow-pop"
        >
          <Sparkles className="od-ai-sparkle size-3.5 shrink-0 text-accent" />
          <span className="max-w-[340px] truncate font-medium text-fg">{run.label}</span>
          <button
            type="button"
            onClick={run.stop}
            title={t('ai.activity.stopHint')}
            className="flex h-6 items-center gap-1.5 rounded-full bg-panel-2 px-2.5 text-[11.5px] font-medium text-muted ring-1 ring-line transition-colors hover:bg-hover hover:text-fg"
          >
            <Square className="size-2.5 fill-current" />
            {t('ai.panel.stop')}
          </button>
        </div>
      )}
    </>,
    document.body,
  );
}
