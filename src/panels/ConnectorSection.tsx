/**
 * Format panel sections for connectors: style presets, arrowhead pickers
 * (all mxGraph markers, with size and fill), routing / connector shape /
 * line jumps / spacing / sketch, and extra labels.
 */
import { useState } from 'react';
import { MoveVertical, Plus, Spline, Trash2 } from 'lucide-react';
import type { ArrowHead, ConnectorElement, ConnectorShape, LineJumps, Routing } from '@/model/types';
import { ARROW_LABELS, ARROW_ORDER, arrowFillable, arrowFilled, arrowParts } from '@/lib/connectorGeometry';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { clearWaypoints } from '@/app/commands';
import { NumberField, Select, Switch } from '@/ui/controls';
import { addExtraLabel, useExtraLabelEdit } from '@/canvas/ExtraLabelEditor';
import { BAND_DEFAULTS } from '@/canvas/connectorShapes';
import { CONNECTOR_PRESETS, applyConnectorPreset, connectorPresetLabel, type ConnectorPreset } from './connectorPresets';
import { Row, Section, begin, common, end } from './sections';
import { tx, useT, type MessageKey } from '@/i18n';

/** An arrowhead's display name ("Classic", "Open oval"…). */
const arrowName = (a: ArrowHead) => tx(`panels.arrow.${a}`, ARROW_LABELS[a]);

const ed = () => useEditor.getState();
const updateAll = (connectors: ConnectorElement[], patch: Partial<ConnectorElement>) =>
  ed().updateElements(Object.fromEntries(connectors.map((c) => [c.id, patch])));

// ---------------------------------------------------------------------------
// Arrowheads
// ---------------------------------------------------------------------------

