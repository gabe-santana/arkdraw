/**
 * Per-element behaviour locks (draw.io's `movable=0`, `resizable=0`, …) and
 * their draw.io style mapping. Enforcement lives where each gesture happens
 * (canvas interactions, delete, text editing); this module only describes and
 * converts the flags.
 */
import type { Behavior, DiagramElement, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { useEditor } from '@/store/editor';
import { isContainerShape } from './container';

export type BehaviorKey = keyof Behavior;

export const BEHAVIOR_FLAGS: Array<{ key: BehaviorKey; label: string; hint: string; shapeOnly?: boolean }> = [
  { key: 'movable', label: 'Movable', hint: 'Can be dragged or nudged' },
  { key: 'resizable', label: 'Resizable', hint: 'Shows resize handles', shapeOnly: true },
  { key: 'rotatable', label: 'Rotatable', hint: 'Shows the rotation handle', shapeOnly: true },
  { key: 'deletable', label: 'Deletable', hint: 'Delete removes it' },
  { key: 'editable', label: 'Editable', hint: 'Double-click edits the label' },
  { key: 'connectable', label: 'Connectable', hint: 'Connectors can attach to it', shapeOnly: true },
  { key: 'selectable', label: 'Selectable', hint: 'Clicks and rubber bands pick it' },
];

/** Effective value of a flag (absent = allowed). */
export const allows = (el: DiagramElement | undefined, key: BehaviorKey) => !!el && el.behavior?.[key] !== false;

/** Sets one flag on several elements as one undo step; `true` removes the override. */
export function setBehavior(ids: string[], key: BehaviorKey, value: boolean) {
  const s = useEditor.getState();
  const patches: Record<string, Partial<DiagramElement>> = {};
  for (const id of ids) {
    const el = s.doc.elements[id];
    if (!el) continue;
    const next: Behavior = { ...el.behavior };
    if (value) delete next[key];
    else next[key] = false;
    patches[id] = { behavior: Object.keys(next).length ? next : undefined };
  }
  s.updateElements(patches);
}

/** Behaviour keys that draw.io stores as `key=0` style entries. */
const DRAWIO_KEYS: BehaviorKey[] = ['movable', 'resizable', 'rotatable', 'deletable', 'editable', 'connectable', 'selectable'];

type StyleMap = Map<string, string>;

/** Adds `movable=0`-style keys, `locked=1`, `aspect=fixed` and `container=1` for an element. */
export function behaviorToDrawio(m: StyleMap, el: DiagramElement) {
  for (const key of DRAWIO_KEYS) if (el.behavior?.[key] === false) m.set(key, '0');
  if (el.locked) m.set('locked', '1');
  if (!isShape(el)) return;
  if (el.lockAspect) m.set('aspect', 'fixed');
  const byKind = !!getShapeDef(el.kind).container;
  if (isContainerShape(el) && !byKind) m.set('container', '1');
  if (el.container === false && byKind) m.set('container', '0');
}

/** Reads draw.io behaviour keys back onto an imported element. */
export function behaviorFromDrawio(m: StyleMap, el: DiagramElement) {
  const behavior: Behavior = {};
  for (const key of DRAWIO_KEYS) if (m.get(key) === '0') behavior[key] = false;
  // draw.io's `locked=1` cell style: the whole cell is frozen.
  if (m.get('locked') === '1') el.locked = true;
  if (Object.keys(behavior).length) el.behavior = { ...el.behavior, ...behavior };
  if (!isShape(el)) return;
  if (m.get('aspect') === 'fixed') (el as ShapeElement).lockAspect = true;
}
