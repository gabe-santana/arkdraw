/** App-level overlays: confirm dialog, toasts, shortcuts sheet, context menu. */
import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useUi } from '@/store/ui';
import { useEditor } from '@/store/editor';
import { ACTIONS, ACTION_MAP } from '@/app/actions';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { Shortcut } from '@/ui/Kbd';
import { ContextMenu, type MenuEntry, type MenuItemEntry } from '@/ui/Menu';
import { interactionContextItems } from '@/interaction/menus';

export function ConfirmDialog() {
  const req = useUi((s) => s.confirm);
  return (
    <Dialog open={!!req} onClose={() => req?.resolve('cancel')} className="w-[420px]">
      {req && (
        <div className="p-5">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">{req.title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{req.message}</p>
          <div className="mt-5 flex items-center gap-2">
            {req.denyLabel && (
              <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => req.resolve('deny')}>
                {req.denyLabel}
              </Button>
            )}
            <div className="flex-1" />
            <Button onClick={() => req.resolve('cancel')}>Cancel</Button>
            <Button variant="primary" autoFocus onClick={() => req.resolve('confirm')}>
              {req.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[110] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-slide-up pointer-events-auto flex max-w-[480px] items-center gap-2.5 rounded-xl bg-[#18181d] px-3.5 py-2.5 text-[13px] text-white shadow-pop dark:bg-[#26262d]"
        >
          {t.kind === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          ) : t.kind === 'error' ? (
            <AlertCircle className="size-4 shrink-0 text-red-400" />
          ) : (
            <Info className="size-4 shrink-0 text-sky-400" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function ShortcutsDialog() {
  const open = useUi((s) => s.shortcutsOpen);
  const set = useUi((s) => s.set);
  const groups = useMemo(() => {
    const map = new Map<string, typeof ACTIONS>();
    for (const a of ACTIONS) {
      if (!a.shortcuts?.length) continue;
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return [...map];
  }, []);
  const extras: Array<[string, string]> = [
    ['Pan the canvas', 'Space'],
    ['Zoom', 'Mod+Scroll'],
    ['Duplicate while dragging', 'Alt+Drag'],
    ['Keep proportions', 'Shift+Drag'],
    ['Select inside a group', 'Mod+Click'],
    ['Edit text', 'Enter'],
    ['Nudge', 'Shift+Arrow'],
    ['Next / previous shape', 'Tab'],
    ['Follow a connection', 'Alt+Arrow'],
    ['Edit freehand points', 'Double-click'],
  ];
  return (
    <Dialog open={open} onClose={() => set({ shortcutsOpen: false })} className="w-[780px] max-w-[94vw]">
      <DialogHeader title="Keyboard shortcuts" onClose={() => set({ shortcutsOpen: false })} />
      <div className="scroll-thin grid max-h-[66vh] grid-cols-2 gap-x-8 gap-y-5 overflow-y-auto px-5 pb-5">
        {groups.map(([group, actions]) => (
          <section key={group}>
            <h3 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-subtle">{group}</h3>
            {actions.map((a) => (
              <div key={a.id} className="flex h-8 items-center justify-between border-b border-line/60 text-[13px] text-fg last:border-0">
                {a.label}
                <Shortcut combo={a.shortcuts![0]} />
              </div>
            ))}
          </section>
        ))}
        <section>
          <h3 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-subtle">Canvas</h3>
          {extras.map(([label, combo]) => (
            <div key={label} className="flex h-8 items-center justify-between border-b border-line/60 text-[13px] text-fg last:border-0">
              {label}
              <Shortcut combo={combo} />
            </div>
          ))}
        </section>
      </div>
    </Dialog>
  );
}

export function CanvasContextMenu() {
  const menu = useUi((s) => s.contextMenu);
  const set = useUi((s) => s.set);
  const hasSel = useEditor((s) => s.selection.length > 0);
  if (!menu) return null;
  const e = (id: string): MenuItemEntry => {
    const a = ACTION_MAP[id];
    return { label: a.label, icon: a.icon, shortcut: a.shortcuts?.[0], onSelect: a.run, disabled: a.enabled ? !a.enabled() : false };
  };
  const sep: MenuEntry = { type: 'separator' };
  const isConn = useEditor.getState().selection.some((id) => useEditor.getState().doc.elements[id]?.type === 'connector');
  const layers = useEditor.getState().doc.layers;
  const items: MenuEntry[] = hasSel
    ? [
        e('edit.cut'),
        e('edit.copy'),
        e('edit.paste'),
        e('edit.duplicate'),
        sep,
        e('edit.data'),
        e('edit.link'),
        e('edit.style'),
        ...(ACTION_MAP['edit.mermaid']?.enabled?.() ? [e('edit.mermaid')] : []),
        e('extras.explore'),
        { label: 'Style', items: [e('edit.copyStyle'), e('edit.pasteStyle'), e('edit.defaultStyle')] },
        ...(isConn ? [] : [e('edit.replaceShape')]),
        sep,
        e('arrange.front'),
        e('arrange.back'),
        { label: 'Order', items: [e('arrange.forward'), e('arrange.backward')] },
        e('arrange.group'),
        e('arrange.ungroup'),
        ...interactionContextItems(e),
        { label: 'Rotate & flip', items: [e('arrange.rotate'), e('arrange.rotateCcw'), e('arrange.flipH'), e('arrange.flipV')] },
        ...(isConn ? [e('arrange.reverse'), e('arrange.clearWaypoints')] : []),
        ...(layers && layers.length > 1
          ? [
              {
                label: 'Move to layer',
                items: layers.map((l) => ({ label: l.name, onSelect: () => useEditor.getState().moveSelectionToLayer(l.id) })),
              } as MenuEntry,
            ]
          : []),
        { label: 'Copy as', items: [e('edit.copyImage'), e('edit.copySvg')] },
        e('edit.lock'),
        sep,
        e('view.fitSelection'),
        { ...e('edit.delete'), danger: true },
      ]
    : [
        e('edit.paste'),
        e('edit.pasteHere'),
        e('edit.selectAll'),
        sep,
        e('arrange.image'),
        e('arrange.imageUrl'),
        e('arrange.table'),
        e('file.templates'),
        sep,
        e('view.fit'),
        e('view.grid'),
        e('view.snap'),
        sep,
        e('ai.open'),
        e('view.palette'),
      ];
  return <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => set({ contextMenu: null })} />;
}

