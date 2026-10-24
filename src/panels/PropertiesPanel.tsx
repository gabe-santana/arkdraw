import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Bold, BringToFront, ChevronsDown, ChevronsUp, CornerDownRight, Group, Italic, Lock, LockOpen, Minus,
  Play, Pause, SendToBack, TextAlignCenter, TextAlignEnd, TextAlignStart, Ungroup, ArrowUpToLine,
  ArrowDownToLine, FoldVertical, ListOrdered, Sparkles,
} from 'lucide-react';
import type {
  ConnectorAnimation, ConnectorElement, DiagramElement, ElementStyle, FontFamily, ShapeAnimation, ShapeElement,
} from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { PALETTE } from '@/model/defaults';
import { FontPicker, TranslationsSection } from './TextSection';
import { getShapeDef } from '@/shapes/registry';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { ACTION_MAP, runAction } from '@/app/actions';
import { togglePlayback } from '@/app/playback';
import { ColorField, NumberField, Segmented, Select, Slider, Switch } from '@/ui/controls';
import { IconButton } from '@/ui/Button';
import { Row, Section, begin, common, end, richText, segLabel } from './sections';
import { useT } from '@/i18n';
import { actionLabel } from '@/i18n/catalog';
import { UNIT_PER_PX } from '@/canvas/paper';
import { ConnectorLabelsSection, ConnectorRouteSection, ConnectorSection } from './ConnectorSection';
import { ConnectionPointsSection } from './ConnectionPointsDialog';
import { DataSection, EffectsSection, PageSection, TextExtras, TransformSection } from './PropertiesExtras';
import { ImageSection } from './ImageSection';
import { ArrangeExtras, AspectLockToggle, BehaviorSection, FreehandSection, TableSection, sizePatch } from './BehaviorSection';
import { ShapeParamsSection } from './ShapeParamsSection';
import { DarkColorsSection, GridExtras, ShadowOptions, StylePresetsSection } from './StyleSection';

