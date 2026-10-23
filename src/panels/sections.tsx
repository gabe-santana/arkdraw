import { Fragment, type ReactNode } from 'react';
import { useEditor } from '@/store/editor';

/** The shared value of a property across the selection, or null if mixed. */
export function common<T>(values: T[]): T | null {
  if (!values.length) return null;
  return values.every((v) => v === values[0]) ? values[0] : null;
}

export const begin = () => useEditor.getState().beginInteraction();
export const end = () => useEditor.getState().endInteraction();

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-t border-line px-3 py-3 first:border-t-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="min-w-0 truncate text-[11.5px] font-semibold text-fg" title={title}>{title}</h3>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-2">
      <span className="min-w-0 truncate text-[12px] text-muted" title={label}>{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Text label for a Segmented option: truncates instead of overflowing (pair it with `title`). */
export const segLabel = (text: string) => <span className="min-w-0 truncate">{text}</span>;

/**
 * A translated sentence whose `{name}` placeholders are React nodes:
 * `richText(t('panels.tips.duplicate'), { key: <b>Ctrl</b> })`.
 */
export function richText(text: string, parts: Record<string, ReactNode>): ReactNode {
  return text.split(/\{(\w+)\}/).map((s, i) => (i % 2 ? <Fragment key={i}>{s in parts ? parts[s] : `{${s}}`}</Fragment> : s));
}
