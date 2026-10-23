import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Bold, BringToFront, ChevronsDown, ChevronsUp, CornerDownRight, Group, Italic, Lock, LockOpen, Minus,
  MoveVertical, Play, Pause, SendToBack, TextAlignCenter, TextAlignEnd, TextAlignStart, Ungroup, ArrowUpToLine,
  ArrowDownToLine, FoldVertical, ListOrdered, Sparkles,
} from 'lucide-react';
import type {
  ArrowHead, ConnectorAnimation, ConnectorElement, DiagramElement, ElementStyle, FontKey, ShapeAnimation, ShapeElement,
} from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { FONT_LABELS, PALETTE } from '@/model/defaults';
import { getShapeDef } from '@/shapes/registry';
import { ARROW_LABELS, arrowParts } from '@/lib/connectorGeometry';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';
import { ACTION_MAP, runAction } from '@/app/actions';
import { togglePlayback } from '@/app/playback';
import { ColorField, NumberField, Segmented, Select, Slider, Switch } from '@/ui/controls';
import { IconButton } from '@/ui/Button';
import { Row, Section, begin, common, end } from './sections';
import { UNIT_PER_PX } from '@/canvas/paper';
import { ConnectorExtras, DataSection, EffectsSection, PageSection, TextExtras, TransformSection } from './PropertiesExtras';
import { ImageSection } from './ImageSection';

