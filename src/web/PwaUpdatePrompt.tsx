/**
 * "New version available" / "Ready to work offline" toast for the web build.
 * Renders nothing in the desktop app or until the service worker reports in.
 */
import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff, X } from 'lucide-react';
import { useT } from '@/i18n';
import { usePwa } from './pwa';

export function PwaUpdatePrompt() {
  const tr = useT();
  const needRefresh = usePwa((s) => s.needRefresh);
  const offlineReady = usePwa((s) => s.offlineReady);
  const update = usePwa((s) => s.update);
  const dismiss = usePwa((s) => s.dismiss);
  const [busy, setBusy] = useState(false);

  // The offline notice is informational; let it fade on its own.
  useEffect(() => {
    if (!offlineReady || needRefresh) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [offlineReady, needRefresh, dismiss]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-[1000] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl bg-panel py-2.5 pl-3.5 pr-2 text-[13px] text-fg shadow-pop"
      style={{ animation: 'od-pwa-in 260ms cubic-bezier(.2,.9,.3,1)' }}
    >
      <style>{'@keyframes od-pwa-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}'}</style>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {needRefresh ? <RefreshCw size={15} /> : <WifiOff size={15} />}
      </span>
      <div className="min-w-0">
        <div className="font-medium">{needRefresh ? tr('web.pwa.newVersion') : tr('web.pwa.offlineReady')}</div>
        <div className="text-[12px] text-muted">
          {needRefresh ? tr('web.pwa.reloadHint') : tr('web.pwa.cached')}
        </div>
      </div>
      {needRefresh && update && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            update().catch(() => setBusy(false));
          }}
          className="ml-1 h-7 shrink-0 rounded-lg bg-accent px-3 text-[12.5px] font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? tr('web.pwa.updating') : tr('web.pwa.reload')}
        </button>
      )}
      <button
        type="button"
        aria-label={tr('app.dismiss')}
        title={tr('app.dismiss')}
        onClick={dismiss}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default PwaUpdatePrompt;
