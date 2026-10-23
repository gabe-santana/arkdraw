/**
 * Small form pieces shared by the automation dialogs (same look as the Edit
 * Data dialog in src/chrome/EditDialogs.tsx).
 */
import { Fragment, type ReactNode } from 'react';
import { Plus, Trash } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useT, type MessageKey, type MessageVars, type TFunction } from '@/i18n';

export const inputCls =
  'h-8 w-full rounded-lg bg-panel-2 px-2.5 text-[12.5px] text-fg outline-none ring-1 ring-transparent transition-shadow placeholder:text-subtle hover:ring-line focus:bg-panel focus:ring-2 focus:ring-accent/40';

export const textareaCls =
  'w-full resize-none rounded-lg bg-panel-2 px-2.5 py-2 font-mono text-[12px] leading-relaxed text-fg outline-none ring-1 ring-transparent placeholder:text-subtle hover:ring-line focus:bg-panel focus:ring-2 focus:ring-accent/40';

export const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between text-[11.5px] font-medium text-muted">
        {label}
        {hint && <span className="font-normal text-subtle">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * A translated sentence whose `{name}` placeholders are React nodes (number
 * inputs, links…), so the sentence stays one key: `rich(t, 'x.fromTo', { from: <input /> })`.
 */
export function rich(t: TFunction, key: MessageKey, nodes: Record<string, ReactNode>, vars?: MessageVars): ReactNode[] {
  const marks: MessageVars = { ...vars };
  for (const k of Object.keys(nodes)) marks[k] = `\u0001${k}\u0001`;
  return t(key, marks)
    .split(/\u0001(\w+)\u0001/)
    .map((part, i) => (i % 2 ? <Fragment key={i}>{nodes[part]}</Fragment> : part));
}

/** A Segmented option label that truncates (with a tooltip) instead of overflowing its cell. */
export const segLabel = (label: string) => (
  <span className="min-w-0 truncate" title={label}>
    {label}
  </span>
);

export type Rows = Array<[string, string]>;

export const rowsOf = (data?: Record<string, string>): Rows => Object.entries(data ?? {});
export const dataOf = (rows: Rows): Record<string, string> | undefined => {
  const out = Object.fromEntries(rows.filter(([k]) => k.trim()).map(([k, v]) => [k.trim(), v]));
  return Object.keys(out).length ? out : undefined;
};

/** Editable key/value list. */
export function KeyValueEditor({ rows, onChange }: { rows: Rows; onChange: (rows: Rows) => void }) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex gap-1.5">
          <input className={cn(inputCls, 'w-[38%] font-mono text-[12px]')} value={k} placeholder={t('automation.kv.keyPlaceholder')} onChange={(e) => onChange(rows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
          <input className={inputCls} value={v} placeholder={t('automation.kv.valuePlaceholder')} onChange={(e) => onChange(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
          <button className="rounded-lg px-2 text-subtle hover:bg-hover hover:text-danger" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={t('automation.kv.remove')}>
            <Trash className="size-3.5" />
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...rows, ['', '']])} className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12px] text-accent hover:bg-accent-soft">
        <Plus className="size-3.5" /> {t('automation.kv.add')}
      </button>
    </div>
  );
}