export function PropertiesPanel() {
  const selected = useEditor(useShallow((s) => s.selection.map((id) => s.doc.elements[id]).filter(Boolean)));
  const shapes = selected.filter(isShape);
  const connectors = selected.filter(isConnector);

  return (
    <aside className="animate-slide-up pointer-events-auto flex min-h-0 max-h-full w-[268px] flex-col overflow-hidden rounded-2xl bg-panel shadow-panel">
      <Header selected={selected} />
      <div className="scroll-thin flex-1 overflow-y-auto pb-2">
        {!selected.length && <PageSection />}
        {!selected.length && <CanvasSettings />}
        {shapes.length === 1 && <Geometry shape={shapes[0]} />}
        {selected.length === 1 && shapes[0]?.kind === 'image' && <ImageSection el={shapes[0]} />}
        {shapes.length > 0 && <TransformSection els={shapes} />}
        {selected.length > 1 && <Arrange multi={shapes.length} />}
        {connectors.length > 0 && <ConnectorProps connectors={connectors} />}
        {connectors.length > 0 && <ConnectorExtras connectors={connectors} />}
        {shapes.length > 0 && <FillStroke els={shapes} />}
        {connectors.length > 0 && !shapes.length && <StrokeOnly els={connectors} />}
        {shapes.length > 0 && <EffectsSection els={shapes} />}
        {selected.length > 0 && <TextProps els={selected} />}
        {selected.length > 0 && <TextExtras els={selected} />}
        {selected.length > 0 && <Appearance els={selected} />}
        {selected.length === 1 && <DataSection el={selected[0]} />}
        {selected.length > 0 && <AnimationProps els={selected} />}
        {selected.length === 1 && <Arrange multi={0} />}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function Header({ selected }: { selected: DiagramElement[] }) {
  let title = 'Canvas';
  let sub = 'Nothing selected';
  if (selected.length === 1) {
    const el = selected[0];
    title = el.name || (isShape(el) ? (el.kind === 'icon' ? el.text || 'Icon' : getShapeDef(el.kind).label) : 'Connector');
    sub = isShape(el) ? (el.kind === 'icon' ? (el.icon?.split('/')[0].toUpperCase() ?? 'Icon') : 'Shape') : 'Connector';
  } else if (selected.length > 1) {
    title = `${selected.length} elements`;
    const s = selected.filter(isShape).length;
    const c = selected.length - s;
    sub = [s && `${s} shape${s > 1 ? 's' : ''}`, c && `${c} connector${c > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
  }
  return (
    <div className="flex items-center gap-2 px-3 pb-2 pt-3">
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
  return (
    <>
      <Section title="Theme">
        <Segmented
          value={theme}
          onChange={(t) => setUi({ theme: t })}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'Auto' },
          ]}
        />
        <Switch label="Adapt diagram colors in dark mode" checked={settings.adaptColors} onChange={(v) => update({ adaptColors: v })} />
      </Section>
      <Section title="Canvas">
        <Switch label="Show grid" checked={settings.grid} onChange={(v) => update({ grid: v })} />
        <Switch label="Snap to grid" checked={settings.snap} onChange={(v) => update({ snap: v })} />
        <Switch label="Smart guides" checked={settings.guides} onChange={(v) => update({ guides: v })} />
        <Row label="Grid size">
          <NumberField label="#" value={settings.gridSize} min={2} max={100} onChange={(v) => update({ gridSize: Math.round(v) })} suffix="px" />
        </Row>
      </Section>
      <Section title="Tips">
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-muted">
          <li>Hover a shape and drag from a <span className="text-accent">blue dot</span> to connect.</li>
          <li>Hold <b className="text-fg">Ctrl</b> while dragging to duplicate.</li>
          <li>Press <b className="text-fg">Ctrl K</b> for every command.</li>
        </ul>
        <div className="pt-1 text-[11px] text-subtle">{count} element{count === 1 ? '' : 's'} on canvas</div>
      </Section>
    </>
  );
}

function Geometry({ shape }: { shape: ShapeElement }) {
  const units = useUi((s) => s.units);
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
      onChange={(v) => update({ [key]: v / k })}
      onScrubStart={begin}
      onCommit={end}
    />
  );
  return (
    <Section title="Position">
      <div className="grid grid-cols-2 gap-1.5">
        {field('X', 'x')}
        {field('Y', 'y')}
        {field('W', 'w', 4)}
        {field('H', 'h', 4)}
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
  return (
    <>
      <Section title="Fill">
        <ColorField label="Fill color" value={st('fill') as string | null} onChange={(fill) => set({ fill })} swatches={PALETTE.fills} allowNone />
        <Switch label="Drop shadow" checked={!!st('shadow')} onChange={(shadow) => set({ shadow })} />
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
  return (
    <Section title="Stroke">
      <ColorField label="Stroke color" value={st('stroke') as string | null} onChange={(stroke) => set({ stroke })} swatches={PALETTE.strokes} allowNone />
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
          { value: 'solid', label: <svg width="28" height="6"><line x1="1" y1="3" x2="27" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>, title: 'Solid' },
          { value: 'dashed', label: <svg width="28" height="6"><line x1="1" y1="3" x2="27" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" /></svg>, title: 'Dashed' },
          { value: 'dotted', label: <svg width="28" height="6"><line x1="2" y1="3" x2="27" y2="3" stroke="currentColor" strokeWidth="2.2" strokeDasharray="0 5" strokeLinecap="round" /></svg>, title: 'Dotted' },
        ]}
      />
    </Section>
  );
}

function TextProps({ els }: { els: DiagramElement[] }) {
  const set = useStyleSetter(els);
  const st = (k: keyof ElementStyle) => common(els.map((e) => e.style[k]));
  return (
    <Section title="Text">
      <div className="grid grid-cols-[1fr_76px] gap-1.5">
        <Select<FontKey>
          value={st('fontFamily') as FontKey | null}
          onChange={(fontFamily) => set({ fontFamily })}
          options={(Object.keys(FONT_LABELS) as FontKey[]).map((k) => ({ value: k, label: FONT_LABELS[k] }))}
        />
        <NumberField label="Aa" value={st('fontSize') as number | null} min={6} max={200} onChange={(fontSize) => set({ fontSize })} onScrubStart={begin} onCommit={end} />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-lg bg-panel-2 p-0.5">
          <ToggleIcon active={!!st('bold')} label="Bold" onClick={() => set({ bold: !st('bold') })}>
            <Bold />
          </ToggleIcon>
          <ToggleIcon active={!!st('italic')} label="Italic" onClick={() => set({ italic: !st('italic') })}>
            <Italic />
          </ToggleIcon>
        </div>
        <Segmented
          className="flex-1"
          size="sm"
          value={st('textAlign') as ElementStyle['textAlign'] | null}
          onChange={(textAlign) => set({ textAlign })}
          options={[
            { value: 'left', label: <TextAlignStart />, title: 'Align left' },
            { value: 'center', label: <TextAlignCenter />, title: 'Align center' },
            { value: 'right', label: <TextAlignEnd />, title: 'Align right' },
          ]}
        />
      </div>
      {els.some(isShape) && (
        <Segmented
          size="sm"
          value={st('verticalAlign') as ElementStyle['verticalAlign'] | null}
          onChange={(verticalAlign) => set({ verticalAlign })}
          options={[
            { value: 'top', label: <ArrowUpToLine />, title: 'Top' },
            { value: 'middle', label: <FoldVertical />, title: 'Middle' },
            { value: 'bottom', label: <ArrowDownToLine />, title: 'Bottom' },
          ]}
        />
      )}
      <ColorField label="Text color" value={st('textColor') as string | null} onChange={(textColor) => set({ textColor })} swatches={PALETTE.strokes} />
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
  return (
    <Section title="Opacity" action={<span className="text-[11.5px] tabular-nums text-muted">{Math.round(opacity * 100)}%</span>}>
      <Slider value={Math.round(opacity * 100)} min={5} max={100} onChange={(v) => set({ opacity: v / 100 })} onStart={begin} onCommit={end} />
    </Section>
  );
}

const ARROW_OPTIONS: ArrowHead[] = ['none', 'arrow', 'triangle', 'triangleOpen', 'diamond', 'diamondOpen', 'circle', 'circleOpen', 'erOne', 'erOnlyOne', 'erMany', 'erOneMany', 'erZeroMany', 'erZeroOne'];

function ArrowGlyph({ kind, flip }: { kind: ArrowHead; flip?: boolean }) {
  const parts = arrowParts(kind, { x: 26, y: 7 }, { x: 1, y: 0 }, 1.25);
  return (
    <svg width="30" height="14" viewBox="0 0 30 14" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <line x1="2" y1="7" x2="26" y2="7" stroke="currentColor" strokeWidth="1.25" />
      {parts.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill === 'solid' ? 'currentColor' : p.fill === 'paper' ? 'var(--panel)' : 'none'} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function ConnectorProps({ connectors }: { connectors: ConnectorElement[] }) {
  const update = (patch: Partial<ConnectorElement>) =>
    useEditor.getState().updateElements(Object.fromEntries(connectors.map((c) => [c.id, patch])));
  const start = common(connectors.map((c) => c.startArrow));
  const endA = common(connectors.map((c) => c.endArrow));
  const arrowOpts = (flip: boolean) => ARROW_OPTIONS.map((a) => ({ value: a, label: ARROW_LABELS[a], icon: <ArrowGlyph kind={a} flip={flip} /> }));
  return (
    <Section title="Connector">
      <Row label="Start">
        <Select value={start} onChange={(startArrow) => update({ startArrow })} options={arrowOpts(true)} renderValue={(v) => (v ? <span className="flex items-center gap-2"><ArrowGlyph kind={v} flip />{ARROW_LABELS[v]}</span> : 'Mixed')} />
      </Row>
      <Row label="End">
        <Select value={endA} onChange={(endArrow) => update({ endArrow })} options={arrowOpts(false)} renderValue={(v) => (v ? <span className="flex items-center gap-2"><ArrowGlyph kind={v} />{ARROW_LABELS[v]}</span> : 'Mixed')} />
      </Row>
      <button
        onClick={() =>
          useEditor.getState().updateElements(Object.fromEntries(connectors.map((c) => [c.id, { source: c.target, target: c.source }])))
        }
        className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[12px] text-muted hover:bg-hover hover:text-fg"
      >
        <MoveVertical className="size-3.5 rotate-90" /> Swap direction
      </button>
    </Section>
  );
}

function AnimationProps({ els }: { els: DiagramElement[] }) {
  const playing = useEditor((s) => s.playing);
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
      title="Animation"
      action={
        <button
          onClick={togglePlayback}
          className={cn('flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition-colors', playing ? 'bg-accent text-accent-fg' : 'text-accent hover:bg-accent-soft')}
        >
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />} {playing ? 'Pause' : 'Preview'}
        </button>
      }
    >
      {conns.length > 0 && (
        <Select
          value={connKind as ConnectorAnimation['kind'] | null}
          onChange={(kind) => setAnim({ kind }, conns)}
          options={[
            { value: 'none', label: 'No animation' },
            { value: 'flow', label: 'Flow (marching dashes)' },
            { value: 'dots', label: 'Travelling dots' },
            { value: 'pulse', label: 'Pulse' },
          ]}
        />
      )}
      {shapes.length > 0 && (
        <Select
          value={shapeKind as ShapeAnimation['kind'] | null}
          onChange={(kind) => setAnim({ kind }, shapes)}
          options={[
            { value: 'none', label: 'No emphasis' },
            { value: 'pulse', label: 'Pulse' },
            { value: 'glow', label: 'Glow' },
            { value: 'bounce', label: 'Bounce' },
          ]}
        />
      )}
      {anyAnim && (
        <Row label="Speed">
          <div className="flex items-center gap-2">
            <Slider value={speed} min={0.25} max={4} step={0.25} onChange={(v) => setAnim({ speed: v }, els)} onStart={begin} onCommit={end} />
            <span className="w-8 text-right text-[11.5px] tabular-nums text-muted">{speed}×</span>
          </div>
        </Row>
      )}
      {conns.some((c) => c.animation && c.animation.kind !== 'none' && c.animation.kind !== 'pulse') && (
        <Switch label="Reverse direction" checked={!!common(conns.map((c) => !!c.animation?.reverse))} onChange={(reverse) => setAnim({ reverse }, conns)} />
      )}
      <Row label="Step">
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
          <Sparkles className="size-3.5" /> Reveal in selection order
        </button>
      )}
      <p className="text-[11px] leading-relaxed text-subtle">Step 0 = always visible. Export as GIF from File → Export.</p>
    </Section>
  );
}

function Arrange({ multi }: { multi: number }) {
  const locked = useEditor((s) => s.selection.some((id) => s.doc.elements[id]?.locked));
  return (
    <Section title={multi ? 'Align' : 'Arrange'}>
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
        <IconButton size="sm" label="Send to back" shortcut="Mod+Shift+[" onClick={() => runAction('arrange.back')}><SendToBack /></IconButton>
        <IconButton size="sm" label="Send backward" shortcut="Mod+[" onClick={() => runAction('arrange.backward')}><ChevronsDown /></IconButton>
        <IconButton size="sm" label="Bring forward" shortcut="Mod+]" onClick={() => runAction('arrange.forward')}><ChevronsUp /></IconButton>
        <IconButton size="sm" label="Bring to front" shortcut="Mod+Shift+]" onClick={() => runAction('arrange.front')}><BringToFront /></IconButton>
        <div className="mx-1 h-4 w-px bg-line" />
        {multi >= 2 && <IconButton size="sm" label="Group" shortcut="Mod+G" onClick={() => runAction('arrange.group')}><Group /></IconButton>}
        <IconButton size="sm" label="Ungroup" shortcut="Mod+Shift+U" onClick={() => runAction('arrange.ungroup')}><Ungroup /></IconButton>
        <IconButton size="sm" label={locked ? 'Unlock' : 'Lock'} shortcut="Mod+L" active={locked} onClick={() => runAction('edit.lock')}>
          {locked ? <Lock /> : <LockOpen />}
        </IconButton>
      </div>
    </Section>
  );
}

function ActionIcon({ id }: { id: string }) {
  const action = ACTION_MAP[id];
  return (
    <IconButton size="sm" label={action.label} shortcut={action.shortcuts?.[0]} onClick={() => runAction(id)} className="w-full">
      {action.icon}
    </IconButton>
  );
}
