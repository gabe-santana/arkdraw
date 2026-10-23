/**
 * Styling commands: presets, diagram themes, diagram-wide sketch and the
 * page background image by URL. Each document change is one undo step.
 */
import type { DiagramElement, ElementStyle } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { promptText } from '@/ui/PromptDialog';
import { presetPatches, type StylePreset } from './presets';
import { DIAGRAM_THEMES, themeLabel, themePatches } from './themes';
import { t } from '@/i18n';

const ed = () => useEditor.getState();

export function applyPreset(preset: Pick<StylePreset, 'fill' | 'stroke' | 'textColor'>, ids = ed().selection) {
  const s = ed();
  const els = ids.map((id) => s.doc.elements[id]).filter(Boolean);
  if (!els.length) return;
  s.updateElements(presetPatches(els, preset));
}

/** Recolors the selection, or the whole page when `scope` is 'page'. */
export function applyTheme(themeId: string, scope: 'page' | 'selection' = 'page') {
  const theme = DIAGRAM_THEMES.find((th) => th.id === themeId);
  if (!theme) return;
  const s = ed();
  const ids = scope === 'selection' && s.selection.length ? s.selection : s.doc.order;
  const patches = themePatches(s.doc, theme, ids);
  if (!Object.keys(patches).length) return;
  s.updateElements(patches);
  useUi.getState().toast(t('styling.theme.applied', { theme: themeLabel(theme) }), 'success');
}

/** Every element on the page is sketched. */
export function isDiagramSketch(): boolean {
  const { doc } = ed();
  return doc.order.length > 0 && doc.order.every((id) => !!doc.elements[id]?.style.sketch);
}

/** Pure: patches turning sketch on/off for all elements (font follows, like the per-shape switch). */
export function sketchPatches(els: DiagramElement[], on: boolean): Record<string, { style: ElementStyle }> {
  const out: Record<string, { style: ElementStyle }> = {};
  for (const el of els) {
    if (!!el.style.sketch === on) continue;
    const style: ElementStyle = { ...el.style, sketch: on || undefined };
    if (on && el.style.fontFamily === 'sans') style.fontFamily = 'hand';
    if (!on && el.style.fontFamily === 'hand') style.fontFamily = 'sans';
    out[el.id] = { style };
  }
  return out;
}

/** Extras → Sketch style: hand-drawn look for every shape and connector on the page. */
export function toggleDiagramSketch() {
  const s = ed();
  const on = !isDiagramSketch();
  const patches = sketchPatches(s.doc.order.map((id) => s.doc.elements[id]).filter(Boolean), on);
  if (Object.keys(patches).length) s.updateElements(patches);
}

export function isImageUrl(v: string): boolean {
  return /^(https?:\/\/|data:image\/)/i.test(v.trim());
}

/** Page background image from a URL (Page section → URL…). */
export async function backgroundImageFromUrl() {
  const page = ed().pages.find((p) => p.id === ed().activePageId);
  const url = await promptText({
    title: t('styling.bgImage.title'),
    message: t('styling.bgImage.message'),
    placeholder: 'https://example.com/floor-plan.png',
    defaultValue: page?.settings.backgroundImage && !page.settings.backgroundImage.startsWith('data:') ? page.settings.backgroundImage : '',
    confirmLabel: t('styling.bgImage.confirm'),
    validate: (v) => (isImageUrl(v) ? null : t('styling.bgImage.invalid')),
  });
  if (!url) return;
  const src = url.trim();
  const update = ed().updatePageSettings;
  // Size the image area from the picture itself when it loads; fall back to the paper.
  const img = new Image();
  img.onload = () => update({ backgroundImage: src, paperW: img.naturalWidth || undefined, paperH: img.naturalHeight || undefined });
  img.onerror = () => {
    update({ backgroundImage: src });
    useUi.getState().toast(t('styling.bgImage.loadFailed'), 'error');
  };
  img.src = src;
}
