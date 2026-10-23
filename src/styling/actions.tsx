/**
 * Styling & canvas actions, spread into the central registry (src/app/actions.tsx).
 */
import { Image as ImageIcon, Palette, PenTool, ScrollText } from 'lucide-react';
import type { Action } from '@/app/actions';
import { useEditor } from '@/store/editor';
import { backgroundImageFromUrl, isDiagramSketch, toggleDiagramSketch } from './commands';
import { openThemeDialog } from './ThemeDialog';

const ed = () => useEditor.getState();

export const STYLING_ACTIONS: Action[] = [
  {
    id: 'view.scrollbars',
    label: 'Scrollbars',
    group: 'View',
    icon: <ScrollText />,
    run: () => ed().updateSettings({ scrollbars: !ed().settings.scrollbars }),
    checked: () => !!ed().settings.scrollbars,
    keywords: 'scroll pan',
  },
  {
    id: 'extras.theme',
    label: 'Theme…',
    group: 'Edit',
    icon: <Palette />,
    run: openThemeDialog,
    enabled: () => ed().doc.order.length > 0,
    keywords: 'diagram style colors palette recolor scheme',
  },
  {
    id: 'extras.sketch',
    label: 'Sketch style',
    group: 'Edit',
    icon: <PenTool />,
    run: toggleDiagramSketch,
    checked: isDiagramSketch,
    enabled: () => ed().doc.order.length > 0,
    keywords: 'hand-drawn rough whiteboard diagram-wide',
  },
  {
    id: 'page.backgroundUrl',
    label: 'Background image from URL…',
    group: 'View',
    icon: <ImageIcon />,
    run: () => void backgroundImageFromUrl(),
    keywords: 'page background trace floor plan',
  },
];
