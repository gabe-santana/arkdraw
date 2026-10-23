/**
 * Form controls for panels and dialogs, tuned for a dense, calm UI.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDismiss } from './Menu';
import { usePreferences } from '@/app/preferences';

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function SearchInput({
  value, onChange, placeholder, autoFocus, className, onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
  /** Keys still reach this (e.g. list navigation) — they don't bubble past the input. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={cn('group relative flex items-center', className)}>
      <Search className="pointer-events-none absolute left-2.5 size-[14px] text-subtle transition-colors group-focus-within:text-accent" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          onKeyDown?.(e);
          if (e.key === 'Escape' && !e.defaultPrevented) onChange('');
        }}
        placeholder={placeholder}
        spellCheck={false}
        className="h-8 w-full rounded-lg bg-panel-2 pl-8 pr-7 text-[12.5px] text-fg outline-none ring-1 ring-transparent transition-[box-shadow,background] placeholder:text-subtle hover:ring-line focus:bg-panel focus:ring-2 focus:ring-accent/40"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-1.5 rounded p-0.5 text-subtle hover:bg-hover hover:text-fg" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number field with drag-to-scrub label (Figma-style)
// ---------------------------------------------------------------------------

interface NumberFieldProps {
  label: ReactNode;
  value: number | null;
  onChange: (v: number) => void;
  /** Called once when a scrub gesture ends (for history coalescing). */
  onCommit?: () => void;
  onScrubStart?: () => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  precision?: number;
  className?: string;
}

