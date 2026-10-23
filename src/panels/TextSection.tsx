/**
 * Text & label controls for the Format panel: font picker (built-in stacks,
 * Google Fonts, system fonts, any installed font by name), 3×3 label
 * position picker, writing direction, per-side spacing, label border colour,
 * translated labels and the diagram language.
 */
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Languages, Plus, X } from 'lucide-react';
import type { DiagramElement, ElementStyle, FontFamily, FontKey, LabelPosition, TextDirection } from '@/model/types';
import { FONT_LABELS, PALETTE } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { useDismiss } from '@/ui/Menu';
import { ColorField, NumberField, Segmented, Select } from '@/ui/controls';
import { cleanFontName, fontLabel, fontStack, GOOGLE_FONTS, isFontKey, SYSTEM_FONTS } from '@/text/fonts';
import { LABEL_GRID, LABEL_POSITION_NAMES } from '@/text/labelLayout';
import { docLangs, labelKey, LANGUAGES, languageName, translationLangs } from '@/text/translations';
import { Row, Section, begin, common, end, segLabel } from './sections';
import { tx, useT } from '@/i18n';

/** A label position's display name ("Top left"…). */
const positionName = (p: LabelPosition) => tx(`panels.labelPos.${p}`, LABEL_POSITION_NAMES[p]);

const ed = () => useEditor.getState();
const setStyle = (els: DiagramElement[], patch: Partial<ElementStyle>) => ed().updateStyle(els.map((e) => e.id), patch);

// ---------------------------------------------------------------------------
// Font picker
// ---------------------------------------------------------------------------

