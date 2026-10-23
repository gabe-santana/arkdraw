/**
 * Per-element behaviour locks (mxGraph's `movable=0`, `resizable=0`, …) and
 * their mapping. Enforcement lives where each gesture happens
 * (canvas interactions, delete, text editing); this module only describes and
 * converts the flags.
 */
import type { Behavior, DiagramElement, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { useEditor } from '@/store/editor';
import { isContainerShape } from './container';
import { t, type MessageKey } from '@/i18n';

export type BehaviorKey = keyof Behavior;

/** `label` / `hint` are translated on read (UI language at render time). */
const flag = (key: BehaviorKey, labelKey: MessageKey, hintKey: MessageKey, shapeOnly?: true) => ({
  key,
  get label() {
    return t(labelKey);
  },
  get hint() {
    return t(hintKey);
  },
  ...(shapeOnly ? { shapeOnly } : {}),
});

export const BEHAVIOR_FLAGS: Array<{ key: BehaviorKey; label: string; hint: string; shapeOnly?: boolean }> = [
  flag('movable', 'canvas.behavior.movable', 'canvas.behavior.movableHint'),
  flag('resizable', 'canvas.behavior.resizable', 'canvas.behavior.resizableHint', true),
  flag('rotatable', 'canvas.behavior.rotatable', 'canvas.behavior.rotatableHint', true),
  flag('deletable', 'canvas.behavior.deletable', 'canvas.behavior.deletableHint'),
  flag('editable', 'canvas.behavior.editable', 'canvas.behavior.editableHint'),
  flag('connectable', 'canvas.behavior.connectable', 'canvas.behavior.connectableHint', true),
  flag('selectable', 'canvas.behavior.selectable', 'canvas.behavior.selectableHint'),
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

/** Behaviour keys that mxGraph stores as `key=0` style entries. */
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

/** Reads mxGraph behaviour keys back onto an imported element. */
export function behaviorFromDrawio(m: StyleMap, el: DiagramElement) {
  const behavior: Behavior = {};
  for (const key of DRAWIO_KEYS) if (m.get(key) === '0') behavior[key] = false;
  // mxGraph's `locked=1` cell style: the whole cell is frozen.
  if (m.get('locked') === '1') el.locked = true;
  if (Object.keys(behavior).length) el.behavior = { ...el.behavior, ...behavior };
  if (!isShape(el)) return;
  if (m.get('aspect') === 'fixed') (el as ShapeElement).lockAspect = true;
}
