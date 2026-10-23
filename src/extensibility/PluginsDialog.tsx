/**
 * Extras → Plugins…: add plugins by URL (web), file path or file (desktop /
 * browser), enable/disable and remove them. The list is persisted; enabled
 * plugins load at startup.
 */
import { useState } from 'react';
import { FileUp, Plus, Puzzle, ShieldAlert, Trash } from 'lucide-react';
import { pickAndOpenFile } from '@/io/native';
import { isTauri } from '@/lib/platform';
import { cn } from '@/lib/cn';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { Switch } from '@/ui/controls';
import { useExt } from './store';
import { addPlugin, removePlugin, setPluginEnabled, usePlugins, type PluginEntry, type PluginStatus } from './plugins';

export function PluginsDialog() {
  const open = useExt((s) => s.pluginsOpen);
  const close = () => useExt.getState().set({ pluginsOpen: false });
  return (
    <Dialog open={open} onClose={close} className="w-[560px] max-w-[94vw]">
      {open && <PluginsBody close={close} />}
    </Dialog>
  );
}

const input =
  'h-8 w-full rounded-lg bg-panel-2 px-2.5 text-[12.5px] text-fg outline-none ring-1 ring-transparent transition-shadow placeholder:text-subtle hover:ring-line focus:bg-panel focus:ring-2 focus:ring-accent/40';

function StatusChip({ status, enabled }: { status?: PluginStatus; enabled: boolean }) {
  const st = status?.state ?? (enabled ? 'loading' : 'disabled');
  const [label, cls] =
    st === 'active'
      ? ['Active', 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400']
      : st === 'error'
        ? ['Error', 'bg-danger/12 text-danger']
        : st === 'loading'
          ? ['Loading…', 'bg-hover text-muted']
          : ['Off', 'bg-hover text-subtle'];
  return <span className={cn('rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide', cls)}>{label}</span>;
}

function PluginRow({ entry, status, activeNames }: { entry: PluginEntry; status?: PluginStatus; activeNames: string[] }) {
  const title = activeNames.join(', ') || entry.name || entry.source.split(/[\\/]/).pop() || entry.source;
  return (
    <li className="rounded-xl px-3 py-2.5 ring-1 ring-line">
      <div className="flex items-center gap-2.5">
        <Puzzle className="size-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-fg">{title}</span>
            <StatusChip status={status} enabled={entry.enabled} />
          </div>
          <div className="truncate font-mono text-[11px] text-subtle" title={entry.source}>
            {entry.code ? `${entry.source} (stored copy)` : entry.source}
          </div>
        </div>
        <Switch checked={entry.enabled} onChange={(v) => void setPluginEnabled(entry.source, v)} />
        <button className="rounded-lg p-1.5 text-subtle hover:bg-hover hover:text-danger" aria-label="Remove plugin" onClick={() => removePlugin(entry.source)}>
          <Trash className="size-3.5" />
        </button>
      </div>
      {status?.state === 'error' && <p className="mt-1.5 text-[11.5px] leading-snug text-danger">{status.error}</p>}
    </li>
  );
}

function PluginsBody({ close }: { close: () => void }) {
  const entries = usePlugins((s) => s.entries);
  const status = usePlugins((s) => s.status);
  const active = usePlugins((s) => s.active);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const listed = new Set(entries.map((e) => e.source));
  const external = Object.entries(active).filter(([, a]) => !a.source || !listed.has(a.source));

  const add = async (src: string, code?: string, name?: string) => {
    setBusy(true);
    try {
      if (await addPlugin(src, code, name)) setSource('');
    } finally {
      setBusy(false);
    }
  };

  const addFile = async () => {
    const f = await pickAndOpenFile([{ name: 'JavaScript', extensions: ['js', 'mjs'] }]);
    if (!f) return;
    // Desktop keeps the path (reloaded from disk); the browser keeps a copy of the code.
    if (isTauri() && f.path) await add(f.path);
    else await add(`file:${f.name}`, f.contents, f.name);
  };

  return (
    <div onKeyDown={(e) => e.stopPropagation()}>
      <DialogHeader title="Plugins" subtitle="Extend OpenDraw with commands, shape libraries and file formats" onClose={close} />
      <div className="scroll-thin max-h-[62vh] space-y-3 overflow-y-auto px-5 pb-4">
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-[12px] leading-snug text-amber-800 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Plugins run inside OpenDraw with full access to the editor and your diagrams, like draw.io plugins. Only add plugins you trust. You’ll be asked to
            confirm before one is enabled.
          </span>
        </div>

        {entries.length ? (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <PluginRow
                key={e.source}
                entry={e}
                status={status[e.source]}
                activeNames={Object.values(active)
                  .filter((a) => a.source === e.source)
                  .map((a) => a.name)}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl px-3 py-4 text-center text-[12.5px] text-subtle ring-1 ring-dashed ring-line">No plugins yet.</p>
        )}

        {external.length > 0 && (
          <div>
            <h3 className="mb-1 text-[11.5px] font-medium text-muted">Loaded by the app or its configuration</h3>
            <ul className="space-y-0.5 text-[12.5px] text-fg">
              {external.map(([id, a]) => (
                <li key={id} className="flex items-center gap-2 px-1">
                  <Puzzle className="size-3.5 text-muted" />
                  {a.name}
                  {a.version && <span className="text-subtle">v{a.version}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[11.5px] font-medium text-muted" htmlFor="od-plugin-url">
            Add plugin
          </label>
          <div className="flex gap-1.5">
            <input
              id="od-plugin-url"
              className={cn(input, 'font-mono text-[12px]')}
              value={source}
              placeholder={isTauri() ? 'https://…/plugin.js or C:\\path\\plugin.js' : 'https://…/plugin.js or /plugins/my-plugin.js'}
              onChange={(e) => setSource(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !source.trim()) return;
                // Swallow the key so it can't also press the trust prompt's default button.
                e.preventDefault();
                void add(source);
              }}
            />
            <Button disabled={busy || !source.trim()} icon={<Plus className="size-3.5" />} onClick={() => void add(source)}>
              Add
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Button size="sm" variant="ghost" icon={<FileUp className="size-3.5" />} disabled={busy} onClick={() => void addFile()}>
              Add from file…
            </Button>
            <span className="text-[11.5px] text-subtle">API: docs/extensibility.md</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button onClick={close}>Done</Button>
      </div>
    </div>
  );
}
