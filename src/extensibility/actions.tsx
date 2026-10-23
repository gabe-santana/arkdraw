/**
 * Actions for the extensibility features, registered into the central action
 * registry at import time (menus, palette and shortcuts pick them up):
 * Edit shape, Insert shape from stencil XML, Plugins…, and the UI modes.
 */
import { Code2, Puzzle, Shapes } from 'lucide-react';
import { isShape } from '@/model/types';
import { useEditor } from '@/store/editor';
import { registerAction } from '@/app/actions';
import { UI_MODES, useExt } from './store';

const ext = () => useExt.getState();
const oneShape = () => {
  const s = useEditor.getState();
  return s.selection.length === 1 && isShape(s.doc.elements[s.selection[0]]);
};

export const UI_MODE_ACTION_IDS = UI_MODES.map((m) => `view.uiMode.${m.id}`);

let registered = false;
export function registerExtensibilityActions() {
  if (registered) return;
  registered = true;
  registerAction({
    id: 'edit.editShape',
    label: 'Edit shape…',
    group: 'Edit',
    icon: <Code2 />,
    run: () => {
      const id = useEditor.getState().selection[0];
      if (id) ext().set({ stencilEditor: { mode: 'edit', id } });
    },
    enabled: oneShape,
    keywords: 'stencil xml custom shape mxgraph geometry',
  });
  registerAction({
    id: 'arrange.insertShape',
    label: 'Shape from stencil XML…',
    group: 'Arrange',
    icon: <Shapes />,
    run: () => ext().set({ stencilEditor: { mode: 'insert' } }),
    keywords: 'insert custom shape stencil xml mxgraph draw.io',
  });
  registerAction({
    id: 'extras.plugins',
    label: 'Plugins…',
    group: 'Tools',
    icon: <Puzzle />,
    run: () => ext().set({ pluginsOpen: true }),
    keywords: 'extensions addons scripts plugin',
  });
  for (const m of UI_MODES) {
    registerAction({
      id: `view.uiMode.${m.id}`,
      label: `${m.label} UI`,
      group: 'View',
      run: () => ext().setUiMode(m.id),
      checked: () => ext().uiMode === m.id,
      keywords: `appearance ui mode interface ${m.hint.toLowerCase()}`,
    });
  }
}

registerExtensibilityActions();
