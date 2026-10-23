/**
 * ARIA attributes for diagram elements on the editor canvas (role="img" with
 * a label built from the shape kind and its text), so screen readers can
 * name what keyboard navigation selects.
 */
import type { ConnectorElement, ShapeElement } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';

const firstLine = (s: string | undefined) => (s ?? '').split('\n').find((l) => l.trim())?.trim() ?? '';

export function shapeAria(el: ShapeElement) {
  const kind = el.kind === 'icon' ? 'Icon' : getShapeDef(el.kind).label;
  const text = firstLine(el.name) || firstLine(el.text) || (el.table ? firstLine(el.table.cells[0]?.join(' ')) : '');
  return { role: 'img', 'aria-roledescription': kind.toLowerCase(), 'aria-label': text ? `${kind}: ${text}` : kind };
}

export function connectorAria(el: ConnectorElement) {
  const text = firstLine(el.name) || firstLine(el.text);
  return { role: 'img', 'aria-roledescription': 'connector', 'aria-label': text ? `Connector: ${text}` : 'Connector' };
}
