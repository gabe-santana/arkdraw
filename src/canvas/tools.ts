import type { LibraryItem } from '@/shapes/types';
import { LIBRARIES } from '@/shapes/libraries';

/** Shapes the toolbar can draw directly (`shape:<id>` tools). */
export const TOOL_PRESETS: Record<string, LibraryItem> = {
  rectangle: LIBRARIES[0].items[0],
  ellipse: LIBRARIES[0].items[2],
  diamond: LIBRARIES[0].items[4],
  text: LIBRARIES[0].items.find((i) => i.kind === 'text')!,
  sticky: LIBRARIES[0].items.find((i) => i.kind === 'sticky')!,
  container: LIBRARIES[0].items.find((i) => i.kind === 'container')!,
};

export const shapeTool = (preset: keyof typeof TOOL_PRESETS) => `shape:${preset}`;

export function presetForTool(tool: string): LibraryItem | null {
  if (!tool.startsWith('shape:')) return null;
  return TOOL_PRESETS[tool.slice(6)] ?? null;
}
