/**
 * "OpenDraw x.y is available — Restart to update" toast for the desktop app
 * (the web build has PwaUpdatePrompt). Renders nothing until an update is found.
 */
import { Download, X } from 'lucide-react';
import { confirmDiscard } from '@/app/fileCommands';
import { installUpdate, useUpdater } from './updater';

export function DesktopUpdatePrompt() {
  const status = useUpdater((s) => s.status);
  const version = useUpdater((s) => s.version);
  const progress = useUpdater((s) => s.progress);
  const dismissed = useUpdater((s) => s.dismissed);
  const dismiss = useUpdater((s) => s.dismiss);

  const busy = status === 'downloading' || status === 'installing';
  if (!(status === 'available' || busy) || (dismissed && !busy)) return null;

  const detail =
    status === 'downloading'
      ? `Downloading${progress != null ? ` · ${Math.round(progress * 100)}%` : '…'}`
      : status === 'installing'
        ? 'Installing… OpenDraw will restart.'
        : 'Restart to update. You’ll be asked to save unsaved changes first.';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-[1000] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl bg-panel py-2.5 pl-3.5 pr-2 text-[13px] text-fg shadow-pop"
      style={{ animation: 'od-upd-in 260ms cubic-bezier(.2,.9,.3,1)' }}
    >
      <style>{'@keyframes od-upd-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}'}</style>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Download size={15} />
      </span>
      <div className="min-w-0">
        <div className="font-medium">OpenDraw {version} is available</div>
        <div className="text-[12px] text-muted">{detail}</div>
        {status === 'downloading' && (
          <div className="mt-1.5 h-1 w-48 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round((progress ?? 0.15) * 100)}%` }} />
          </div>
        )}
      </div>
      {!busy && (
        <button
          type="button"
          onClick={async () => {
            if (await confirmDiscard()) await installUpdate();
          }}
          className="ml-1 h-7 shrink-0 rounded-lg bg-accent px-3 text-[12.5px] font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Restart to update
        </button>
      )}
      {!busy && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default DesktopUpdatePrompt;
