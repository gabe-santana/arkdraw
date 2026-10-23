import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatShortcut } from '@/lib/platform';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-line bg-panel-2 px-1 font-sans text-[10.5px] font-medium text-muted shadow-[0_1px_0_var(--line)]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Renders "Mod+Shift+Z" as a row of keycaps. */
export function Shortcut({ combo, className }: { combo: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {formatShortcut(combo).map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </span>
  );
}
