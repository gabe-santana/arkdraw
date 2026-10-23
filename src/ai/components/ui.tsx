/**
 * Small, self-contained UI primitives for the AI feature (kept local so the
 * feature doesn't depend on in-flux core UI files). Visual language matches
 * the app: 13px Inter, rounded-lg, subtle rings, quick transitions.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Laptop, LoaderCircle, Plug } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ProviderId } from '../providers';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.15),inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-accent-hover active:translate-y-px',
  secondary: 'bg-panel text-fg shadow-[0_0_0_1px_var(--line-strong),0_1px_2px_rgb(0_0_0/0.05)] hover:bg-hover active:bg-active',
  ghost: 'text-fg hover:bg-hover active:bg-active',
  danger: 'text-danger hover:bg-danger/10 active:bg-danger/15',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  loading?: boolean;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[background,transform,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[14px]',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
}

export const IconBtn = forwardRef<HTMLButtonElement, IconBtnProps>(function IconBtn({ label, size = 'md', className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg text-muted transition-[background,color,transform] duration-150 hover:bg-hover hover:text-fg active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35',
        size === 'sm' ? 'size-7 [&_svg]:size-[15px]' : 'size-8 [&_svg]:size-[17px]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/** Monogram / glyph identifying a provider (no vendor logos bundled). */
export function ProviderMark({ provider, size = 28, className }: { provider: ProviderId; size?: number; className?: string }) {
  const base = 'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold text-white';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.46) };
  switch (provider) {
    case 'anthropic':
      return <span className={cn(base, 'bg-[#cc785c]', className)} style={style}>A</span>;
    case 'openai':
      return <span className={cn(base, 'bg-[#10a37f]', className)} style={style}>O</span>;
    case 'gemini':
      return <span className={cn(base, 'bg-gradient-to-br from-[#4285f4] to-[#9b72cb]', className)} style={style}>G</span>;
    case 'ollama':
      return (
        <span className={cn(base, 'bg-fg text-panel', className)} style={style}>
          <Laptop style={{ width: size * 0.55, height: size * 0.55 }} />
        </span>
      );
    default:
      return (
        <span className={cn(base, 'bg-muted', className)} style={style}>
          <Plug style={{ width: size * 0.55, height: size * 0.55 }} />
        </span>
      );
  }
}

export const inputClass =
  'h-8 w-full rounded-lg bg-panel-2 px-2.5 text-[12.5px] text-fg outline-none ring-1 ring-line transition-[box-shadow,background] placeholder:text-subtle hover:ring-line-strong focus:bg-panel focus:ring-2 focus:ring-accent/40';

/** Keeps typing inside the AI UI from triggering canvas shortcuts. */
export const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
