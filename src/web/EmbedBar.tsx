/**
 * Floating Save / Exit pill shown in embed mode. Mounted in its own React
 * root so the editor shell doesn't need to know about embedding.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, LogOut } from 'lucide-react';
import { useEditor, isDirtyState } from '@/store/editor';
import { formatShortcut } from '@/lib/platform';
import { useT } from '@/i18n';

interface Props {
  save: (() => void) | null;
  exit: (() => void) | null;
}

function EmbedBar({ save, exit }: Props) {
  const t = useT();
  const dirty = useEditor(isDirtyState);
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-xl bg-panel p-1 text-[12.5px] shadow-pop">
      {save && (
        <button
          type="button"
          onClick={save}
          title={t('web.embed.saveTitle', { shortcut: formatShortcut('Mod+S').join(' ') })}
          className="flex h-7 items-center gap-1.5 rounded-lg bg-accent px-3 font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          <Check size={14} />
          {dirty ? t('common.save') : t('common.saved')}
        </button>
      )}
      {exit && (
        <button
          type="button"
          onClick={exit}
          className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 font-medium text-fg transition-colors hover:bg-hover"
        >
          <LogOut size={14} className="text-muted" />
          {t('web.embed.exit')}
        </button>
      )}
    </div>
  );
}

export function mountEmbedBar(props: Props): () => void {
  const host = document.createElement('div');
  host.className = 'pointer-events-none fixed left-1/2 top-[54px] z-40 -translate-x-1/2';
  host.dataset.arkdrawEmbedBar = '';
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <StrictMode>
      <EmbedBar {...props} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    host.remove();
  };
}