export function PropertiesPanel() {
  const selected = useEditor(useShallow((s) => s.selection.map((id) => s.doc.elements[id]).filter(Boolean)));
  const shapes = selected.filter(isShape);
  const connectors = selected.filter(isConnector);
  const t = useT();

  return (
    <aside aria-label={t('panels.formatPanel')} className="animate-slide-up pointer-events-auto flex min-h-0 max-h-full w-full flex-col overflow-hidden rounded-2xl bg-panel shadow-panel">
      <Header selected={selected} />
      <div className="scroll-thin flex-1 overflow-y-auto pb-2">
        {!selected.length && <PageSection />}
        {!selected.length && <CanvasSettings />}
        {shapes.length === 1 && <Geometry shape={shapes[0]} />}
        {selected.length === 1 && shapes[0]?.table && <TableSection el={shapes[0]} />}
        {selected.length === 1 && shapes[0]?.kind === 'freehand' && <FreehandSection el={shapes[0]} />}
        {selected.length === 1 && shapes[0]?.kind === 'image' && <ImageSection el={shapes[0]} />}
        {shapes.length > 0 && <TransformSection els={shapes} />}
        {shapes.length > 0 && <ShapeParamsSection els={shapes} />}
        {selected.length > 1 && <Arrange multi={shapes.length} />}
        {connectors.length > 0 && <ConnectorSection connectors={connectors} />}
        {connectors.length > 0 && <ConnectorRouteSection connectors={connectors} />}
        {connectors.length === 1 && !shapes.length && <ConnectorLabelsSection conn={connectors[0]} />}
        {shapes.length === 1 && !connectors.length && <ConnectionPointsSection shape={shapes[0]} />}
        {selected.length > 0 && <StylePresetsSection els={selected} />}
        {shapes.length > 0 && <FillStroke els={shapes} />}
        {connectors.length > 0 && !shapes.length && <StrokeOnly els={connectors} />}
        {shapes.length > 0 && <EffectsSection els={shapes} />}
        {selected.length > 0 && <TextProps els={selected} />}
        {selected.length > 0 && <TextExtras els={selected} />}
        {selected.length > 0 && <Appearance els={selected} />}
        {selected.length > 0 && <DarkColorsSection els={selected} />}
        {selected.length === 1 && <DataSection el={selected[0]} />}
        {selected.length === 1 && <TranslationsSection el={selected[0]} />}
        {selected.length > 0 && <AnimationProps els={selected} />}
        {selected.length === 1 && <Arrange multi={0} />}
        {selected.length > 0 && <BehaviorSection key={selected.map((e) => e.id).join()} els={selected} />}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function Header({ selected }: { selected: DiagramElement[] }) {
  const t = useT();
  let title = t('panels.header.canvas');
  let sub = t('panels.header.nothingSelected');
  if (selected.length === 1) {
    const el = selected[0];
    title = el.name || (isShape(el) ? (el.kind === 'icon' ? el.text || t('panels.header.icon') : getShapeDef(el.kind).label) : t('common.connector'));
    sub = isShape(el) ? (el.kind === 'icon' ? (el.icon?.split('/')[0].toUpperCase() ?? t('panels.header.icon')) : t('common.shape')) : t('common.connector');
  } else if (selected.length > 1) {
    title = t('panels.header.elements', { count: selected.length });
    const s = selected.filter(isShape).length;
    const c = selected.length - s;
    sub = [s && t('common.shapeCount', { count: s }), c && t('panels.header.connectorCount', { count: c })].filter(Boolean).join(' · ');
  }
  return (
    <div data-dock-handle className="flex items-center gap-2 px-3 pb-2 pt-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-fg">{title}</div>
        <div className="truncate text-[11.5px] text-subtle">{sub}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function CanvasSettings() {
  const settings = useEditor((s) => s.settings);
  const update = useEditor((s) => s.updateSettings);
  const count = useEditor((s) => s.doc.order.length);
  const theme = useUi((s) => s.theme);
  const setUi = useUi((s) => s.set);
  const t = useT();
  return (
    <>
      <Section title={t('panels.canvas.theme')}>
        <Segmented
          value={theme}
          onChange={(theme) => setUi({ theme })}
          options={[
            { value: 'light', label: segLabel(t('panels.canvas.themeLight')), title: t('panels.canvas.themeLight') },
            { value: 'dark', label: segLabel(t('panels.canvas.themeDark')), title: t('panels.canvas.themeDark') },
            { value: 'system', label: segLabel(t('common.auto')), title: t('common.auto') },
          ]}
        />
        <Switch label={t('panels.canvas.adaptColors')} checked={settings.adaptColors} onChange={(v) => update({ adaptColors: v })} />
      </Section>
      <Section title={t('panels.canvas.title')}>
        <Switch label={t('panels.canvas.showGrid')} checked={settings.grid} onChange={(v) => update({ grid: v })} />
        <Switch label={t('panels.canvas.snapToGrid')} checked={settings.snap} onChange={(v) => update({ snap: v })} />
        <Switch label={t('panels.canvas.smartGuides')} checked={settings.guides} onChange={(v) => update({ guides: v })} />
        <Row label={t('panels.canvas.gridSize')}>
          <NumberField label="#" value={settings.gridSize} min={2} max={100} onChange={(v) => update({ gridSize: Math.round(v) })} suffix="px" />
        </Row>
        <GridExtras />
      </Section>
      <Section title={t('panels.tips.title')}>
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-muted">
          <li>{richText(t('panels.tips.connect'), { dot: <span className="text-accent">{t('panels.tips.blueDot')}</span> })}</li>
          {/* Key names are not translated. */}
          <li>{richText(t('panels.tips.duplicate'), { key: <b className="text-fg">{'Ctrl'}</b> })}</li>
          <li>{richText(t('panels.tips.palette'), { key: <b className="text-fg">{'Ctrl K'}</b> })}</li>
        </ul>
        <div className="pt-1 text-[11px] text-subtle">{t('panels.canvas.elementCount', { count })}</div>
      </Section>
    </>
  );
}

function Geometry({ shape }: { shape: ShapeElement }) {
  const units = useUi((s) => s.units);
  const t = useT();
  const k = UNIT_PER_PX[units];
  const precision = units === 'px' ? 0 : units === 'pt' ? 1 : 2;
  const suffix = units === 'px' ? undefined : units;
  const update = (patch: Partial<ShapeElement>) => useEditor.getState().updateElements({ [shape.id]: patch });
  const field = (label: string, key: 'x' | 'y' | 'w' | 'h', min?: number) => (
    <NumberField
      label={label}
      value={shape[key] * k}
      min={min !== undefined ? min * k : undefined}
      step={units === 'px' ? 1 : units === 'pt' ? 0.5 : 0.01}
      precision={precision}
      suffix={suffix}
      onChange={(v) => update(sizePatch(shape, key, v / k))}
      onScrubStart={begin}
      onCommit={end}
    />
  );
  return (
    <Section title={t('common.position')} action={<AspectLockToggle shape={shape} />}>
      <div className="grid grid-cols-2 gap-1.5">
        {field('X', 'x')}
        {field('Y', 'y')}
        {field(t('panels.abbr.width'), 'w', 4)}
        {field(t('panels.abbr.height'), 'h', 4)}
      </div>
    </Section>
  );
}

function useStyleSetter(els: DiagramElement[]) {
  return (patch: Partial<ElementStyle>) => useEditor.getState().updateStyle(els.map((e) => e.id), patch);
}

function FillStroke({ els }: { els: ShapeElement[] }) {
  const set = useStyleSetter(els);
  const st = (k: keyof ElementStyle) => common(els.map((e) => e.style[k]));
  const rounded = els.some((e) => getShapeDef(e.kind).rounded);
  const t = useT();
  return (
    <>
      <Section title={t('panels.fill')}>
        <ColorField label={t('panels.fillColor')} value={st('fill') as string | null} onChange={(fill) => set({ fill })} swatches={PALETTE.fills} allowNone />
        <Switch label={t('panels.dropShadow')} checked={!!st('shadow')} onChange={(shadow) => set({ shadow })} />
        {!!st('shadow') && <ShadowOptions els={els} />}
      </Section>
      <StrokeGroup els={els} rounded={rounded} />
    </>
  );
}

function StrokeOnly({ els }: { els: ConnectorElement[] }) {
  return <StrokeGroup els={els} rounded={false} />;
}

function StrokeGroup({ els, rounded }: { els: DiagramElement[]; rounded: boolean }) {
  const set = useStyleSetter(els);
  const st = (k: keyof ElementStyle) => common(els.map((e) => e.style[k]));
  const t = useT();
  return (
    <Section title={t('panels.stroke')}>
      <ColorField label={t('panels.strokeColor')} value={st('stroke') as string | null} onChange={(stroke) => set({ stroke })} swatches={PALETTE.strokes} allowNone />
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField label={<Minus />} value={st('strokeWidth') as number | null} min={0} max={20} step={0.5} precision={1} onChange={(strokeWidth) => set({ strokeWidth })} onScrubStart={begin} onCommit={end} />
        {rounded ? (
          <NumberField label={<CornerDownRight />} value={st('radius') as number | null} min={0} max={200} onChange={(radius) => set({ radius })} onScrubStart={begin} onCommit={end} />
        ) : (
          <div />
        )}
      </div>
      <Segmented
        size="sm"
        value={st('strokeStyle') as ElementStyle['strokeStyle'] | null}
        onChange={(strokeStyle) => set({ strokeStyle })}
        options={[
          { value: 'solid', label: <svg width="28" height="6"><line x1="1" y1="3" x2="27" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>, title: t('panels.stroke.solid') },
          { value: 'dashed', label: <svg width="28" height="6"><line x1="1" y1="3" x2="27" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" /></svg>, title: t('panels.stroke.dashed') },
          { value: 'dotted', label: <svg width="28" height="6"><line x1="2" y1="3" x2="27" y2="3" stroke="currentColor" strokeWidth="2.2" strokeDasharray="0 5" strokeLinecap="round" /></svg>, title: t('panels.stroke.dotted') },
        ]}
      />
    </Section>
  );
}

function TextProps({ els }: { els: DiagramElement[] }) {
  const set = useStyleSetter(els);
  const st = (k: keyof ElementStyle) => common(els.map((e) => e.style[k]));
  const t = useT();
  return (
    <Section title={t('common.text')}>
      <div className="grid grid-cols-[1fr_76px] gap-1.5">
        <FontPicker value={st('fontFamily') as FontFamily | null} onChange={(fontFamily) => set({ fontFamily })} />
        <NumberField label="Aa" value={st('fontSize') as number | null} min={6} max={200} onChange={(fontSize) => set({ fontSize })} onScrubStart={begin} onCommit={end} />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-lg bg-panel-2 p-0.5">
          <ToggleIcon active={!!st('bold')} label={t('panels.text.bold')} onClick={() => set({ bold: !st('bold') })}>
            <Bold />
          </ToggleIcon>
          <ToggleIcon active={!!st('italic')} label={t('panels.text.italic')} onClick={() => set({ italic: !st('italic') })}>
            <Italic />
          </ToggleIcon>
        </div>
        <Segmented
          className="flex-1"
          size="sm"
          value={st('textAlign') as ElementStyle['textAlign'] | null}
          onChange={(textAlign) => set({ textAlign })}
          options={[
            { value: 'left', label: <TextAlignStart />, title: t('panels.alignLeft') },
            { value: 'center', label: <TextAlignCenter />, title: t('panels.alignCenter') },
            { value: 'right', label: <TextAlignEnd />, title: t('panels.alignRight') },
          ]}
        />
      </div>
      {els.some(isShape) && (
        <Segmented
          size="sm"
          value={st('verticalAlign') as ElementStyle['verticalAlign'] | null}
          onChange={(verticalAlign) => set({ verticalAlign })}
          options={[
            { value: 'top', label: <ArrowUpToLine />, title: t('panels.text.top') },
            { value: 'middle', label: <FoldVertical />, title: t('panels.text.middle') },
            { value: 'bottom', label: <ArrowDownToLine />, title: t('panels.text.bottom') },
          ]}
        />
      )}
      <ColorField label={t('panels.text.color')} value={st('textColor') as string | null} onChange={(textColor) => set({ textColor })} swatches={PALETTE.strokes} />
    </Section>
  );
}

function ToggleIcon({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn('flex size-6 items-center justify-center rounded-md transition-colors [&_svg]:size-3.5', active ? 'bg-panel text-fg shadow-[0_0_0_1px_var(--line)]' : 'text-muted hover:text-fg')}
    >
      {children}
    </button>
  );
}

function Appearance({ els }: { els: DiagramElement[] }) {
  const set = useStyleSetter(els);
  const opacity = common(els.map((e) => e.style.opacity)) ?? 1;
  const t = useT();
  return (
    <Section title={t('common.opacity')} action={<span className="text-[11.5px] tabular-nums text-muted">{Math.round(opacity * 100)}%</span>}>
      <Slider value={Math.round(opacity * 100)} min={5} max={100} onChange={(v) => set({ opacity: v / 100 })} onStart={begin} onCommit={end} />
    </Section>
  );
}

function AnimationProps({ els }: { els: DiagramElement[] }) {
  const playing = useEditor((s) => s.playing);
  const t = useT();
  const conns = els.filter(isConnector);
  const shapes = els.filter(isShape);
  const s = useEditor.getState;
  const setAnim = (patch: Partial<ConnectorAnimation> | Partial<ShapeAnimation>, targets: DiagramElement[]) =>
    s().updateElements(
      Object.fromEntries(
        targets.map((e) => [e.id, { animation: { kind: 'none', speed: 1, ...e.animation, ...patch } as ConnectorAnimation & ShapeAnimation }]),
      ),
    );
  const connKind = common(conns.map((c) => c.animation?.kind ?? 'none'));
  const shapeKind = common(shapes.map((c) => c.animation?.kind ?? 'none'));
  const speed = common(els.map((e) => e.animation?.speed ?? 1)) ?? 1;
  const reveal = common(els.map((e) => e.reveal ?? 0));
  const anyAnim = els.some((e) => e.animation && e.animation.kind !== 'none');

  return (
    <Section
      title={t('panels.animation.title')}
      action={
        <button
          onClick={togglePlayback}
          className={cn('flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition-colors', playing ? 'bg-accent text-accent-fg' : 'text-accent hover:bg-accent-soft')}
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />} {playing ? t('panels.animation.pause') : t('panels.animation.preview')}
        </button>
      }
    >
      {conns.length > 0 && (
        <Select
          value={connKind as ConnectorAnimation['kind'] | null}
          onChange={(kind) => setAnim({ kind }, conns)}
          options={[
            { value: 'none', label: t('panels.animation.none') },
            { value: 'flow', label: t('panels.animation.flow') },
            { value: 'dots', label: t('panels.animation.dots') },
            { value: 'pulse', label: t('panels.animation.pulse') },
          ]}
        />
      )}
      {shapes.length > 0 && (
        <Select
          value={shapeKind as ShapeAnimation['kind'] | null}
          onChange={(kind) => setAnim({ kind }, shapes)}
          options={[
            { value: 'none', label: t('panels.animation.noEmphasis') },
            { value: 'pulse', label: t('panels.animation.pulse') },
            { value: 'glow', label: t('panels.animation.glow') },
            { value: 'bounce', label: t('panels.animation.bounce') },
          ]}
        />
      )}
      {anyAnim && (
        <Row label={t('panels.animation.speed')}>
          <div className="flex items-center gap-2">
            <Slider value={speed} min={0.25} max={4} step={0.25} onChange={(v) => setAnim({ speed: v }, els)} onStart={begin} onCommit={end} />
            <span className="w-8 text-right text-[11.5px] tabular-nums text-muted">{speed}×</span>
          </div>
        </Row>
      )}
      {conns.some((c) => c.animation && c.animation.kind !== 'none' && c.animation.kind !== 'pulse') && (
        <Switch label={t('panels.animation.reverse')} checked={!!common(conns.map((c) => !!c.animation?.reverse))} onChange={(reverse) => setAnim({ reverse }, conns)} />
      )}
      <Row label={t('panels.animation.step')}>
        <NumberField
          label={<ListOrdered />}
          value={reveal}
          min={0}
          max={99}
          onChange={(v) => s().updateElements(Object.fromEntries(els.map((e) => [e.id, { reveal: Math.round(v) || undefined }])))}
        />
      </Row>
      {els.length > 1 && (
        <button
          onClick={() => s().updateElements(Object.fromEntries(s().selection.map((id, i) => [id, { reveal: i + 1 }])))}
          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[12px] text-muted hover:bg-hover hover:text-fg"
        >
          <Sparkles className="size-3.5" /> {t('panels.animation.revealInOrder')}
        </button>
      )}
      <p className="text-[11px] leading-relaxed text-subtle">{t('panels.animation.hint')}</p>
    </Section>
  );
}

function Arrange({ multi }: { multi: number }) {
  const locked = useEditor((s) => s.selection.some((id) => s.doc.elements[id]?.locked));
  const t = useT();
  return (
    <Section title={multi ? t('panels.arrange.align') : t('panels.arrange.title')}>
      {multi >= 2 && (
        <div className="grid grid-cols-6 gap-0.5 rounded-lg bg-panel-2 p-0.5">
          {(['align.left', 'align.hcenter', 'align.right', 'align.top', 'align.vcenter', 'align.bottom'] as const).map((id) => (
            <ActionIcon key={id} id={id} />
          ))}
        </div>
      )}
      {multi >= 3 && (
        <div className="grid grid-cols-2 gap-1.5">
          <ActionIcon id="distribute.h" />
          <ActionIcon id="distribute.v" />
        </div>
      )}
      <div className="flex items-center gap-0.5">
        <IconButton size="sm" label={t('panels.arrange.sendToBack')} shortcut="Mod+Shift+[" onClick={() => runAction('arrange.back')}><SendToBack /></IconButton>
        <IconButton size="sm" label={t('panels.arrange.sendBackward')} shortcut="Mod+[" onClick={() => runAction('arrange.backward')}><ChevronsDown /></IconButton>
        <IconButton size="sm" label={t('panels.arrange.bringForward')} shortcut="Mod+]" onClick={() => runAction('arrange.forward')}><ChevronsUp /></IconButton>
        <IconButton size="sm" label={t('panels.arrange.bringToFront')} shortcut="Mod+Shift+]" onClick={() => runAction('arrange.front')}><BringToFront /></IconButton>
        <div className="mx-1 h-4 w-px bg-line" />
        {multi >= 2 && <IconButton size="sm" label={t('panels.arrange.group')} shortcut="Mod+G" onClick={() => runAction('arrange.group')}><Group /></IconButton>}
        <IconButton size="sm" label={t('panels.arrange.ungroup')} shortcut="Mod+Shift+U" onClick={() => runAction('arrange.ungroup')}><Ungroup /></IconButton>
        <IconButton size="sm" label={locked ? t('panels.unlock') : t('panels.lock')} shortcut="Mod+L" active={locked} onClick={() => runAction('edit.lock')}>
          {locked ? <Lock /> : <LockOpen />}
        </IconButton>
      </div>
      <ArrangeExtras />
    </Section>
  );
}

function ActionIcon({ id }: { id: string }) {
  const action = ACTION_MAP[id];
  useT(); // re-render on language change
  return (
    <IconButton size="sm" label={actionLabel(action)} shortcut={action.shortcuts?.[0]} onClick={() => runAction(id)} className="w-full">
      {action.icon}
    </IconButton>
  );
}
