/**
 * Editor commands that combine store operations (features).
 * Kept separate from the store so the store stays a small, generic model API.
 */
import type { ConnectorElement, DiagramElement, ElementStyle, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { setUserDefaultStyle } from '@/model/defaults';
import { getShapeDef, textBoxOf, compartmentHeight, c4Layout } from '@/shapes/registry';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { groupMembers, isLocked, selectionBounds, shapeRect, useEditor } from '@/store/editor';
import { paperSize } from '@/canvas/paper';
import { useUi } from '@/store/ui';
import { LAYOUTS } from '@/layout';
import { addChildNode, addSiblingNode } from '@/layout/tree-utils';
import { lastContextWorld } from '@/canvas/useCanvasInteractions';
import { viewportCenter } from '@/canvas/viewport';
import { isTauri } from '@/lib/platform';
import { exportSubset, renderSvgStandalone } from '@/io/export/svg';
import { svgToCanvas } from '@/io/export/raster';
import { iconUrl } from '@/shapes/IconImage';
import { fitImageSize, imageMimeFromUrl, normalizeImageUrl } from '@/lib/images';
import { promptText } from '@/ui/PromptDialog';
import { t } from '@/i18n';

const ed = () => useEditor.getState();
const ui = () => useUi.getState();
const selectedShapes = () => {
  const s = ed();
  return s.selection.map((id) => s.doc.elements[id]).filter(isShape).filter((e) => !isLocked(s.doc, e));
};

// --- Zoom --------------------------------------------------------------------------

export const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

/** Zooms around the viewport centre to `percent`. */
export function zoomToPercent(percent: number) {
  ed().zoomBy(percent / 100 / ed().camera.z);
}

/**
 * mxGraph's page zooms. Pages tile from the origin at the paper size (see
 * PageBackdrop); "the page" is the one holding the diagram's top-left.
 */
export function zoomToPage(mode: 'onePage' | 'twoPages' | 'pageWidth', insets: { left: number; right: number; top: number; bottom: number }) {
  const s = ed();
  const settings = s.pages.find((p) => p.id === s.activePageId)?.settings;
  if (!settings) return;
  const { w: pw, h: ph } = paperSize(settings);
  const b = selectionBounds(s.doc, s.doc.order);
  const px = b ? Math.floor(b.x / pw) * pw : 0;
  const py = b ? Math.floor(b.y / ph) * ph : 0;
  const w = mode === 'twoPages' ? pw * 2 : pw;
  const v = s.viewport;
  const availW = Math.max(100, v.w - insets.left - insets.right);
  const availH = Math.max(100, v.h - insets.top - insets.bottom);
  const pad = 24;
  const z = Math.min(4, mode === 'pageWidth' ? (availW - pad * 2) / w : Math.min((availW - pad * 2) / w, (availH - pad * 2) / ph));
  s.animateCamera({
    x: insets.left + availW / 2 - (px + w / 2) * z,
    // Page width shows the top of the page; the others centre it.
    y: mode === 'pageWidth' ? insets.top + pad - py * z : insets.top + availH / 2 - (py + ph / 2) * z,
    z,
  });
}

// --- Text formatting ---------------------------------------------------------------

/** Elements text formatting applies to: the one being edited, else the selection. */
const textTargets = () => {
  const s = ed();
  const ids = s.editingId ? [s.editingId] : s.selection;
  return ids.filter((id) => s.doc.elements[id] && !isLocked(s.doc, s.doc.elements[id]));
};

/** Ctrl+B / I / U: toggles for all targets (on unless every target already has it). */
export function toggleTextStyle(key: 'bold' | 'italic' | 'underline') {
  const s = ed();
  const ids = textTargets();
  if (!ids.length) return;
  const on = !ids.every((id) => s.doc.elements[id].style[key]);
  s.updateStyle(ids, { [key]: on });
}

/** Font sizes Ctrl+Shift+> / < step through (as in word processors). */
export const FONT_STEPS = [6, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96, 120];

export function nextFontSize(size: number, dir: 1 | -1): number {
  if (dir > 0) return FONT_STEPS.find((v) => v > size) ?? size;
  return [...FONT_STEPS].reverse().find((v) => v < size) ?? size;
}

export function stepFontSize(dir: 1 | -1) {
  const s = ed();
  const ids = textTargets();
  if (!ids.length) return;
  s.beginInteraction();
  for (const id of ids) s.updateStyle([id], { fontSize: nextFontSize(s.doc.elements[id].style.fontSize, dir) });
  s.endInteraction();
}

// --- Replace shape -----------------------------------------------------------------

export interface ShapeTemplate {
  kind: string;
  style?: Partial<ElementStyle>;
  /** For `kind: 'icon'`: the icon path. */
  icon?: string;
}

/**
 * Turns shapes into another kind (mxGraph "Replace" / Shift-drop): geometry,
 * text, connections, layer, groups and data are kept; the new kind's style
 * is layered over the old one.
 */
export function replaceShapes(ids: string[], to: ShapeTemplate) {
  const s = ed();
  const patches: Record<string, Partial<ShapeElement>> = {};
  for (const id of ids) {
    const el = s.doc.elements[id];
    if (!isShape(el) || isLocked(s.doc, el)) continue;
    patches[id] = {
      kind: to.kind,
      style: { ...el.style, ...to.style },
      icon: to.kind === 'icon' ? to.icon : undefined,
      // Kind-specific payloads don't survive a change of kind.
      ...(to.kind !== el.kind && { points: undefined, table: undefined, crop: undefined }),
    };
  }
  if (!Object.keys(patches).length) return;
  s.beginInteraction();
  s.updateElements(patches);
  s.endInteraction();
}

/** Opens the shape picker in "replace" mode for the selected shapes. */
export function pickReplacement() {
  const shapes = selectedShapes();
  if (!shapes.length) return;
  const r = document.querySelector('[data-canvas]')!.getBoundingClientRect();
  const { x, y, z } = ed().camera;
  const first = shapes[0];
  const clientX = r.left + x + (first.x + first.w / 2) * z;
  const clientY = r.top + y + (first.y + first.h) * z;
  ui().set({ shapePicker: { clientX, clientY, worldX: first.x, worldY: first.y, replaceIds: shapes.map((e) => e.id) } });
}

// --- Transform -----------------------------------------------------------------

export function rotateSelection(delta: number) {
  const shapes = selectedShapes().filter((s) => s.behavior?.rotatable !== false);
  if (!shapes.length) return;
  ed().updateElements(Object.fromEntries(shapes.map((s) => [s.id, { rotation: (((s.rotation ?? 0) + delta) % 360 + 360) % 360 || undefined }])));
}

export function flipSelection(axis: 'h' | 'v') {
  const shapes = selectedShapes();
  if (!shapes.length) return;
  const key = axis === 'h' ? 'flipH' : 'flipV';
  ed().updateElements(Object.fromEntries(shapes.map((s) => [s.id, { [key]: !s[key] || undefined }])));
}

/** Resizes shapes to fit their label (mxGraph Autosize). */
export function autosizeSelection() {
  const patches: Record<string, Partial<ShapeElement>> = {};
  for (const s of selectedShapes()) {
    const def = getShapeDef(s.kind);
    if (s.kind === 'uml.class' || s.kind === 'erd.entity') {
      const widest = Math.max(...s.text.split('\n').map((l) => measureText(l, s.style))) + 28;
      patches[s.id] = { w: Math.max(80, widest), h: compartmentHeight(Math.max(80, widest), s.style, s.text) };
      continue;
    }
    if (s.kind.startsWith('c4.')) {
      patches[s.id] = { h: c4Layout(s.text, s.w - 24, s.style).height + 28 };
      continue;
    }
    if (!s.text) continue;
    const lines = s.text.split('\n');
    const textW = Math.max(...lines.map((l) => measureText(l, s.style)));
    const box = textBoxOf(def, s.w, s.h, s.params);
    const padX = s.w - box.w;
    const padY = s.h - box.h;
    const w = Math.ceil(textW + padX + 4);
    const h = Math.ceil(wrapText(s.text, w - padX, s.style).length * lineHeight(s.style.fontSize) + padY + 4);
    patches[s.id] = { w: Math.max(20, w), h: Math.max(20, h) };
  }
  ed().updateElements(patches);
}

/** Makes every selected shape the same size as the first. */
export function equalSize(which: 'w' | 'h' | 'both') {
  const shapes = selectedShapes();
  if (shapes.length < 2) return;
  const [ref] = shapes;
  ed().updateElements(
    Object.fromEntries(shapes.slice(1).map((s) => [s.id, { ...(which !== 'h' ? { w: ref.w } : {}), ...(which !== 'w' ? { h: ref.h } : {}) }])),
  );
}

export function alignToGrid() {
  const g = ed().settings.gridSize;
  ed().updateElements(Object.fromEntries(selectedShapes().map((s) => [s.id, { x: Math.round(s.x / g) * g, y: Math.round(s.y / g) * g, w: Math.max(g, Math.round(s.w / g) * g), h: Math.max(g, Math.round(s.h / g) * g) }])));
}

export function removeFromGroup() {
  const s = ed();
  const next: Record<string, Partial<DiagramElement>> = {};
  for (const id of s.selection) {
    const el = s.doc.elements[id];
    if (el?.groupIds.length) next[id] = { groupIds: [] };
    if (isShape(el) && el.containerId) next[id] = { ...next[id], containerId: undefined } as Partial<ShapeElement>;
  }
  s.updateElements(next);
}

// --- Selection -------------------------------------------------------------------

export function selectByType(type: 'shape' | 'connector' | 'none') {
  const s = ed();
  if (type === 'none') return s.clearSelection();
  s.select(s.doc.order.filter((id) => s.doc.elements[id].type === type && !isLocked(s.doc, s.doc.elements[id])));
}

export function selectGroupOrChildren(mode: 'children' | 'parent' | 'siblings') {
  const s = ed();
  const el = s.doc.elements[s.selection[0]];
  if (!isShape(el)) return;
  if (mode === 'children') s.select(s.doc.order.filter((id) => (s.doc.elements[id] as ShapeElement).containerId === el.id));
  if (mode === 'parent' && el.containerId) s.select([el.containerId]);
  if (mode === 'siblings') s.select(s.doc.order.filter((id) => (s.doc.elements[id] as ShapeElement).containerId === el.containerId && s.doc.elements[id].type === 'shape'));
}

// --- Style clipboard & default style ---------------------------------------------

let copiedStyle: ElementStyle | null = null;

export function copyStyle() {
  const s = ed();
  const el = s.doc.elements[s.selection[0]];
  if (!el) return;
  copiedStyle = { ...el.style };
  ui().toast(t('app.style.copied'));
}

export function pasteStyle() {
  if (!copiedStyle) return ui().toast(t('app.style.copyFirst'));
  const s = ed();
  s.updateStyle(s.selection, copiedStyle);
}

export function setDefaultStyleFromSelection() {
  const s = ed();
  const el = s.doc.elements[s.selection[0]];
  if (!isShape(el)) return;
  const { fill, stroke, strokeWidth, strokeStyle, fontFamily, fontSize, textColor, shadow, sketch, radius } = el.style;
  setUserDefaultStyle({ fill, stroke, strokeWidth, strokeStyle, fontFamily, fontSize, textColor, shadow, sketch, radius });
  ui().toast(t('app.style.defaultSet'));
}

export function clearDefaultStyle() {
  setUserDefaultStyle(null);
  ui().toast(t('app.style.defaultReset'));
}

// --- Connectors --------------------------------------------------------------------

export function clearWaypoints() {
  const s = ed();
  const conns = s.selection.map((id) => s.doc.elements[id]).filter(isConnector);
  s.updateElements(Object.fromEntries(conns.map((c) => [c.id, { waypoints: undefined, labelT: undefined, labelOffset: undefined }])));
}

export function reverseConnectors() {
  const s = ed();
  const conns = s.selection.map((id) => s.doc.elements[id]).filter(isConnector);
  s.updateElements(
    Object.fromEntries(conns.map((c) => [c.id, { source: c.target, target: c.source, startArrow: c.endArrow, endArrow: c.startArrow, waypoints: c.waypoints?.slice().reverse() } as Partial<ConnectorElement>])),
  );
}

/** Connects two selected shapes (mxGraph: select two shapes, then connect). */
export function connectSelection() {
  const shapes = selectedShapes();
  if (shapes.length !== 2) return;
  import('@/model/defaults').then(({ createConnector }) => {
    const c = createConnector({ elementId: shapes[0].id, side: 'auto', x: 0, y: 0 }, { elementId: shapes[1].id, side: 'auto', x: 0, y: 0 });
    ed().addElements([c]);
  });
}

// --- Paste here / layouts / tree editing --------------------------------------------

export function pasteHere() {
  const at = lastContextWorld ?? viewportCenter();
  ed().paste(undefined, at);
}

export function applyLayout(id: string) {
  const layout = LAYOUTS.find((l) => l.id === id);
  if (!layout) return;
  const s = ed();
  const patches = layout.run(s.doc, s.selection.filter((sid) => isShape(s.doc.elements[sid])), { nodeSpacing: 40, levelSpacing: 70 });
  if (!Object.keys(patches).length) return ui().toast(t('app.layout.nothing'));
  s.updateElements(patches);
  requestAnimationFrame(() => {
    const ids = Object.keys(patches);
    ed().zoomToFit(ids.length > 1 ? ids : undefined);
  });
}

/** Mind-map / tree editing: Tab adds a child, Enter adds a sibling (Shift+Enter before). */
export function addTreeNode(kind: 'child' | 'sibling' | 'siblingBefore') {
  const s = ed();
  const el = s.doc.elements[s.selection[0]];
  if (!isShape(el)) return;
  const res = kind === 'child' ? addChildNode(s.doc, el.id, 'right') : addSiblingNode(s.doc, el.id, kind === 'siblingBefore');
  if (!res) return;
  s.beginInteraction();
  s.addElements([res.shape, ...(res.connector ? [res.connector] : [])], { select: false });
  s.select([res.shape.id]);
  s.endInteraction();
  s.setEditing(res.shape.id);
}

/** Alt+Shift+Arrow: clone the selected shape in a direction and connect it. */
export async function cloneConnect(side: 'top' | 'right' | 'bottom' | 'left') {
  const s = ed();
  const el = s.doc.elements[s.selection[0]];
  if (!isShape(el)) return;
  const { cloneAndConnect } = await import('@/canvas/useCanvasInteractions');
  cloneAndConnect(el.id, side);
}

// --- Clipboard images -------------------------------------------------------------------

export async function copyAsImage(format: 'png' | 'svg') {
  const s = ed();
  const ids = s.selection.length ? s.selection : undefined;
  if (!s.doc.order.length) return;
  try {
    const rendered = await renderSvgStandalone(s.doc, { ids, background: format === 'png' ? '#ffffff' : null });
    if (format === 'svg') {
      await navigator.clipboard.writeText(rendered.svg);
    } else {
      const canvas = await svgToCanvas(rendered, 2);
      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }
    ui().toast(t('app.copyAs.done', { format: format.toUpperCase() }), 'success');
  } catch (e) {
    ui().toast(t('app.copyAs.failed', { error: String((e as Error).message ?? e) }), 'error');
  }
}

// --- View ------------------------------------------------------------------------------------

export async function toggleFullscreen() {
  if (isTauri()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const w = getCurrentWindow();
    await w.setFullscreen(!(await w.isFullscreen()));
  } else if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}

export function gotoPage(delta: number) {
  const s = ed();
  const i = s.pages.findIndex((p) => p.id === s.activePageId);
  const next = s.pages[(i + delta + s.pages.length) % s.pages.length];
  if (next) s.switchPage(next.id);
}

/** Selects the element and centers it in view (used by Find and the outline). */
export function revealElement(id: string, pageId?: string) {
  const s = ed();
  if (pageId && pageId !== s.activePageId) s.switchPage(pageId);
  const st = ed();
  const el = st.doc.elements[id];
  if (!el) return;
  st.select(groupMembers(st.doc, id).includes(id) ? [id] : [id]);
  const b = isShape(el) ? shapeRect(el) : null;
  if (b) {
    const { viewport, camera } = st;
    st.animateCamera({ x: viewport.w / 2 - (b.x + b.w / 2) * camera.z, y: viewport.h / 2 - (b.y + b.h / 2) * camera.z, z: camera.z });
  } else st.zoomToFit([id]);
}

// --- Images ------------------------------------------------------------------------------

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** Natural pixel size of an image source, or null if it can't be loaded/decoded. */
export function measureImage(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? { w: img.naturalWidth, h: img.naturalHeight } : { w: 200, h: 150 });
    img.onerror = () => resolve(null);
    img.src = iconUrl(src);
  });
}

