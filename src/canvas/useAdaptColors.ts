import { useEditor } from '@/store/editor';
import { pageIsDark } from '@/styling/darkColors';

/**
 * Whether the canvas adapts the diagram's colors to the dark theme: the
 * "Adapt diagram colors" setting, except on a page drawn on its own dark
 * background, which is already made for the dark.
 */
export const useAdaptColors = () =>
  useEditor((s) => s.settings.adaptColors && !pageIsDark(s.pages.find((p) => p.id === s.activePageId)?.settings.background));