export function FontPicker({ value, onChange }: { value: FontFamily | null; onChange: (f: FontFamily) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const t = useT();
  useDismiss(open, () => setOpen(false), ref);
  const q = query.trim().toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const pick = (f: FontFamily) => {
    onChange(f);
    setOpen(false);
    setQuery('');
  };
  const custom = cleanFontName(query);
  const known = (Object.keys(FONT_LABELS) as FontKey[]).some((k) => FONT_LABELS[k].toLowerCase() === q) || GOOGLE_FONTS.some((g) => g.name.toLowerCase() === q) || SYSTEM_FONTS.some((s) => s.toLowerCase() === q);
  const item = (f: FontFamily, label: string, hint?: string, preview = true) => (
    <button
      key={f}
      onClick={() => pick(f)}
      className={cn('flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-[12.5px] hover:bg-hover', f === value ? 'text-fg' : 'text-muted hover:text-fg')}
    >
      <span className="flex-1 truncate" style={preview ? { fontFamily: fontStack(f) } : undefined}>
        {label}
      </span>
      {hint && <span className="text-[10.5px] text-subtle">{hint}</span>}
      {f === value && <Check className="size-3.5 text-accent" />}
    </button>
  );
  const builtins = (Object.keys(FONT_LABELS) as FontKey[]).filter((k) => match(FONT_LABELS[k]));
  const google = GOOGLE_FONTS.filter((g) => match(g.name));
  const system = SYSTEM_FONTS.filter(match);
  const heading = (label: string) => <div className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-subtle">{label}</div>;
  return (
    <>
      <button
        ref={ref}
        aria-label={t('panels.font.aria')}
        onClick={() => {
          setRect(ref.current!.getBoundingClientRect());
          setOpen((o) => !o);
        }}
        className={cn('flex h-7 w-full items-center gap-2 rounded-md bg-panel-2 pl-2.5 pr-1.5 text-left text-[12px] text-fg ring-1 ring-transparent transition-shadow hover:ring-line', open && 'ring-2 ring-accent/40')}
      >
        <span className="flex-1 truncate" style={value ? { fontFamily: fontStack(value) } : undefined}>
          {value === null ? t('panels.mixed') : fontLabel(value)}
        </span>
        <ChevronDown className={cn('size-3.5 text-subtle transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div role="menu" className="animate-pop fixed z-[95] flex max-h-[360px] w-[232px] flex-col rounded-xl bg-panel p-1 shadow-pop" style={{ left: Math.min(rect.left, window.innerWidth - 244), top: rect.bottom + 4 }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && custom) pick(custom);
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder={t('panels.font.searchPlaceholder')}
              className="mx-1 mt-1 h-7 rounded-md bg-panel-2 px-2 text-[12px] text-fg outline-none ring-1 ring-transparent focus:ring-accent/40"
            />
            <div className="scroll-thin min-h-0 flex-1 overflow-auto pb-1">
              {custom && !known && (
                <>
                  {heading(t('panels.font.custom'))}
                  {item(custom, t('panels.font.useCustom', { name: custom }), t('panels.font.installed'))}
                </>
              )}
              {builtins.length > 0 && heading(t('panels.font.builtIn'))}
              {builtins.map((k) => item(k, FONT_LABELS[k]))}
              {google.length > 0 && heading('Google Fonts')}
              {google.map((g) => item(g.name, g.name, g.category === 'sans-serif' ? 'sans' : g.category, false))}
              {system.length > 0 && heading(t('panels.font.system'))}
              {system.map((s) => item(s, s))}
              {!isFontKey(value ?? 'sans') && value && !GOOGLE_FONTS.some((g) => g.name === value) && !SYSTEM_FONTS.includes(value) && match(value) && (
                <>
                  {heading(t('panels.font.current'))}
                  {item(value, value)}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Label position (3×3)
// ---------------------------------------------------------------------------

export function LabelPositionGrid({ value, onChange }: { value: LabelPosition | null; onChange: (p: LabelPosition) => void }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t('panels.labelPos.aria')} className="grid w-[66px] grid-cols-3 gap-0.5 rounded-lg bg-panel-2 p-0.5">
      {LABEL_GRID.map((p) => (
        <button
          key={p}
          role="radio"
          aria-checked={p === value}
          title={positionName(p)}
          aria-label={positionName(p)}
          onClick={() => onChange(p)}
          className={cn('flex size-5 items-center justify-center rounded-[5px] transition-colors', p === value ? 'bg-panel shadow-[0_0_0_1px_var(--line)]' : 'hover:bg-hover')}
        >
          <span className={cn('rounded-full transition-colors', p === 'inside' ? 'size-2 rounded-[2px] border border-current' : 'size-1.5 bg-current', p === value ? 'text-accent' : 'text-subtle')} />
        </button>
      ))}
    </div>
  );
}

/** Position picker row for the Label section. */
export function LabelPositionRow({ els }: { els: DiagramElement[] }) {
  const value = common(els.map((e) => e.style.labelPosition ?? 'inside'));
  const t = useT();
  return (
    <Row label={t('common.position')}>
      <div className="flex items-center gap-2">
        <LabelPositionGrid value={value} onChange={(p) => setStyle(els, { labelPosition: p === 'inside' ? undefined : p })} />
        <span className="min-w-0 truncate text-[11.5px] text-muted">{value ? positionName(value) : t('panels.mixed')}</span>
      </div>
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Direction, per-side spacing, border
// ---------------------------------------------------------------------------

export function LabelBoxControls({ els, shapes }: { els: DiagramElement[]; shapes: boolean }) {
  const st = <K extends keyof ElementStyle>(k: K) => common(els.map((e) => e.style[k]));
  const t = useT();
  const side = (k: 'spacingTop' | 'spacingRight' | 'spacingBottom' | 'spacingLeft', label: string) => (
    <NumberField label={label} value={(st(k) as number | null) ?? 0} min={-100} max={200} onChange={(v) => setStyle(els, { [k]: v || undefined })} onScrubStart={begin} onCommit={end} suffix="px" />
  );
  return (
    <>
      <Row label={t('panels.textDir.title')}>
        <Segmented<TextDirection>
          size="sm"
          value={(st('textDirection') as TextDirection | null) ?? 'ltr'}
          onChange={(d) => setStyle(els, { textDirection: d === 'ltr' ? undefined : d })}
          options={[
            { value: 'ltr', label: 'LTR', title: t('panels.textDir.ltr') },
            { value: 'rtl', label: 'RTL', title: t('panels.textDir.rtl') },
            { value: 'auto', label: segLabel(t('common.auto')), title: t('panels.textDir.auto') },
          ]}
        />
      </Row>
      {shapes && (
        <div className="space-y-1">
          <span className="text-[12px] text-muted">{t('panels.spacing.perSide')}</span>
          <div className="grid grid-cols-2 gap-1.5">
            {side('spacingTop', t('panels.spacing.top'))}
            {side('spacingRight', t('panels.spacing.right'))}
            {side('spacingBottom', t('panels.spacing.bottom'))}
            {side('spacingLeft', t('panels.spacing.left'))}
          </div>
        </div>
      )}
      <Row label={t('panels.label.border')}>
        <ColorField label={t('panels.label.borderColor')} value={(st('labelBorderColor') as string | null) ?? 'none'} onChange={(c) => setStyle(els, { labelBorderColor: c === 'none' ? undefined : c })} swatches={PALETTE.strokes} allowNone />
      </Row>
    </>
  );
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

export function TranslationsSection({ el }: { el: DiagramElement }) {
  const pageLang = useEditor((s) => s.pages.find((p) => p.id === s.activePageId)?.settings.language);
  const langs = translationLangs(el);
  const [adding, setAdding] = useState<string | null>(null);
  const t = useT();
  const setTranslation = (lang: string, text: string | null) => {
    const data = { ...el.data };
    if (text === null) delete data[labelKey(lang)];
    else data[labelKey(lang)] = text;
    ed().updateElements({ [el.id]: { data: Object.keys(data).length ? data : undefined } });
  };
  const available = LANGUAGES.filter((l) => !langs.includes(l.code));
  return (
    <Section
      title={t('panels.translations.title')}
      action={
        available.length > 0 ? (
          <div className="w-[118px]">
            <Select<string>
              value={adding}
              onChange={(code) => {
                setAdding(null);
                setTranslation(code, el.text);
              }}
              renderValue={() => (
                <span className="flex min-w-0 items-center gap-1 text-muted">
                  <Plus className="size-3 shrink-0" /> <span className="truncate">{t('panels.translations.addLanguage')}</span>
                </span>
              )}
              options={available.map((l) => ({ value: l.code, label: `${l.name} (${l.code})` }))}
            />
          </div>
        ) : undefined
      }
    >
      {!langs.length && <p className="text-[11.5px] leading-relaxed text-subtle">{t('panels.translations.hint')}</p>}
      {langs.map((lang) => (
        <div key={lang} className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11.5px]">
            <span className={cn('font-medium', lang === pageLang ? 'text-accent' : 'text-muted')}>{languageName(lang)}</span>
            <span className="text-subtle">{lang}</span>
            <button aria-label={t('panels.translations.remove', { language: languageName(lang) })} onClick={() => setTranslation(lang, null)} className="ml-auto flex size-5 items-center justify-center rounded text-subtle hover:text-danger">
              <X className="size-3" />
            </button>
          </div>
          <textarea
            key={`${el.id}-${lang}-${el.data?.[labelKey(lang)] ?? ''}`}
            defaultValue={el.data?.[labelKey(lang)] ?? ''}
            dir="auto"
            rows={2}
            onBlur={(e) => e.target.value !== (el.data?.[labelKey(lang)] ?? '') && setTranslation(lang, e.target.value)}
            className="w-full resize-y rounded-md bg-panel-2 px-2 py-1.5 text-[12px] text-fg outline-none ring-1 ring-transparent focus:ring-accent/40"
          />
        </div>
      ))}
    </Section>
  );
}

/** Diagram language selector (page settings). */
export function DiagramLanguageRow() {
  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const elements = useEditor((s) => s.doc.elements);
  const used = useMemo(() => docLangs(Object.values(elements)), [elements]);
  const t = useT();
  if (!page) return null;
  const options = [
    { value: '', label: t('panels.language.defaultOption') },
    ...[...new Set([...used, ...LANGUAGES.map((l) => l.code)])].map((code) => ({ value: code, label: `${languageName(code)}${used.includes(code) ? ' •' : ''}` })),
  ];
  return (
    <Row label={t('panels.language.title')}>
      <Select<string>
        value={page.settings.language ?? ''}
        onChange={(language) => ed().updatePageSettings({ language: language || undefined })}
        options={options}
        renderValue={(v) => (
          <span className="flex items-center gap-1.5">
            <Languages className="size-3.5 text-muted" />
            {v ? languageName(v) : t('common.default')}
          </span>
        )}
      />
    </Row>
  );
}
