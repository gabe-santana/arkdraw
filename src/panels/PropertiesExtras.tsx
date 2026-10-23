/**
 * property sections: transform, effects, extended text,
 * data & links, and page settings.
 */
import {
  FlipHorizontal2, FlipVertical2, Image as ImageIcon, Link2, RotateCw, Strikethrough, Underline, X, Database,
} from 'lucide-react';
import type {
  DiagramElement, ElementStyle, GradientDirection, PaperSize, ShapeElement,
} from '@/model/types';
import { PALETTE } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { PAPER_SIZES } from '@/canvas/paper';
import { flipSelection, rotateSelection } from '@/app/commands';
import { ColorField, NumberField, Segmented, Select, Slider, Switch } from '@/ui/controls';
import { Row, Section, begin, common, end, segLabel } from './sections';
import { useT, type MessageKey } from '@/i18n';
import { DiagramLanguageRow, LabelBoxControls, LabelPositionRow } from './TextSection';
import { BackgroundUrlButton, SketchRoughnessRow } from './StyleSection';

const ed = () => useEditor.getState();
const setStyle = (els: DiagramElement[], patch: Partial<ElementStyle>) => ed().updateStyle(els.map((e) => e.id), patch);

function Toggle({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn('flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[12px] transition-colors [&_svg]:size-3.5', active ? 'bg-accent-soft text-accent' : 'bg-panel-2 text-muted hover:text-fg')}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

export function TransformSection({ els }: { els: ShapeElement[] }) {
  const rotation = common(els.map((e) => Math.round(e.rotation ?? 0)));
  const t = useT();
  return (
    <Section title={t('panels.transform.title')}>
      <div className="grid grid-cols-[1fr_auto] gap-1.5">
        <NumberField
          label={<RotateCw />}
          value={rotation}
          min={-360}
          max={360}
          suffix="°"
          onScrubStart={begin}
          onCommit={end}
          onChange={(v) => ed().updateElements(Object.fromEntries(els.map((e) => [e.id, { rotation: ((v % 360) + 360) % 360 || undefined }])))}
        />
        <div className="flex gap-1">
          <button title={t('panels.transform.rotate90')} onClick={() => rotateSelection(90)} className="flex size-7 items-center justify-center rounded-md bg-panel-2 text-muted hover:text-fg">
            <RotateCw className="size-3.5" />
          </button>
          <button title={t('panels.transform.flipH')} onClick={() => flipSelection('h')} className={cn('flex size-7 items-center justify-center rounded-md', els.some((e) => e.flipH) ? 'bg-accent-soft text-accent' : 'bg-panel-2 text-muted hover:text-fg')}>
            <FlipHorizontal2 className="size-3.5" />
          </button>
          <button title={t('panels.transform.flipV')} onClick={() => flipSelection('v')} className={cn('flex size-7 items-center justify-center rounded-md', els.some((e) => e.flipV) ? 'bg-accent-soft text-accent' : 'bg-panel-2 text-muted hover:text-fg')}>
            <FlipVertical2 className="size-3.5" />
          </button>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------

export function EffectsSection({ els }: { els: ShapeElement[] }) {
  const st = <K extends keyof ElementStyle>(k: K) => common(els.map((e) => e.style[k]));
  const gradient = st('gradient');
  const hasGradient = els.some((e) => e.style.gradient);
  const t = useT();
  return (
    <Section title={t('panels.effects.title')}>
      <Switch label={t('panels.effects.gradient')} checked={hasGradient} onChange={(on) => setStyle(els, { gradient: on ? '#c7d2fe' : undefined })} />
      {hasGradient && (
        <div className="grid grid-cols-2 gap-1.5">
          <ColorField label={t('panels.effects.gradientColor')} value={(gradient as string | null) ?? null} onChange={(c) => setStyle(els, { gradient: c })} swatches={PALETTE.fills} />
          <Select<GradientDirection>
            value={(st('gradientDirection') as GradientDirection | null) ?? 'south'}
            onChange={(gradientDirection) => setStyle(els, { gradientDirection })}
            options={[
              { value: 'south', label: t('panels.effects.down') },
              { value: 'north', label: t('panels.effects.up') },
              { value: 'east', label: t('panels.effects.right') },
              { value: 'west', label: t('panels.effects.left') },
              { value: 'radial', label: t('panels.effects.radial') },
            ]}
          />
        </div>
      )}
      <Row label={t('panels.effects.fillAlpha')}>
        <Slider value={Math.round(((st('fillOpacity') as number | null) ?? 1) * 100)} min={0} max={100} onStart={begin} onCommit={end} onChange={(v) => setStyle(els, { fillOpacity: v >= 100 ? undefined : v / 100 })} />
      </Row>
      <Row label={t('panels.effects.strokeAlpha')}>
        <Slider value={Math.round(((st('strokeOpacity') as number | null) ?? 1) * 100)} min={0} max={100} onStart={begin} onCommit={end} onChange={(v) => setStyle(els, { strokeOpacity: v >= 100 ? undefined : v / 100 })} />
      </Row>
      <Switch label={t('panels.sketch')} checked={!!st('sketch')} onChange={(sketch) => setStyle(els, { sketch: sketch || undefined, fontFamily: sketch ? 'hand' : 'sans' })} />
      {!!st('sketch') && (
        <Row label={t('panels.effects.fillStyle')}>
          <Select
            value={(st('sketchFill') as string | null) ?? 'hachure'}
            onChange={(sketchFill) => setStyle(els, { sketchFill: sketchFill as ElementStyle['sketchFill'] })}
            options={SKETCH_FILLS.map(([value, key]) => ({ value, label: t(key) }))}
          />
        </Row>
      )}
      {!!st('sketch') && <SketchRoughnessRow els={els} />}
      <Switch label={t('panels.effects.glass')} checked={!!st('glass')} onChange={(glass) => setStyle(els, { glass: glass || undefined })} />
    </Section>
  );
}

const SKETCH_FILLS: Array<[NonNullable<ElementStyle['sketchFill']>, MessageKey]> = [
  ['hachure', 'panels.sketchFill.hachure'],
  ['solid', 'panels.sketchFill.solid'],
  ['zigzag', 'panels.sketchFill.zigzag'],
  ['cross-hatch', 'panels.sketchFill.crossHatch'],
  ['dots', 'panels.sketchFill.dots'],
  ['dashed', 'panels.sketchFill.dashed'],
  ['zigzag-line', 'panels.sketchFill.zigzagLine'],
];

// ---------------------------------------------------------------------------

export function TextExtras({ els }: { els: DiagramElement[] }) {
  const st = <K extends keyof ElementStyle>(k: K) => common(els.map((e) => e.style[k]));
  const shapes = els.some((e) => e.type === 'shape');
  const t = useT();
  return (
    <Section title={t('panels.label.title')}>
      <div className="flex gap-1">
        <Toggle active={!!st('underline')} label={t('panels.label.underline')} onClick={() => setStyle(els, { underline: !st('underline') || undefined })}>
          <Underline />
        </Toggle>
        <Toggle active={!!st('strike')} label={t('panels.label.strikethrough')} onClick={() => setStyle(els, { strike: !st('strike') || undefined })}>
          <Strikethrough />
        </Toggle>
        {shapes && (
          <Toggle active={!!st('verticalText')} label={t('panels.label.verticalText')} onClick={() => setStyle(els, { verticalText: !st('verticalText') || undefined })}>
            <span className="font-semibold [writing-mode:vertical-rl]">{'Aa' /* type sample */}</span>
          </Toggle>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <Switch label={t('panels.label.formatted')} checked={!!st('richText')} onChange={(richText) => setStyle(els, { richText: richText || undefined })} />
        <Switch label={t('panels.label.math')} checked={!!st('math')} onChange={(math) => setStyle(els, { math: math || undefined })} />
      </div>
      {shapes && (
        <LabelPositionRow els={els} />
      )}
      {shapes && (
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="⇲" value={(st('spacing') as number | null) ?? 0} min={0} max={100} onChange={(spacing) => setStyle(els, { spacing: spacing || undefined })} suffix="px" />
          <Switch label={t('panels.label.wrap')} checked={st('wrap') !== false} onChange={(wrap) => setStyle(els, { wrap: wrap ? undefined : false })} />
        </div>
      )}
      <Row label={t('panels.label.textAlpha')}>
        <Slider value={Math.round(((st('textOpacity') as number | null) ?? 1) * 100)} min={10} max={100} onStart={begin} onCommit={end} onChange={(v) => setStyle(els, { textOpacity: v >= 100 ? undefined : v / 100 })} />
      </Row>
      <Row label={t('panels.label.highlight')}>
        <ColorField label={t('panels.label.background')} value={(st('labelBackground') as string | null) ?? 'none'} onChange={(c) => setStyle(els, { labelBackground: c === 'none' ? undefined : c })} swatches={PALETTE.fills} allowNone />
      </Row>
      <LabelBoxControls els={els} shapes={shapes} />
    </Section>
  );
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

export function DataSection({ el }: { el: DiagramElement }) {
  const pages = useEditor((s) => s.pages);
  const linkPage = el.link?.startsWith('page:') ? pages.find((p) => p.id === el.link!.slice(5)) : null;
  const props = Object.keys(el.data ?? {}).filter((k) => !k.startsWith('__')).length;
  const t = useT();
  return (
    <Section
      title={t('panels.data.title')}
      action={
        <button onClick={() => useUi.getState().set({ editDataId: el.id })} className="flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium text-accent hover:bg-accent-soft">
          <Database className="size-3" /> {t('panels.editEllipsis')}
        </button>
      }
    >
      <input
        key={`t-${el.id}`}
        defaultValue={el.tooltip ?? ''}
        placeholder={t('panels.data.tooltip')}
        onKeyDown={(e) => e.stopPropagation()}
        onBlur={(e) => ed().updateElements({ [el.id]: { tooltip: e.target.value.trim() || undefined } })}
        className="h-7 w-full rounded-md bg-panel-2 px-2 text-[12px] text-fg outline-none ring-1 ring-transparent placeholder:text-subtle hover:ring-line focus:ring-2 focus:ring-accent/40"
      />
      <div className="relative">
        <Link2 className="pointer-events-none absolute left-2 top-1.5 size-3.5 text-subtle" />
        <input
          key={`l-${el.id}`}
          defaultValue={linkPage ? t('panels.data.pageLink', { name: linkPage.name }) : (el.link ?? '')}
          readOnly={!!linkPage}
          placeholder={t('panels.data.linkPlaceholder')}
          onKeyDown={(e) => e.stopPropagation()}
          onBlur={(e) => !linkPage && ed().updateElements({ [el.id]: { link: e.target.value.trim() || undefined } })}
          className="h-7 w-full rounded-md bg-panel-2 pl-7 pr-7 text-[12px] text-fg outline-none ring-1 ring-transparent placeholder:text-subtle hover:ring-line focus:ring-2 focus:ring-accent/40"
        />
        {el.link && (
          <button onClick={() => ed().updateElements({ [el.id]: { link: undefined } })} className="absolute right-1.5 top-1.5 rounded text-subtle hover:text-fg" aria-label={t('panels.data.removeLink')}>
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {(props > 0 || el.tags?.length) && (
        <p className="text-[11px] text-subtle">
          {props > 0 && t('panels.data.propertyCount', { count: props })}
          {props > 0 && el.tags?.length ? ' · ' : ''}
          {el.tags?.length ? el.tags.map((tag) => `#${tag}`).join(' ') : ''}
        </p>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

export function PageSection() {
  const page = useEditor((s) => s.pages.find((p) => p.id === s.activePageId));
  const units = useUi((s) => s.units);
  const t = useT();
  if (!page) return null;
  const st = page.settings;
  const update = useEditor.getState().updatePageSettings;
  const pickBackgroundImage = () => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => update({ backgroundImage: r.result as string, paperW: img.naturalWidth, paperH: img.naturalHeight });
        img.src = r.result as string;
      };
      r.readAsDataURL(f);
    };
    input.click();
  };
  return (
    <Section title={t('panels.page.title', { name: page.name })}>
      <Row label={t('panels.page.background')}>
        <ColorField label={t('panels.page.backgroundColor')} value={st.background ?? 'none'} onChange={(c) => update({ background: c === 'none' ? null : c })} swatches={PALETTE.fills} allowNone />
      </Row>
      <Row label={t('common.image')}>
        <div className="flex gap-1">
          <button onClick={pickBackgroundImage} className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-panel-2 text-[12px] text-muted hover:text-fg">
            <ImageIcon className="size-3.5" /> {st.backgroundImage ? t('panels.page.replaceImage') : t('panels.page.chooseImage')}
          </button>
          <BackgroundUrlButton />
          {st.backgroundImage && (
            <button onClick={() => update({ backgroundImage: undefined })} className="flex size-7 items-center justify-center rounded-md bg-panel-2 text-muted hover:text-danger" aria-label={t('panels.page.removeImage')}>
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </Row>
      <DiagramLanguageRow />
      <Switch label={t('panels.page.pageView')} checked={st.pageView} onChange={(pageView) => update({ pageView })} />
      {st.pageView && (
        <>
          <Row label={t('panels.page.paper')}>
            <Select<PaperSize>
              value={st.paper}
              onChange={(paper) => update({ paper })}
              options={[...Object.entries(PAPER_SIZES).map(([k, v]) => ({ value: k as PaperSize, label: v.label })), { value: 'Custom' as PaperSize, label: t('common.custom') }]}
            />
          </Row>
          {st.paper === 'Custom' && (
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField label={t('panels.abbr.width')} value={st.paperW ?? 800} min={50} onChange={(paperW) => update({ paperW })} suffix="px" />
              <NumberField label={t('panels.abbr.height')} value={st.paperH ?? 600} min={50} onChange={(paperH) => update({ paperH })} suffix="px" />
            </div>
          )}
          <Segmented
            value={st.landscape ? 'landscape' : 'portrait'}
            onChange={(v) => update({ landscape: v === 'landscape' })}
            options={[
              { value: 'portrait', label: segLabel(t('panels.page.portrait')), title: t('panels.page.portrait') },
              { value: 'landscape', label: segLabel(t('panels.page.landscape')), title: t('panels.page.landscape') },
            ]}
          />
        </>
      )}
      <Switch label={t('panels.page.shadowAll')} checked={!!st.shadow} onChange={(shadow) => update({ shadow: shadow || undefined })} />
      <Row label={t('panels.page.units')}>
        <Select
          value={units}
          onChange={(u) => useUi.getState().set({ units: u })}
          options={[
            { value: 'px', label: t('menu.units.px') },
            { value: 'pt', label: t('menu.units.pt') },
            { value: 'in', label: t('menu.units.in') },
            { value: 'mm', label: t('menu.units.mm') },
            { value: 'm', label: t('menu.units.m') },
          ]}
        />
      </Row>
    </Section>
  );
}
