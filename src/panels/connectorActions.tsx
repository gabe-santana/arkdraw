/**
 * Connector actions, spread into the central registry (src/app/actions.tsx):
 * connection points, extra labels and style presets.
 */
import { CircleDot, Tag, Spline } from 'lucide-react';
import type { Action } from '@/app/actions';
import { isConnector, isShape } from '@/model/types';
import { useEditor } from '@/store/editor';
import { addExtraLabel } from '@/canvas/ExtraLabelEditor';
import { editConnectionPoints } from './ConnectionPointsDialog';
import { CONNECTOR_PRESETS, applyConnectorPreset } from './connectorPresets';

const ed = () => useEditor.getState();
const selectedConnectors = () => ed().selection.filter((id) => isConnector(ed().doc.elements[id]));
const oneShape = () => ed().selection.length === 1 && isShape(ed().doc.elements[ed().selection[0]]);
const oneConnector = () => ed().selection.length === 1 && isConnector(ed().doc.elements[ed().selection[0]]);

export const CONNECTOR_ACTIONS: Action[] = [
  {
    id: 'edit.connectionPoints',
    label: 'Edit connection points…',
    group: 'Edit',
    icon: <CircleDot />,
    run: editConnectionPoints,
    enabled: oneShape,
    keywords: 'anchor ports fixed constraint points',
  },
  {
    id: 'connector.addLabel',
    label: 'Add connector label',
    group: 'Arrange',
    icon: <Tag />,
    run: () => addExtraLabel(ed().selection[0]),
    enabled: oneConnector,
    keywords: 'edge text second multiple labels',
  },
  ...CONNECTOR_PRESETS.map(
    (p): Action => ({
      id: `connector.preset.${p.id}`,
      label: `Connector style: ${p.label}`,
      group: 'Arrange',
      icon: <Spline />,
      run: () => applyConnectorPreset(selectedConnectors(), p),
      enabled: () => selectedConnectors().length > 0,
      keywords: 'edge preset routing arrow',
    }),
  ),
];
