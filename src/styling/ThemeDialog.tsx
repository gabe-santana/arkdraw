/**
 * Extras → Theme…: pick a curated palette and recolor the diagram by role.
 * Mounts itself on first use (like PromptDialog), so no App wiring is needed.
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { create } from 'zustand';
import { useEditor } from '@/store/editor';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Segmented } from '@/ui/controls';
import { DIAGRAM_THEMES, themeLabel, type DiagramTheme } from './themes';
import { useT } from '@/i18n';
import { applyTheme } from './commands';

const useThemeDialog = create<{ open: boolean }>(() => ({ open: false }));
let mounted = false;

export function openThemeDialog() {
  if (!mounted && typeof document !== 'undefined') {
    mounted = true;
    const host = document.createElement('div');
    host.dataset.odThemeDialog = '';
    document.body.appendChild(host);
    createRoot(host).render(<ThemeDialogHost />);
  }
  useThemeDialog.setState({ open: true });
}

function ThemeDialogHost() {
  const open = useThemeDialog((s) => s.open);
  const close = () => useThemeDialog.setState({ open: false });
  return (
    <Dialog open={open} onClose={close} className="w-[560px] max-w-[94vw]" labelledBy="od-theme-title">
      {open && <ThemeBody close={close} />}
    </Dialog>
  );
}

function ThemeBody({ close }: { close: () => void }) {
  const t = useT();
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const empty = useEditor((s) => s.doc.order.length === 0);
  const [scope, setScope] = useState<'page' | 'selection'>(hasSelection ? 'selection' : 'page');
  return (
    <div onKeyDown={(e) => e.stopPropagation()}>
      <DialogHeader
        id="od-theme-title"
        title={t('styling.theme.title')}
        subtitle={t('styling.theme.subtitle')}
        onClose={close}
      />
      <div className="space-y-3 px-5 pb-5">
        {hasSelection && (
          <Segmented
            size="sm"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'page', label: t('styling.theme.wholePage') },
              { value: 'selection', label: t('common.selection') },
            ]}
          />
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DIAGRAM_THEMES.map((theme) => (
            <button
              key={theme.id}
              disabled={empty}
              onClick={() => {
                applyTheme(theme.id, scope);
                close();
              }}
              className="group flex flex-col gap-2 rounded-xl bg-panel-2 p-2 text-left ring-1 ring-line transition-shadow hover:ring-2 hover:ring-accent/50 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              <ThemePreview theme={theme} />
              <span className="truncate px-0.5 text-[12px] font-medium text-fg">{themeLabel(theme)}</span>
            </button>
          ))}
        </div>
        {empty && <p className="text-[12px] text-muted">{t('styling.theme.empty')}</p>}
      </div>
    </div>
  );
}

/** A tiny three-node diagram drawn in the theme's colors. */
export function ThemePreview({ theme }: { theme: DiagramTheme }) {
  const node = (x: number, y: number, i: number) => (
    <g key={i}>
      <rect x={x} y={y} width={44} height={24} rx={5} fill={theme.fills[i]} stroke={theme.strokes[i]} strokeWidth={1.25} />
      <rect x={x + 10} y={y + 10.5} width={24} height={3} rx={1.5} fill={theme.text} opacity={0.75} />
    </g>
  );
  return (
    <svg viewBox="0 0 150 70" className="h-[70px] w-full rounded-lg bg-white" aria-hidden>
      <path d="M52 20 H 98 M75 20 V 40" stroke={theme.line} strokeWidth={1.25} fill="none" />
      <path d="M93 17 L98 20 L93 23 Z M72 35 L75 40 L78 35 Z" fill={theme.line} />
      {node(8, 8, 0)}
      {node(98, 8, 1)}
      {node(53, 40, 2)}
    </svg>
  );
}
