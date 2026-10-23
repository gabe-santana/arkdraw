/**
 * Group isolation ("Enter group"): everything outside the entered group is
 * dimmed and click-through, and a breadcrumb bar shows where you are with a
 * way back out. Also makes `selectable: false` elements click-through.
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronRight, LogOut } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { useInteraction } from '@/interaction/store';
import { exitGroup } from '@/interaction/groups';
import { Kbd } from '@/ui/Kbd';

const sel = (id: string) => `[data-el="${CSS.escape(id)}"]`;

/** Dims non-members, blocks their pointer events, and click-through for non-selectable elements. */
function IsolationStyles({ isolation }: { isolation: string[] }) {
  const g = isolation[isolation.length - 1];
  const members = useEditor(useShallow((s) => (g ? s.doc.order.filter((id) => s.doc.elements[id]?.groupIds.includes(g)) : [])));
  const passThrough = useEditor(useShallow((s) => s.doc.order.filter((id) => s.doc.elements[id]?.behavior?.selectable === false)));
  const css = useMemo(() => {
    const rules: string[] = [];
    if (g && members.length) {
      const keep = members.map(sel).join(',');
      rules.push(`[data-canvas] [data-el]:not(:is(${keep})){filter:opacity(0.22) grayscale(0.4);transition:filter .2s}`);
      rules.push(`[data-canvas] [data-el]:not(:is(${keep})),[data-canvas] [data-el]:not(:is(${keep})) *{pointer-events:none!important}`);
    }
    if (passThrough.length) {
      const ids = passThrough.map(sel).join(',');
      rules.push(`[data-canvas] :is(${ids}),[data-canvas] :is(${ids}) *{pointer-events:none!important}`);
    }
    return rules.join('\n');
  }, [g, members, passThrough]);
  return css ? <style>{css}</style> : null;
}

export function GroupIsolation() {
  const isolation = useInteraction((s) => s.isolation);
  const sizes = useEditor(useShallow((s) => isolation.map((g) => s.doc.order.filter((id) => s.doc.elements[id]?.groupIds.includes(g)).length)));
  return (
    <>
      <IsolationStyles isolation={isolation} />
      {isolation.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
          <nav
            aria-label="Entered groups"
            className="animate-slide-up pointer-events-auto flex items-center gap-1 rounded-xl bg-panel py-1 pl-1 pr-1 text-[12px] shadow-pop"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className="rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-fg"
              onClick={() => useInteraction.getState().set({ isolation: [] })}
              title="Back to the whole diagram (Home)"
            >
              Diagram
            </button>
            {isolation.map((g, i) => (
              <span key={g} className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-subtle" />
                <button
                  className={i === isolation.length - 1 ? 'rounded-md px-2 py-1 font-medium text-fg' : 'rounded-md px-2 py-1 text-muted hover:bg-hover hover:text-fg'}
                  aria-current={i === isolation.length - 1 ? 'location' : undefined}
                  onClick={() => useInteraction.getState().set({ isolation: isolation.slice(0, i + 1) })}
                >
                  {i === 0 ? 'Group' : 'Subgroup'} <span className="tabular-nums text-subtle">· {sizes[i] ?? 0}</span>
                </button>
              </span>
            ))}
            <div className="mx-1 h-4 w-px bg-line" />
            <button className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-accent hover:bg-accent-soft" onClick={exitGroup}>
              <LogOut className="size-3.5" /> Exit group <Kbd>Esc</Kbd>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
