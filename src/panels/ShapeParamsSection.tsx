/**
 * Format panel "Shape" section: the selected shapes' parametric geometry
 * (corner size, arrow width, header size…). Shown when every selected shape
 * is of the same kind and that kind declares `params`; edits apply to all.
 */
import { RotateCcw } from 'lucide-react';
import type { ShapeElement } from '@/model/types';
import { PALETTE } from '@/model/defaults';
import { getShapeDef } from '@/shapes/registry';
import { applyParamPatch, paramsOf } from '@/shapes/params';
import type { ShapeDef, ShapeParam } from '@/shapes/types';
import { useEditor } from '@/store/editor';
import { ColorField, NumberField, Segmented, Select, Switch } from '@/ui/controls';
import { Row, Section, begin, common, end } from './sections';

/** Writes one param on every shape (one undo step unless inside a scrub). */
function setParam(def: ShapeDef, els: ShapeElement[], key: string, value: number | string) {
  const s = useEditor.getState();
  s.updateElements(Object.fromEntries(els.map((el) => [el.id, applyParamPatch(def, el, { params: { [key]: value } })])));
}

/** Switches kind (e.g. pool orientation); pools take their lanes along and swap width / height. */
function setKind(els: ShapeElement[], param: ShapeParam, value: string) {
  const s = useEditor.getState();
  const doc = s.doc;
  const target = param.kindOptions![value];
  const patches: Record<string, Partial<ShapeElement>> = {};
  for (const el of els) {
    if (el.kind === target) continue;
    patches[el.id] = { kind: target, w: el.h, h: el.w };
    // Lanes of a pool follow its orientation.
    for (const id of doc.order) {
      const c = doc.elements[id];
      if (c.type !== 'shape' || c.containerId !== el.id) continue;
      const lane = getShapeDef(c.kind).params?.find((p) => p.kindOptions);
      if (!lane?.kindOptions?.[value] || c.kind === lane.kindOptions[value]) continue;
      patches[id] = { kind: lane.kindOptions[value], x: el.x + (c.y - el.y), y: el.y + (c.x - el.x), w: c.h, h: c.w };
    }
  }
  if (Object.keys(patches).length) s.updateElements(patches);
}

export function ShapeParamsSection({ els }: { els: ShapeElement[] }) {
  const kind = common(els.map((e) => e.kind));
  if (!kind) return null;
  const def = getShapeDef(kind);
  if (!def.params?.length || def.kind !== kind) return null;
  const values = els.map((el) => paramsOf(def, el));
  const anyCustom = els.some((el) => el.params && Object.keys(el.params).length);

  return (
    <Section
      title="Shape"
      action={
        anyCustom ? (
          <button
            title="Reset shape parameters"
            aria-label="Reset shape parameters"
            onClick={() => useEditor.getState().updateElements(Object.fromEntries(els.map((el) => [el.id, { params: undefined }])))}
            className="flex size-6 items-center justify-center rounded-md text-subtle hover:bg-hover hover:text-fg [&_svg]:size-3.5"
          >
            <RotateCcw />
          </button>
        ) : undefined
      }
    >
      {def.params.map((p) => {
        if (p.kindOptions) {
          const cur = Object.entries(p.kindOptions).find(([, k]) => k === kind)?.[0] ?? null;
          return (
            <Row key={p.key} label={p.label}>
              <Segmented size="sm" value={cur} onChange={(v) => setKind(els, p, v)} options={p.options!.map((o) => ({ value: o.value, label: o.label }))} />
            </Row>
          );
        }
        const v = common(values.map((vals) => vals[p.key]));
        if (p.kind === 'boolean') {
          return <Switch key={p.key} label={p.label} checked={Number(v) === 1} onChange={(on) => setParam(def, els, p.key, on ? 1 : 0)} />;
        }
        if (p.kind === 'enum') {
          return (
            <Row key={p.key} label={p.label}>
              <Select value={v === null ? null : String(v)} onChange={(nv) => setParam(def, els, p.key, nv)} options={p.options ?? []} />
            </Row>
          );
        }
        if (p.kind === 'color') {
          const set = v !== null && v !== '';
          return (
            <Row key={p.key} label={p.label}>
              <div className="flex items-center gap-1">
                <ColorField label={p.label} value={v === null ? null : set ? String(v) : 'auto'} onChange={(c) => setParam(def, els, p.key, c)} swatches={PALETTE.fills} allowNone />
                {set && (
                  <button title="Automatic" aria-label="Automatic" onClick={() => setParam(def, els, p.key, '')} className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-hover hover:text-fg [&_svg]:size-3.5">
                    <RotateCcw />
                  </button>
                )}
              </div>
            </Row>
          );
        }
        const pct = p.kind === 'percent';
        return (
          <Row key={p.key} label={p.label}>
            <NumberField
              label="#"
              value={v === null ? null : Number(v) * (pct ? 100 : 1)}
              min={(p.min ?? 0) * (pct ? 100 : 1)}
              max={(p.max ?? (pct ? 1 : 1000)) * (pct ? 100 : 1)}
              step={1}
              suffix={pct ? '%' : p.step && p.step >= 1 ? undefined : 'px'}
              onChange={(nv) => setParam(def, els, p.key, pct ? nv / 100 : nv)}
              onScrubStart={begin}
              onCommit={end}
            />
          </Row>
        );
      })}
    </Section>
  );
}