/** Adds an image shape centered on `at` (default: viewport center), fitted within 480px. */
async function addImageShape(src: string, natural: { w: number; h: number } | null, at?: Vec) {
  const { w, h } = natural ? fitImageSize(natural.w, natural.h) : { w: 200, h: 150 };
  const c = at ?? viewportCenter();
  const { createShape } = await import('@/model/defaults');
  const el = createShape('image', { x: c.x - w / 2, y: c.y - h / 2, w, h }, { fill: 'none', stroke: 'none', radius: 0 });
  el.icon = src;
  ed().addElements([el]);
}

/** Insert an image from a file picker / dropped / pasted file at a world point. */
export async function insertImageFile(file: File | Blob, at?: Vec, asImage = false) {
  // SVGs: offer "Convert to shapes" first (src/app/svgImport.tsx).
  if (!asImage && (await (await import('./svgImport')).offerSvgConvert(file, at))) return;
  const url = await blobToDataUrl(file);
  await addImageShape(url, await measureImage(url), at);
}

/** Downloads an image URL into a data URI; null when the fetch is blocked (CORS) or isn't an image. */
async function inlineImageUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    let blob = await res.blob();
    if (!blob.type.startsWith('image/')) {
      const mime = imageMimeFromUrl(url);
      if (!mime) return null;
      blob = new Blob([blob], { type: mime });
    }
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

