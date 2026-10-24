/**
 * Clipboard: copies go to an in-memory clipboard *and* the system clipboard
 * (as tagged JSON), so you can paste between ArkDraw windows. Pasting plain
 * text from other apps creates a text box.
 */
import type { DiagramElement, Vec } from '@/model/types';
import { createShape, DEFAULT_STYLE } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { clientToWorld, isOverCanvas, viewportCenter } from '@/canvas/viewport';
import { isImageUrl } from '@/lib/images';
import { looksLikeSvg } from '@/io/import/svgShapes';
import { insertImageFile, insertImageUrl } from './commands';
import { presetForTool } from '@/canvas/tools';
import { lineHeight, measureText, wrapText } from '@/lib/text';
import { hasDrawioXml, pasteDrawioXml, writeClipboard } from '@/automation/clipboardXml';

const MARKER = 'application/x-arkdraw';

export function copyToClipboard(cut: boolean) {
  const s = useEditor.getState();
  const els = s.copySelection();
  if (!els.length) return;
  const payload = JSON.stringify({ type: MARKER, elements: els });
  // Our JSON as text, plus mxGraph XML as HTML so the copy also pastes into mxGraph.
  void writeClipboard(payload, els);
  if (cut) s.deleteSelection();
}

function parsePayload(text: string): DiagramElement[] | null {
  if (!text.includes(MARKER)) return null;
  try {
    const data = JSON.parse(text);
    return data?.type === MARKER && Array.isArray(data.elements) ? data.elements : null;
  } catch {
    return null;
  }
}

function pasteText(text: string) {
  const preset = presetForTool('shape:text')!;
  const style = { ...DEFAULT_STYLE, ...preset.style };
  const lines = text.split(/\r?\n/);
  const w = Math.min(600, Math.max(40, ...lines.map((l) => measureText(l, style))) + 8);
  const h = wrapText(text, w, style).length * lineHeight(style.fontSize) + 8;
  const c = viewportCenter();
  useEditor.getState().addElements([createShape('text', { x: c.x - w / 2, y: c.y - h / 2, w, h }, preset.style, text)]);
}

/** Image files on a paste event (screenshots, copied pictures, files copied in Explorer/Finder). */
function clipboardImages(dt: DataTransfer | null | undefined): File[] {
  if (!dt) return [];
  const files = Array.from(dt.files ?? []).filter((f) => f.type.startsWith('image/'));
  if (files.length) return files;
  return Array.from(dt.items ?? [])
    .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
    .map((i) => i.getAsFile())
    .filter((f): f is File => !!f);
}

/** Reads an image blob via the async Clipboard API (menu "Paste" with no text on the clipboard). */
async function readClipboardImage(): Promise<Blob | null> {
  try {
    const items = (await navigator.clipboard?.read?.()) ?? [];
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (type) return await item.getType(type);
    }
  } catch {
    /* permission denied / unsupported */
  }
  return null;
}

/**
 * Pastes, in priority order: ArkDraw elements (our tagged JSON always wins),
 * image files, a lone image URL, plain text, then the in-memory clipboard.
 * Images and image URLs land at `at` (default: viewport center).
 */
export async function pasteFromClipboard(text?: string, images: Blob[] = [], at?: Vec) {
  const s = useEditor.getState();
  let data = text;
  const fromApi = data === undefined;
  if (data === undefined) {
    try {
      data = await navigator.clipboard.readText();
    } catch {
      data = '';
    }
  }
  const els = data ? parsePayload(data) : null;
  if (els) {
    // Same elements as our internal clipboard → keep the cascading offset.
    const internal = s.clipboard;
    if (internal && internal.length === els.length) s.paste();
    else s.paste(els, viewportCenter());
    return;
  }
  // mxGraph cells (mxGraphModel / mxfile XML).
  if (data && (await pasteDrawioXml(data, (cells) => useEditor.getState().paste(cells, at ?? viewportCenter())))) return;
  const trimmed = data?.trim() ?? '';
  // Office apps put a rendered picture next to their text; the text is what people mean.
  if (!trimmed) {
    if (!images.length && fromApi) {
      const blob = await readClipboardImage();
      if (blob) images = [blob];
    }
    if (images.length) {
      const c = at ?? viewportCenter();
      for (let i = 0; i < images.length; i++) await insertImageFile(images[i], { x: c.x + i * 24, y: c.y + i * 24 });
      return;
    }
  }
  // SVG markup (e.g. "Copy as SVG" from design tools): image or editable shapes.
  if (trimmed && looksLikeSvg(trimmed) && (await (await import('./svgImport')).offerSvgText(trimmed, at))) return;
  if (trimmed && isImageUrl(trimmed)) {
    // Unreachable/broken links fall through and paste as text.
    if (await insertImageUrl(trimmed, at, { quiet: true })) return;
  }
  if (trimmed) {
    pasteText(trimmed);
    return;
  }
  s.paste();
}

/** Last pointer position over the window, so pasted images land under the cursor. */
let lastPointer: { x: number; y: number } | null = null;

function pasteTarget(): Vec | undefined {
  if (lastPointer && isOverCanvas(lastPointer.x, lastPointer.y)) return clientToWorld(lastPointer.x, lastPointer.y);
  return undefined;
}

/** Wires the native paste event (fires for Ctrl/⌘+V without a permission prompt). */
export function installPasteHandler() {
  const onPaste = (e: ClipboardEvent) => {
    const t = e.target as HTMLElement;
    if (t?.closest?.('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    const plain = e.clipboardData?.getData('text/plain') ?? '';
    const html = e.clipboardData?.getData('text/html') ?? '';
    // mxGraph puts its XML in the HTML flavour; our own JSON (text) still wins.
    const text = !plain.includes(MARKER) && !hasDrawioXml(plain) && hasDrawioXml(html) ? html : plain;
    void pasteFromClipboard(text, clipboardImages(e.clipboardData), pasteTarget());
  };
  const onMove = (e: PointerEvent) => {
    lastPointer = { x: e.clientX, y: e.clientY };
  };
  window.addEventListener('paste', onPaste);
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    window.removeEventListener('paste', onPaste);
    window.removeEventListener('pointermove', onMove);
  };
}
