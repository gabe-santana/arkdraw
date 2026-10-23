/**
 * ARIA attributes for diagram elements on the editor canvas (role="img" with
 * a label built from the shape kind and its text), so screen readers can
 * name what keyboard navigation selects.
 */
import type { ConnectorElement, ShapeElement } from '@/model/types';
import { getShapeDef } from '@/shapes/registry';
import { t } from '@/i18n';

const firstLine = (s: string | undefined) => (s ?? '').split('\n').find((l) => l.trim())?.trim() ?? '';

export function shapeAria(el: ShapeElement) {
  const kind = el.kind === 'icon' ? t('canvas.aria.icon') : getShapeDef(el.kind).label;
  const text = firstLine(el.name) || firstLine(el.text) || (el.table ? firstLine(el.table.cells[0]?.join(' ')) : '');
  return { role: 'img', 'aria-roledescription': kind.toLowerCase(), 'aria-label': text ? t('canvas.aria.labeled', { kind, text }) : kind };
}

export function connectorAria(el: ConnectorElement) {
  const text = firstLine(el.name) || firstLine(el.text);
  const kind = t('common.connector');
  return { role: 'img', 'aria-roledescription': t('canvas.aria.connectorRole'), 'aria-label': text ? t('canvas.aria.labeled', { kind, text }) : kind };
}