/**
 * Inserts an image by URL. Remote images are embedded as data URIs when the
 * server allows it (so exports and offline use work); otherwise the URL is
 * linked as-is. Returns false if the image can't be loaded at all.
 */
export async function insertImageUrl(url: string, at?: Vec, { quiet = false } = {}): Promise<boolean> {
  let src = url;
  let linked = false;
  if (!/^data:/i.test(url)) {
    const inlined = await inlineImageUrl(url);
    if (inlined) src = inlined;
    else linked = true;
  }
  const natural = await measureImage(src);
  if (!natural) {
    if (!quiet) ui().toast(t('app.image.loadFailed'), 'error');
    return false;
  }
  await addImageShape(src, natural, at);
  if (linked) ui().toast(t('app.image.linked'), 'info');
  return true;
}

/** Arrange › Insert › Image from URL… (asks for the URL in an in-app prompt). */
export async function insertImageFromUrl() {
  const at = viewportCenter();
  const base = typeof location !== 'undefined' ? location.href : undefined;
  const value = await promptText({
    title: t('app.image.urlTitle'),
    message: t('app.image.urlMessage'),
    placeholder: 'https://example.com/picture.png',
    confirmLabel: t('common.insert'),
    validate: (v) => (normalizeImageUrl(v, base) ? null : t('app.image.urlInvalid')),
  });
  const url = value && normalizeImageUrl(value, base);
  if (url) await insertImageUrl(url, at);
}

