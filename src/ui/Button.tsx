import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tooltip } from './Tooltip';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.15),inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-accent-hover active:translate-y-px',
  secondary: 'bg-panel text-fg shadow-[0_0_0_1px_var(--line-strong),0_1px_2px_rgb(0_0_0/0.05)] hover:bg-hover active:bg-active',
  ghost: 'text-fg hover:bg-hover active:bg-active',
  danger: 'bg-danger text-white hover:brightness-110 active:translate-y-px',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[background,transform,box-shadow,filter] duration-150 disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  active?: boolean;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, active, tooltipSide = 'bottom', size = 'md', className, children, ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-lg text-muted transition-[background,color,transform] duration-150 hover:bg-hover hover:text-fg active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-[17px]',
        size === 'sm' ? 'size-7 [&_svg]:size-[15px]' : size === 'lg' ? 'size-9' : 'size-8',
        active && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      {button}
    </Tooltip>
  );
});
