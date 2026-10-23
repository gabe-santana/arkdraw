/**
 * `%key%` placeholder lookup with draw.io's parent chain: the element itself
 * (handled in ElementBodies), then its container ancestors, then its layer,
 * the page and finally the document's properties.
 */
import type { ConnectorElement, DiagramElement, Doc, DocumentMeta, ShapeElement } from '@/model/types';
import { layerOf, useEditor, type EditorState } from '@/store/editor';

export type PlaceholderLookup = (key: string, el: ShapeElement | ConnectorElement) => string | undefined;

/** Document-level values: its custom data plus title/author/description. */
function docValue(meta: DocumentMeta | undefined, key: string): string | undefined {
  if (!meta) return undefined;
  if (meta.data && key in meta.data) return meta.data[key];
  if (key === 'title' || key === 'author' || key === 'description') return meta[key] || undefined;
  return undefined;
}

/** Builds the lookup for one page. */
export function placeholderLookup(doc: Doc, pageData?: Record<string, string>, meta?: DocumentMeta): PlaceholderLookup {
  return (key, el) => {
    let parentId = el.type === 'shape' ? el.containerId : undefined;
    let guard = 0;
    while (parentId && guard++ < 50) {
      const parent: DiagramElement | undefined = doc.elements[parentId];
      if (!parent) break;
      const v = parent.data?.[key];
      if (v !== undefined) return v;
      parentId = parent.type === 'shape' ? parent.containerId : undefined;
    }
    const layer = layerOf(doc, el);
    if (layer.data && key in layer.data) return layer.data[key];
    if (pageData && key in pageData) return pageData[key];
    return docValue(meta, key);
  };
}

/**
 * Cheap signature of everything the lookup reads besides the element itself,
 * so label contexts only refresh when inherited values actually change.
 */
export function placeholderSignature(doc: Doc, pageData?: Record<string, string>, meta?: DocumentMeta): string {
  // Nothing to refresh unless some label actually renders placeholders.
  if (!doc.order.some((id) => doc.elements[id]?.style.placeholders)) return '';
  const parts: string[] = [];
  for (const id of doc.order) {
    const el = doc.elements[id];
    if (el?.data && el.type === 'shape') parts.push(id, JSON.stringify(el.data));
  }
  return JSON.stringify([parts, doc.layers?.map((l) => l.data ?? null), pageData ?? null, meta?.data ?? null, meta?.title, meta?.author, meta?.description]);
}

/** Lookup against the live editor state (stable function; pair it with `editorPlaceholderSignature`). */
export const editorPlaceholderLookup: PlaceholderLookup = (key, el) => {
  const s = useEditor.getState();
  return placeholderLookup(s.doc, s.pages.find((p) => p.id === s.activePageId)?.data, s.docMeta)(key, el);
};

export const editorPlaceholderSignature = (s: EditorState) =>
  placeholderSignature(s.doc, s.pages.find((p) => p.id === s.activePageId)?.data, s.docMeta);
