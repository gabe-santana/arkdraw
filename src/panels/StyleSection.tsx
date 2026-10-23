/**
 * Styling sections of the Format panel: quick style presets (with the user's
 * default style), shadow options, sketch roughness, user-defined dark-mode
 * colors, and the canvas grid color / scrollbars / background-image-by-URL
 * controls. Logic lives in src/styling/*.
 */
import { useEffect, useState } from 'react';
import { ChevronRight, Link2 } from 'lucide-react';
import type { DiagramElement, ElementStyle } from '@/model/types';
import { PALETTE, getUserDefaultStyle, onUserDefaultStyleChange } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { runAction } from '@/app/actions';
import { ColorField, NumberField, Slider, Switch } from '@/ui/controls';
import { STYLE_PRESETS, matchesPreset, presetLabel } from '@/styling/presets';
import { SHADOW_DEFAULTS } from '@/styling/shadow';
import { applyPreset, backgroundImageFromUrl } from '@/styling/commands';
import { Row, Section, begin, common, end } from './sections';
import { useT, type MessageKey } from '@/i18n';

const ed = () => useEditor.getState();
const setStyle = (els: DiagramElement[], patch: Partial<ElementStyle>) => ed().updateStyle(els.map((e) => e.id), patch);

function PresetSwatch({ fill, stroke, textColor, label, active, onClick }: { fill: string; stroke: string; textColor: string; label: string; active?: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button
      title={label}
      aria-label={t('panels.style.presetAria', { name: label })}
      aria-pressed={active}
      onClick={onClick}
      className={cn('flex aspect-[4/3] items-center justify-center rounded-md transition-shadow hover:ring-2 hover:ring-accent/50', active && 'ring-2 ring-accent')}
    >
      <svg viewBox="0 0 36 27" className="size-full">
        <rect
          x={2}
          y={2}
          width={32}
          height={23}
          rx={4}
          fill={fill === 'none' ? 'transparent' : fill}
          stroke={stroke === 'none' ? 'transparent' : stroke}
          strokeWidth={1.5}
        />
        <text x={18} y={17.5} textAnchor="middle" fontSize={10} fontWeight={600} fill={textColor} fontFamily="Inter Variable, system-ui, sans-serif">
          {'Aa' /* type sample */}
        </text>
      </svg>
    </button>
  );
}

function useUserDefault() {
  const [style, setStyleState] = useState(getUserDefaultStyle);
  useEffect(() => onUserDefaultStyleChange(() => setStyleState(getUserDefaultStyle())), []);
  return style;
}

