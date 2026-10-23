/**
 * Minimal in-app text prompt (the UI store's `ask()` only confirms). The host
 * mounts itself into its own root on first use, so callers just
 * `await promptText({...})` and get the string, or null when cancelled.
 */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { create } from 'zustand';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { useT } from '@/i18n';

export interface PromptRequest {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  /** Returns an error message for invalid input (keeps the dialog open). */
  validate?: (value: string) => string | null;
}

const usePrompt = create<{ req: (PromptRequest & { resolve: (v: string | null) => void }) | null }>(() => ({ req: null }));

let mounted = false;

export function promptText(req: PromptRequest): Promise<string | null> {
  if (!mounted && typeof document !== 'undefined') {
    mounted = true;
    const host = document.createElement('div');
    host.dataset.odPrompt = '';
    document.body.appendChild(host);
    createRoot(host).render(<PromptHost />);
  }
  usePrompt.getState().req?.resolve(null);
  return new Promise((resolve) => {
    usePrompt.setState({
      req: {
        ...req,
        resolve: (v) => {
          usePrompt.setState({ req: null });
          resolve(v);
        },
      },
    });
  });
}

const inputClass =
  'h-8 w-full rounded-lg bg-panel-2 px-2.5 text-[12.5px] text-fg outline-none ring-1 ring-transparent transition-shadow placeholder:text-subtle hover:ring-line focus:bg-panel focus:ring-2 focus:ring-accent/40';

function PromptHost() {
  const req = usePrompt((s) => s.req);
  return (
    <Dialog open={!!req} onClose={() => req?.resolve(null)} className="w-[460px] max-w-[94vw]">
      {req && <PromptBody key={req.title + (req.defaultValue ?? '')} req={req} />}
    </Dialog>
  );
}

function PromptBody({ req }: { req: NonNullable<ReturnType<typeof usePrompt.getState>['req']> }) {
  const t = useT();
  const [value, setValue] = useState(req.defaultValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const err = req.validate?.(value) ?? null;
    if (err) setError(err);
    else req.resolve(value);
  };
  return (
    <form
      className="p-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="text-[15px] font-semibold tracking-tight text-fg">{req.title}</h2>
      {req.message && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{req.message}</p>}
      <input
        autoFocus
        aria-label={req.title}
        className={`${inputClass} mt-3`}
        value={value}
        placeholder={req.placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
      />
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button type="button" onClick={() => req.resolve(null)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={!value.trim()}>
          {req.confirmLabel ?? t('common.ok')}
        </Button>
      </div>
    </form>
  );
}