export function NumberField({
  label, value, onChange, onCommit, onScrubStart, min = -Infinity, max = Infinity, step = 1, suffix, precision = 0, className,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const fmt = (v: number | null) => (v === null ? '' : (Math.round(v * 10 ** precision) / 10 ** precision).toString());
  const clampV = (v: number) => Math.min(max, Math.max(min, v));

  const scrub = (e: React.PointerEvent) => {
    if (value === null) return;
    e.preventDefault();
    const startX = e.clientX;
    const startV = value;
    onScrubStart?.();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'ew-resize';
    const move = (ev: PointerEvent) => {
      const k = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
      onChange(clampV(startV + Math.round(((ev.clientX - startX) / 2) * k) * step));
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      onCommit?.();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };

  const commitDraft = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (Number.isFinite(v)) onChange(clampV(v));
    setDraft(null);
  };

  return (
    <label
      className={cn(
        'group flex h-7 min-w-0 items-center rounded-md bg-panel-2 text-[12px] ring-1 ring-transparent transition-shadow hover:ring-line focus-within:bg-panel focus-within:ring-2 focus-within:ring-accent/40',
        className,
      )}
    >
      <span onPointerDown={scrub} className="flex h-full w-7 shrink-0 cursor-ew-resize select-none items-center justify-center text-[11px] text-subtle group-hover:text-muted [&_svg]:size-3.5">
        {label}
      </span>
      <input
        value={draft ?? fmt(value)}
        placeholder={value === null ? 'Mixed' : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            onChange(clampV((value ?? 0) + d));
          }
        }}
        className="h-full w-full min-w-0 bg-transparent pr-1 tabular-nums text-fg outline-none placeholder:text-subtle"
      />
      {suffix && <span className="pr-2 text-[11px] text-subtle">{suffix}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Segmented control with a sliding indicator
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  value, options, onChange, className, size = 'md',
}: {
  value: T | null;
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const idx = options.findIndex((o) => o.value === value);
  return (
    <div className={cn('relative grid rounded-lg bg-panel-2 p-0.5', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {idx >= 0 && (
        <div
          className="absolute bottom-0.5 top-0.5 rounded-md bg-panel shadow-[0_0_0_1px_var(--line),0_1px_3px_rgb(0_0_0/0.08)] transition-[left] duration-200 ease-out"
          style={{ left: `calc(${(idx / options.length) * 100}% + 2px)`, width: `calc(${100 / options.length}% - 4px)` }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-[1] flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors [&_svg]:size-[15px]',
            size === 'sm' ? 'h-6 text-[11.5px]' : 'h-7 text-[12px]',
            o.value === value ? 'text-fg' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

export function Slider({
  value, min, max, step = 1, onChange, onCommit, onStart,
}: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onCommit?: () => void; onStart?: () => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onPointerDown={onStart}
      onPointerUp={onCommit}
      onKeyUp={onCommit}
      onChange={(e) => onChange(Number(e.target.value))}
      className="od-slider h-4 w-full cursor-pointer appearance-none bg-transparent"
      style={{ '--pct': `${pct}%` } as React.CSSProperties}
    />
  );
}

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 py-1 text-[12.5px] text-fg"
    >
      {label && <span className="text-muted group-hover:text-fg">{label}</span>}
      <span className={cn('relative h-[18px] w-[30px] shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-line-strong')}>
        <span
          className={cn(
            'absolute top-[2px] size-[14px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-[left] duration-200 ease-[cubic-bezier(.3,1.4,.6,1)]',
            checked ? 'left-[14px]' : 'left-[2px]',
          )}
        />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Select (custom popover — native selects look out of place)
// ---------------------------------------------------------------------------

export function Select<T extends string>({
  value, options, onChange, className, renderValue,
}: {
  value: T | null;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (v: T) => void;
  className?: string;
  renderValue?: (v: T | null) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useDismiss(open, () => setOpen(false), ref);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <button
        ref={ref}
        onClick={() => {
          setRect(ref.current!.getBoundingClientRect());
          setOpen((o) => !o);
        }}
        className={cn(
          'flex h-7 w-full items-center gap-2 rounded-md bg-panel-2 pl-2.5 pr-1.5 text-left text-[12px] text-fg ring-1 ring-transparent transition-shadow hover:ring-line',
          open && 'ring-2 ring-accent/40',
          className,
        )}
      >
        {current?.icon && <span className="text-muted [&_svg]:size-3.5">{current.icon}</span>}
        <span className="flex-1 truncate">{renderValue ? renderValue(value) : (current?.label ?? 'Mixed')}</span>
        <ChevronDown className={cn('size-3.5 text-subtle transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            role="menu"
            className="animate-pop scroll-thin fixed z-[95] max-h-[320px] overflow-auto rounded-xl bg-panel p-1 shadow-pop"
            style={{ left: rect.left, top: rect.bottom + 4, minWidth: rect.width }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn('flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-[12.5px] hover:bg-hover', o.value === value ? 'text-fg' : 'text-muted hover:text-fg')}
              >
                <span className="flex w-4 justify-center text-muted [&_svg]:size-3.5">{o.icon}</span>
                <span className="flex-1">{o.label}</span>
                {o.value === value && <Check className="size-3.5 text-accent" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Color picker: curated swatches + native picker + hex input
// ---------------------------------------------------------------------------

export function ColorField({
  value, onChange, swatches, allowNone, label,
}: { value: string | null; onChange: (v: string) => void; swatches: string[]; allowNone?: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [hex, setHex] = useState(value ?? '');
  const custom = usePreferences((s) => s.customColors);
  const recent = usePreferences((s) => s.recentColors);
  useDismiss(open, () => setOpen(false), ref);
  useEffect(() => setHex(value ?? ''), [value]);
  const pick = (c: string) => {
    onChange(c);
    usePreferences.getState().useColor(c);
  };

  const isNone = value === 'none';
  return (
    <>
      <button
        ref={ref}
        aria-label={label}
        onClick={() => {
          setRect(ref.current!.getBoundingClientRect());
          setOpen((o) => !o);
        }}
        className={cn(
          'flex h-7 w-full items-center gap-2 rounded-md bg-panel-2 pl-1 pr-2 text-[12px] ring-1 ring-transparent transition-shadow hover:ring-line',
          open && 'ring-2 ring-accent/40',
        )}
      >
        <Swatch color={value} />
        <span className="flex-1 truncate text-left font-mono text-[11.5px] uppercase text-fg">{value === null ? 'Mixed' : isNone ? 'None' : value}</span>
      </button>
      {open &&
        rect &&
        createPortal(
          <div role="menu" className="animate-pop fixed z-[95] w-[232px] rounded-xl bg-panel p-3 shadow-pop" style={{ left: Math.min(rect.left, window.innerWidth - 244), top: rect.bottom + 6 }}>
            <div className="grid grid-cols-6 gap-1.5">
              {swatches.map((c) => (
                <button
                  key={c}
                  onClick={() => pick(c)}
                  className={cn('relative size-[30px] rounded-lg transition-transform hover:scale-110 active:scale-95', value?.toLowerCase() === c.toLowerCase() && 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--panel)]')}
                  style={{ background: c, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.08)' }}
                  aria-label={c}
                />
              ))}
            </div>
            {[['Custom', custom], ['Recent', recent]].map(([title, list]) =>
              (list as string[]).length ? (
                <div key={title as string} className="mt-2.5">
                  <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-subtle">{title as string}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(list as string[]).map((c) => (
                      <button key={c} onClick={() => pick(c)} className="size-[22px] rounded-md transition-transform hover:scale-110" style={{ background: c, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.08)' }} aria-label={c} />
                    ))}
                  </div>
                </div>
              ) : null,
            )}
            <div className="mt-3 flex items-center gap-2">
              <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-line" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
                <input type="color" value={value && value.startsWith('#') && value.length === 7 ? value : '#000000'} onChange={(e) => pick(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <input
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && /^#?[0-9a-f]{3,8}$/i.test(hex)) onChange(hex.startsWith('#') ? hex : `#${hex}`);
                }}
                onBlur={() => /^#?[0-9a-f]{3,8}$/i.test(hex) && onChange(hex.startsWith('#') ? hex : `#${hex}`)}
                className="h-7 min-w-0 flex-1 rounded-md bg-panel-2 px-2 font-mono text-[12px] uppercase text-fg outline-none focus:ring-2 focus:ring-accent/40"
                spellCheck={false}
              />
              {allowNone && (
                <button onClick={() => onChange('none')} className={cn('h-7 rounded-md px-2 text-[12px] text-muted hover:bg-hover hover:text-fg', isNone && 'bg-accent-soft text-accent')}>
                  None
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function Swatch({ color, size = 20 }: { color: string | null; size?: number }) {
  const none = color === 'none' || color === null;
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-[5px]"
      style={{
        width: size,
        height: size,
        background: none ? 'var(--panel)' : color!,
        boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.1)',
      }}
    >
      {none && <span className="absolute left-1/2 top-[-20%] h-[140%] w-px -translate-x-1/2 rotate-45 bg-danger" />}
    </span>
  );
}
