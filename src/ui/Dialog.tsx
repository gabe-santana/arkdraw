import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Vertical position: centered, or high on screen (command palette). */
  placement?: 'center' | 'top';
  labelledBy?: string;
}

/** Modal with a blurred backdrop, focus trap-lite and Esc to close. */
export function Dialog({ open, onClose, children, className, placement = 'center', labelledBy }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const first = ref.current?.querySelector<HTMLElement>('[autofocus], input, button, [tabindex]');
      (first ?? ref.current)?.focus();
    }, 10);
    return () => {
      clearTimeout(t);
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div
      className={cn('animate-fade fixed inset-0 z-[80] flex justify-center bg-black/25 backdrop-blur-[2px] dark:bg-black/50', placement === 'center' ? 'items-center' : 'items-start pt-[14vh]')}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
    >
      <div ref={ref} role="dialog" aria-modal aria-labelledby={labelledBy} tabIndex={-1} className={cn('animate-pop rounded-2xl bg-panel shadow-pop outline-none', className)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({ title, subtitle, onClose, id }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; id?: string }) {
  return (
    <div className="flex items-start gap-3 px-5 pb-3 pt-4">
      <div className="flex-1">
        <h2 id={id} className="text-[15px] font-semibold tracking-tight text-fg">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      <button onClick={onClose} aria-label="Close" className="-mr-1.5 rounded-lg p-1.5 text-subtle transition-colors hover:bg-hover hover:text-fg">
        <X className="size-4" />
      </button>
    </div>
  );
}
