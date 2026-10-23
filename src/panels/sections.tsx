import type { ReactNode } from 'react';
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
        <h3 className="text-[11.5px] font-semibold text-fg">{title}</h3>
        {action}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-2">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