/** mxGraph's style palette: one click recolors the selection. */
export function StylePresetsSection({ els }: { els: DiagramElement[] }) {
  const userDefault = useUserDefault();
  const shapesOnly = els.length === 1 && els[0].type === 'shape';
  const hasDefault = !!(userDefault.fill || userDefault.stroke || userDefault.textColor);
  const def = { fill: userDefault.fill ?? '#ffffff', stroke: userDefault.stroke ?? '#1e293b', textColor: userDefault.textColor ?? '#0f172a' };
  const t = useT();
  return (
    <Section
      title={t('panels.style.title')}
      action={
        shapesOnly ? (
          <button onClick={() => runAction('edit.defaultStyle')} className="flex h-6 min-w-0 items-center rounded-md px-2 text-[11.5px] font-medium text-accent hover:bg-accent-soft" title={t('panels.style.setDefaultHint')}>
            <span className="truncate">{t('panels.style.setDefault')}</span>
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-6 gap-1">
        {hasDefault && <PresetSwatch {...def} label={t('panels.style.myDefault')} active={els.every((e) => matchesPreset(e, def))} onClick={() => applyPreset(def, els.map((e) => e.id))} />}
        {STYLE_PRESETS.slice(0, hasDefault ? 11 : 12).map((p) => (
          <PresetSwatch key={p.id} {...p} label={presetLabel(p)} active={els.every((e) => matchesPreset(e, p))} onClick={() => applyPreset(p, els.map((e) => e.id))} />
        ))}
      </div>
    </Section>
  );
}

/** Shadow color / blur / offset / opacity, under the "Drop shadow" switch. */
export function ShadowOptions({ els }: { els: DiagramElement[] }) {
  const st = <K extends keyof ElementStyle>(k: K) => common(els.map((e) => e.style[k]));
  const num = (k: 'shadowBlur' | 'shadowOffsetX' | 'shadowOffsetY', d: number) => (st(k) as number | null | undefined) ?? (common(els.map((e) => e.style[k] === undefined)) ? d : null);
  const opacity = (st('shadowOpacity') as number | null | undefined) ?? SHADOW_DEFAULTS.opacity;
  const custom = els.some((e) => e.style.shadowColor !== undefined || e.style.shadowBlur !== undefined || e.style.shadowOffsetX !== undefined || e.style.shadowOffsetY !== undefined || e.style.shadowOpacity !== undefined);
  const t = useT();
  return (
    <Disclosure label={t('panels.shadow.options')} defaultOpen={custom}>
      <Row label={t('common.color')}>
        <ColorField label={t('panels.shadow.color')} value={(st('shadowColor') as string | null | undefined) ?? SHADOW_DEFAULTS.color} onChange={(shadowColor) => setStyle(els, { shadowColor })} swatches={PALETTE.strokes} />
      </Row>
      <div className="grid grid-cols-3 gap-1.5">
        <NumberField label="X" value={num('shadowOffsetX', SHADOW_DEFAULTS.offsetX)} min={-50} max={50} onChange={(shadowOffsetX) => setStyle(els, { shadowOffsetX })} onScrubStart={begin} onCommit={end} />
        <NumberField label="Y" value={num('shadowOffsetY', SHADOW_DEFAULTS.offsetY)} min={-50} max={50} onChange={(shadowOffsetY) => setStyle(els, { shadowOffsetY })} onScrubStart={begin} onCommit={end} />
        <NumberField label={t('panels.shadow.blur')} value={num('shadowBlur', SHADOW_DEFAULTS.blur)} min={0} max={50} onChange={(shadowBlur) => setStyle(els, { shadowBlur })} onScrubStart={begin} onCommit={end} />
      </div>
      <Row label={t('common.opacity')}>
        <Slider value={Math.round(opacity * 100)} min={0} max={100} onStart={begin} onCommit={end} onChange={(v) => setStyle(els, { shadowOpacity: v / 100 })} />
      </Row>
      {custom && (
        <button
          onClick={() => setStyle(els, { shadowColor: undefined, shadowBlur: undefined, shadowOffsetX: undefined, shadowOffsetY: undefined, shadowOpacity: undefined })}
          className="flex h-6 w-full items-center justify-center rounded-md text-[11.5px] text-muted hover:bg-hover hover:text-fg"
        >
          {t('panels.shadow.reset')}
        </button>
      )}
    </Disclosure>
  );
}

/** Sketch roughness (shown with the sketch fill style). */
export function SketchRoughnessRow({ els }: { els: DiagramElement[] }) {
  const r = common(els.map((e) => e.style.sketchRoughness ?? 1.15)) ?? 1.15;
  const t = useT();
  return (
    <Row label={t('panels.sketch.roughness')}>
      <Slider value={Math.round(r * 10)} min={0} max={40} onStart={begin} onCommit={end} onChange={(v) => setStyle(els, { sketchRoughness: v === 12 ? undefined : v / 10 })} />
    </Row>
  );
}

/** User-defined dark-mode colors (used when "Adapt diagram colors in dark mode" is on). */
export function DarkColorsSection({ els }: { els: DiagramElement[] }) {
  const st = <K extends keyof ElementStyle>(k: K) => common(els.map((e) => e.style[k]));
  const adapt = useEditor((s) => s.settings.adaptColors);
  const any = els.some((e) => e.style.darkFill || e.style.darkStroke || e.style.darkText);
  const shapes = els.some((e) => e.type === 'shape');
  const t = useT();
  const field = (key: 'darkFill' | 'darkStroke' | 'darkText', label: MessageKey, aria: MessageKey, swatches: string[]) => (
    <Row label={t(label)}>
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <ColorField label={t(aria)} value={(st(key) as string | null | undefined) ?? 'none'} onChange={(c) => setStyle(els, { [key]: c === 'none' ? undefined : c })} swatches={swatches} allowNone />
        </div>
      </div>
    </Row>
  );
  return (
    <Section title={t('panels.dark.title')}>
      <Disclosure label={t('panels.dark.custom')} defaultOpen={any}>
        {shapes && field('darkFill', 'panels.dark.fill', 'panels.dark.fillAria', DARK_FILLS)}
        {field('darkStroke', 'panels.dark.line', 'panels.dark.lineAria', DARK_LINES)}
        {field('darkText', 'panels.dark.text', 'panels.dark.textAria', DARK_LINES)}
        <p className="text-[11px] leading-relaxed text-subtle">
          {adapt ? t('panels.dark.hintOn') : t('panels.dark.hintOff')}
        </p>
      </Disclosure>
    </Section>
  );
}

const DARK_FILLS = ['#0f172a', '#1e293b', '#312e81', '#134e4a', '#14532d', '#422006', '#4c0519', '#3b0764', '#1e3a8a', '#27272a', '#000000', '#18181b'];
const DARK_LINES = ['#f8fafc', '#cbd5e1', '#94a3b8', '#a5b4fc', '#5eead4', '#86efac', '#fcd34d', '#fda4af', '#d8b4fe', '#93c5fd', '#ffffff', '#e4e4e7'];

function Disclosure({ label, defaultOpen, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <button aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-6 w-full items-center gap-1 text-[12px] text-muted hover:text-fg">
        <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
        {label}
      </button>
      {open && <div className="mt-1.5 space-y-2">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Canvas / page
// ---------------------------------------------------------------------------

const GRID_COLORS = ['#cbd5e1', '#94a3b8', '#64748b', '#a5b4fc', '#93c5fd', '#86efac', '#fcd34d', '#fda4af', '#e2e8f0', '#475569', '#1e293b', '#d4d4d8'];

/** Grid color + scrollbars, under the grid size in the Canvas section. */
export function GridExtras() {
  const gridColor = useEditor((s) => s.settings.gridColor);
  const scrollbars = useEditor((s) => !!s.settings.scrollbars);
  const update = useEditor((s) => s.updateSettings);
  const t = useT();
  return (
    <>
      <Row label={t('panels.grid.color')}>
        <ColorField label={t('panels.grid.color')} value={gridColor ?? 'none'} onChange={(c) => update({ gridColor: c === 'none' ? undefined : c })} swatches={GRID_COLORS} allowNone />
      </Row>
      <Switch label={t('panels.grid.scrollbars')} checked={scrollbars} onChange={(v) => update({ scrollbars: v })} />
      <p className="text-[11px] leading-relaxed text-subtle">{t('panels.grid.hint')}</p>
    </>
  );
}

/** "URL…" next to the background image picker. */
export function BackgroundUrlButton() {
  const t = useT();
  return (
    <button onClick={() => void backgroundImageFromUrl()} title={t('panels.bgUrl.title')} aria-label={t('panels.bgUrl.title')} className="flex h-7 items-center justify-center gap-1 rounded-md bg-panel-2 px-2 text-[12px] text-muted hover:text-fg">
      <Link2 className="size-3.5" /> {t('panels.bgUrl.button')}
    </button>
  );
}