export function ArrowGlyph({ kind, flip, fill, w = 30 }: { kind: ArrowHead; flip?: boolean; fill?: boolean; w?: number }) {
  const tip = w - 4;
  const parts = arrowParts(kind, { x: tip, y: 7 }, { x: 1, y: 0 }, 1.25, 4, fill);
  return (
    <svg width={w} height="14" viewBox={`0 0 ${w} 14`} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <line x1="2" y1="7" x2={tip} y2="7" stroke="currentColor" strokeWidth="1.25" />
      {parts.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill === 'solid' ? 'currentColor' : p.fill === 'paper' ? 'var(--panel)' : 'none'} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function ArrowPicker({ value, fill, flip, onPick }: { value: ArrowHead | null; fill?: boolean; flip?: boolean; onPick: (a: ArrowHead) => void }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <div className="min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn('flex h-7 w-full items-center gap-2 rounded-md bg-panel-2 px-2 text-[12px] text-fg ring-1 ring-transparent transition-shadow hover:ring-line', open && 'ring-2 ring-accent/40')}
      >
        {value ? <ArrowGlyph kind={value} flip={flip} fill={fill} /> : null}
        <span className="truncate">{value ? arrowName(value) : t('panels.mixed')}</span>
      </button>
      {open && (
        <div role="listbox" className="mt-1 grid grid-cols-4 gap-0.5 rounded-lg bg-panel-2 p-1">
          {ARROW_ORDER.map((a) => (
            <button
              key={a}
              role="option"
              aria-selected={a === value}
              title={arrowName(a)}
              onClick={() => {
                onPick(a);
                setOpen(false);
              }}
              className={cn('flex h-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel hover:text-fg', a === value && 'bg-accent-soft text-accent')}
            >
              <ArrowGlyph kind={a} flip={flip} w={34} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ArrowEnd({ connectors, which }: { connectors: ConnectorElement[]; which: 'start' | 'end' }) {
  const kindKey = which === 'start' ? 'startArrow' : 'endArrow';
  const sizeKey = which === 'start' ? 'startSize' : 'endSize';
  const fillKey = which === 'start' ? 'startFill' : 'endFill';
  const kind = common(connectors.map((c) => c[kindKey]));
  const size = common(connectors.map((c) => c[sizeKey] ?? 6));
  const filled = kind ? common(connectors.map((c) => arrowFilled(c[kindKey], c[fillKey]))) : null;
  const t = useT();
  return (
    <>
      <Row label={which === 'start' ? t('panels.connector.start') : t('panels.connector.end')}>
        <ArrowPicker value={kind} flip={which === 'start'} fill={filled ?? undefined} onPick={(a) => updateAll(connectors, { [kindKey]: a, [fillKey]: undefined })} />
      </Row>
      {kind && kind !== 'none' && (
        <div className="grid grid-cols-[64px_1fr_auto] items-center gap-2">
          <span />
          <NumberField
            label={t('panels.abbr.size')}
            value={size}
            min={1}
            max={40}
            step={1}
            onScrubStart={begin}
            onCommit={end}
            onChange={(v) => updateAll(connectors, { [sizeKey]: v === 6 ? undefined : v })}
          />
          {arrowFillable(kind) ? (
            <Switch label={t('panels.connector.arrowFill')} checked={!!filled} onChange={(on) => updateAll(connectors, { [fillKey]: on === arrowFilled(kind) ? undefined : on })} />
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

function PresetGlyph({ p }: { p: ConnectorPreset }) {
  const dash = p.strokeStyle === 'dashed' ? '3 2' : undefined;
  const d = p.routing === 'curved' ? 'M3,15 C12,15 14,4 25,4' : p.routing === 'orthogonal' || p.routing === 'entity' ? 'M3,15 H14 V4 H25' : p.routing === 'isometric' ? 'M3,15 L14,9 L25,4' : 'M3,15 L25,4';
  if (p.connectorShape === 'arrow') return (
    <svg width="28" height="19" viewBox="0 0 28 19" aria-hidden>
      <path d="M3,7 H17 V3.5 L25,9.5 L17,15.5 V12 H3 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
  if (p.connectorShape === 'link') return (
    <svg width="28" height="19" viewBox="0 0 28 19" aria-hidden>
      <path d="M3,7.5 H25 M3,11.5 H25" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
  const end = p.routing === 'curved' || p.routing === 'orthogonal' || p.routing === 'entity' ? { x: 25, y: 4, dir: { x: 1, y: 0 } } : { x: 25, y: 4, dir: { x: 0.88, y: -0.47 } };
  const head = arrowParts(p.endArrow, { x: end.x, y: end.y }, end.dir, 1, 2.5);
  const start = arrowParts(p.startArrow, { x: 3, y: 15 }, { x: -1, y: 0 }, 1, 2.5);
  return (
    <svg width="28" height="19" viewBox="0 0 28 19" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray={dash} />
      {[...head, ...start].map((q, i) => (
        <path key={i} d={q.d} fill={q.fill === 'solid' ? 'currentColor' : q.fill === 'paper' ? 'var(--panel)' : 'none'} stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function Presets({ connectors }: { connectors: ConnectorElement[] }) {
  const t = useT();
  return (
    <div className="grid grid-cols-5 gap-0.5 rounded-lg bg-panel-2 p-0.5">
      {CONNECTOR_PRESETS.map((p) => (
        <button
          key={p.id}
          title={connectorPresetLabel(p)}
          aria-label={t('panels.connector.presetAria', { name: connectorPresetLabel(p) })}
          onClick={() => applyConnectorPreset(connectors.map((c) => c.id), p)}
          className="flex h-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel hover:text-fg"
        >
          <PresetGlyph p={p} />
        </button>
      ))}
    </div>
  );
}

/** Presets, arrowheads and direction. */
export function ConnectorSection({ connectors }: { connectors: ConnectorElement[] }) {
  const t = useT();
  return (
    <Section title={t('common.connector')}>
      <Presets connectors={connectors} />
      <ArrowEnd connectors={connectors} which="start" />
      <ArrowEnd connectors={connectors} which="end" />
      <button
        onClick={() => ed().updateElements(Object.fromEntries(connectors.map((c) => [c.id, { source: c.target, target: c.source }])))}
        className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[12px] text-muted hover:bg-hover hover:text-fg"
      >
        <MoveVertical className="size-3.5 rotate-90" /> {t('panels.connector.swap')}
      </button>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Route: routing, connector shape, jumps, spacing, sketch
// ---------------------------------------------------------------------------

const ROUTINGS: Array<{ value: Routing; labelKey: MessageKey }> = [
  { value: 'orthogonal', labelKey: 'panels.route.orthogonal' },
  { value: 'straight', labelKey: 'panels.route.straight' },
  { value: 'curved', labelKey: 'panels.route.curved' },
  { value: 'elbow-h', labelKey: 'panels.route.elbowH' },
  { value: 'elbow-v', labelKey: 'panels.route.elbowV' },
  { value: 'entity', labelKey: 'panels.route.entity' },
  { value: 'isometric', labelKey: 'panels.route.isometric' },
];

const SHAPES: Array<{ value: ConnectorShape; labelKey: MessageKey }> = [
  { value: 'line', labelKey: 'panels.connShape.line' },
  { value: 'link', labelKey: 'panels.connShape.link' },
  { value: 'arrow', labelKey: 'panels.connShape.arrow' },
  { value: 'flexArrow', labelKey: 'panels.connShape.flexArrow' },
  { value: 'pipe', labelKey: 'panels.connShape.pipe' },
  { value: 'wire', labelKey: 'panels.connShape.wire' },
  { value: 'filledEdge', labelKey: 'panels.connShape.filledEdge' },
];

export function ConnectorRouteSection({ connectors }: { connectors: ConnectorElement[] }) {
  const update = (patch: Partial<ConnectorElement>) => updateAll(connectors, patch);
  const routing = common(connectors.map((c) => c.routing));
  const shape = common(connectors.map((c) => c.connectorShape ?? 'line'));
  const jumps = common(connectors.map((c) => c.lineJumps ?? 'none'));
  const banded = shape === 'link' || shape === 'flexArrow' || shape === 'arrow' || shape === 'filledEdge';
  const bandDefault = shape && shape in BAND_DEFAULTS ? BAND_DEFAULTS[shape as keyof typeof BAND_DEFAULTS] : 10;
  const bandWidth = common(connectors.map((c) => c.bandWidth ?? bandDefault));
  const headWidth = common(connectors.map((c) => c.headWidth ?? (c.bandWidth ?? BAND_DEFAULTS.flexArrow) * 2));
  const hasWaypoints = connectors.some((c) => c.waypoints?.length);
  const sketch = common(connectors.map((c) => !!c.style.sketch));
  const t = useT();
  return (
    <Section title={t('panels.route.title')}>
      <Row label={t('panels.route.style')}>
        <Select<Routing> value={routing} onChange={(r) => update({ routing: r, waypoints: undefined })} options={ROUTINGS.map((o) => ({ value: o.value, label: t(o.labelKey) }))} />
      </Row>
      <Row label={t('panels.route.shape')}>
        <Select<ConnectorShape> value={shape} onChange={(connectorShape) => update({ connectorShape: connectorShape === 'line' ? undefined : connectorShape, bandWidth: undefined, headWidth: undefined })} options={SHAPES.map((o) => ({ value: o.value, label: t(o.labelKey) }))} />
      </Row>
      {banded && (
        <div className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
          <span className="min-w-0 truncate text-[12px] text-muted" title={t('common.width')}>{t('common.width')}</span>
          <NumberField label={t('panels.abbr.width')} value={bandWidth} min={1} max={80} onScrubStart={begin} onCommit={end} onChange={(v) => update({ bandWidth: v })} suffix="px" />
          {shape === 'flexArrow' ? (
            <NumberField label={t('panels.abbr.height')} value={headWidth} min={1} max={160} onScrubStart={begin} onCommit={end} onChange={(v) => update({ headWidth: v })} suffix="px" />
          ) : (
            <span />
          )}
        </div>
      )}
      <Row label={t('panels.route.jumps')}>
        <div className="grid grid-cols-[1fr_72px] gap-1.5">
          <Select<LineJumps>
            value={jumps as LineJumps | null}
            onChange={(lineJumps) => update({ lineJumps: lineJumps === 'none' ? undefined : lineJumps })}
            options={[
              { value: 'none', label: t('common.none') },
              { value: 'arc', label: t('panels.jumps.arc') },
              { value: 'gap', label: t('panels.jumps.gap') },
              { value: 'sharp', label: t('panels.jumps.sharp') },
            ]}
          />
          <NumberField
            label={t('panels.abbr.size')}
            value={common(connectors.map((c) => c.jumpSize ?? 6))}
            min={2}
            max={40}
            onScrubStart={begin}
            onCommit={end}
            onChange={(v) => update({ jumpSize: v === 6 ? undefined : v })}
          />
        </div>
      </Row>
      <Row label={t('panels.route.spacing')}>
        <NumberField
          label="↔"
          value={common(connectors.map((c) => c.perimeterSpacing ?? 0))}
          min={0}
          max={100}
          onScrubStart={begin}
          onCommit={end}
          onChange={(v) => update({ perimeterSpacing: v || undefined })}
          suffix="px"
        />
      </Row>
      <Switch
        label={t('panels.sketch')}
        checked={!!sketch}
        onChange={(on) => ed().updateStyle(connectors.map((c) => c.id), { sketch: on || undefined })}
      />
      {hasWaypoints && (
        <button onClick={clearWaypoints} className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[12px] text-muted hover:bg-hover hover:text-fg">
          <Spline className="size-3.5" /> {t('panels.route.clearWaypoints')}
        </button>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Extra labels
// ---------------------------------------------------------------------------

export function ConnectorLabelsSection({ conn }: { conn: ConnectorElement }) {
  const labels = conn.labels ?? [];
  const setLabels = (next: ConnectorElement['labels']) => ed().updateElements({ [conn.id]: { labels: next?.length ? next : undefined } });
  const t = useT();
  return (
    <Section
      title={t('panels.connLabels.title')}
      action={
        <button onClick={() => addExtraLabel(conn.id)} className="flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium text-accent hover:bg-accent-soft">
          <Plus className="size-3" /> {t('common.add')}
        </button>
      }
    >
      {!labels.length && <p className="text-[11px] leading-relaxed text-subtle">{t('panels.connLabels.hint')}</p>}
      {labels.map((l, i) => (
        <div key={l.id ?? i} className="grid grid-cols-[1fr_78px_auto] items-center gap-1.5">
          <input
            key={`${l.id}-${l.text}`}
            defaultValue={l.text}
            aria-label={t('panels.connLabels.textAria', { n: i + 1 })}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            onFocus={() => useExtraLabelEdit.setState({ connId: null, index: -1 })}
            onBlur={(e) => {
              const text = e.target.value;
              if (text !== l.text) setLabels(labels.map((x, k) => (k === i ? { ...x, text } : x)));
            }}
            className="h-7 w-full min-w-0 rounded-md bg-panel-2 px-2 text-[12px] text-fg outline-none ring-1 ring-transparent placeholder:text-subtle hover:ring-line focus:ring-2 focus:ring-accent/40"
          />
          <NumberField
            label="@"
            value={Math.round(l.t * 100)}
            min={0}
            max={100}
            suffix="%"
            onScrubStart={begin}
            onCommit={end}
            onChange={(v) => setLabels(labels.map((x, k) => (k === i ? { ...x, t: v / 100 } : x)))}
          />
          <button
            title={t('panels.connLabels.remove')}
            aria-label={t('panels.connLabels.remove')}
            onClick={() => setLabels(labels.filter((_, k) => k !== i))}
            className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </Section>
  );
}