export function pickImage() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) void insertImageFile(f);
  };
  input.click();
}

export function insertTable(rows = 3, cols = 3) {
  import('@/model/defaults').then(({ createShape }) => {
    const c = viewportCenter();
    const cw = 110;
    const rh = 34;
    const el = createShape('table', { x: c.x - (cols * cw) / 2, y: c.y - (rows * rh) / 2, w: cols * cw, h: rows * rh }, { radius: 6, fontSize: 13 });
    el.table = {
      cols: Array(cols).fill(cw),
      rows: Array(rows).fill(rh),
      cells: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c2) => (r === 0 ? `Column ${c2 + 1}` : ''))),
      header: true,
    };
    ed().addElements([el]);
  });
}

/** Table structure edits on the selected table. */
export function editTable(op: 'addRow' | 'addCol' | 'delRow' | 'delCol') {
  const s = ed();
  const el = s.doc.elements[s.selection[0]];
  if (!isShape(el) || !el.table) return;
  const t = el.table;
  const cells = t.cells.map((r) => r.slice());
  let { rows, cols } = t;
  let { w, h } = el;
  if (op === 'addRow') {
    rows = [...rows, rows[rows.length - 1] ?? 34];
    cells.push(Array(cols.length).fill(''));
    h += (rows[rows.length - 1] * el.h) / t.rows.reduce((a, b) => a + b, 0);
  } else if (op === 'addCol') {
    cols = [...cols, cols[cols.length - 1] ?? 110];
    cells.forEach((r) => r.push(''));
    w += (cols[cols.length - 1] * el.w) / t.cols.reduce((a, b) => a + b, 0);
  } else if (op === 'delRow' && rows.length > 1) {
    h -= (rows[rows.length - 1] * el.h) / t.rows.reduce((a, b) => a + b, 0);
    rows = rows.slice(0, -1);
    cells.pop();
  } else if (op === 'delCol' && cols.length > 1) {
    w -= (cols[cols.length - 1] * el.w) / t.cols.reduce((a, b) => a + b, 0);
    cols = cols.slice(0, -1);
    cells.forEach((r) => r.pop());
  }
  s.updateElements({ [el.id]: { table: { ...t, rows, cols, cells }, w: Math.round(w), h: Math.round(h) } });
}

export const exportSubsetForSelection = () => exportSubset(ed().doc, ed().selection);
