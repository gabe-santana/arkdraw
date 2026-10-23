/**
 * One-click connector style presets (mxGraph's edge style shortcuts): each
 * sets routing, arrowheads, line pattern and connector shape together, as a
 * single undo step.
 */
import type { ArrowHead, ConnectorElement, ConnectorShape, Routing, StrokeStyle } from '@/model/types';
import { isConnector } from '@/model/types';
import { useEditor } from '@/store/editor';
import { tx } from '@/i18n';

export interface ConnectorPreset {
  id: string;
  /** English name (also the command label, translated by action id). */
  label: string;
  routing: Routing;
  startArrow: ArrowHead;
  endArrow: ArrowHead;
  strokeStyle: StrokeStyle;
  connectorShape?: ConnectorShape;
}

export const CONNECTOR_PRESETS: ConnectorPreset[] = [
  { id: 'straight', label: 'Straight', routing: 'straight', startArrow: 'none', endArrow: 'classic', strokeStyle: 'solid' },
  { id: 'orthogonal', label: 'Orthogonal', routing: 'orthogonal', startArrow: 'none', endArrow: 'classic', strokeStyle: 'solid' },
  { id: 'curved', label: 'Curved', routing: 'curved', startArrow: 'none', endArrow: 'classic', strokeStyle: 'solid' },
  { id: 'entity', label: 'Entity relation', routing: 'entity', startArrow: 'erOnlyOne', endArrow: 'erZeroMany', strokeStyle: 'solid' },
  { id: 'isometric', label: 'Isometric', routing: 'isometric', startArrow: 'none', endArrow: 'classic', strokeStyle: 'solid' },
  { id: 'dependency', label: 'Dashed dependency', routing: 'straight', startArrow: 'none', endArrow: 'arrow', strokeStyle: 'dashed' },
  { id: 'inheritance', label: 'Inheritance', routing: 'orthogonal', startArrow: 'none', endArrow: 'triangleOpen', strokeStyle: 'solid' },
  { id: 'association', label: 'Association (no arrows)', routing: 'straight', startArrow: 'none', endArrow: 'none', strokeStyle: 'solid' },
  { id: 'simple-arrow', label: 'Simple arrow', routing: 'straight', startArrow: 'none', endArrow: 'triangle', strokeStyle: 'solid', connectorShape: 'arrow' },
  { id: 'link', label: 'Link', routing: 'straight', startArrow: 'none', endArrow: 'none', strokeStyle: 'solid', connectorShape: 'link' },
];

/** A preset's display name in the UI language. */
export const connectorPresetLabel = (p: ConnectorPreset): string => tx(`panels.connectorPreset.${p.id}`, p.label);

/** The patch a preset applies to one connector. */
export function presetPatch(c: ConnectorElement, p: ConnectorPreset): Partial<ConnectorElement> {
  return {
    routing: p.routing,
    startArrow: p.startArrow,
    endArrow: p.endArrow,
    startFill: undefined,
    endFill: undefined,
    connectorShape: p.connectorShape,
    bandWidth: undefined,
    headWidth: undefined,
    // A different routing style invalidates manual bends.
    waypoints: c.routing === p.routing ? c.waypoints : undefined,
    style: { ...c.style, strokeStyle: p.strokeStyle, dashPattern: undefined },
  };
}

/** Applies a preset to connectors in one commit (one undo step). */
export function applyConnectorPreset(ids: string[], p: ConnectorPreset) {
  const s = useEditor.getState();
  const patches: Record<string, Partial<ConnectorElement>> = {};
  for (const id of ids) {
    const c = s.doc.elements[id];
    if (isConnector(c)) patches[id] = presetPatch(c, p);
  }
  if (Object.keys(patches).length) s.updateElements(patches);
}
