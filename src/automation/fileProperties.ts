/**
 * File properties (File → Properties): title, author, description and
 * timestamps stored in the `.arkdraw` file's `meta`, plus document statistics.
 */
import type { DocumentMeta, Page } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { useEditor } from '@/store/editor';

/** Updates the document's properties and marks the file as having unsaved changes. */
export function updateDocMeta(patch: Partial<DocumentMeta>) {
  const s = useEditor.getState();
  const next: DocumentMeta = { ...s.docMeta, ...patch };
  for (const k of Object.keys(next) as Array<keyof DocumentMeta>) {
    const v = next[k];
    if (v === undefined || v === '' || (typeof v === 'object' && !Object.keys(v).length)) delete next[k];
  }
  useEditor.setState({ docMeta: next, file: { ...s.file, savedMeta: '' } });
}

/** The meta to write on save: stamps `created` once and `modified` every time. */
export function metaForSave(now = new Date()): DocumentMeta {
  const meta = useEditor.getState().docMeta;
  const iso = now.toISOString();
  return { ...meta, created: meta.created ?? iso, modified: iso };
}

/** Records the stamped meta after a successful save (without marking the file dirty). */
export function commitSavedMeta(meta: DocumentMeta) {
  useEditor.setState({ docMeta: meta });
}

export interface DocStats {
  pages: number;
  shapes: number;
  connectors: number;
  layers: number;
  /** Shapes carrying text. */
  labels: number;
  images: number;
  comments: number;
}

export function documentStats(pages: Page[]): DocStats {
  const st: DocStats = { pages: pages.length, shapes: 0, connectors: 0, layers: 0, labels: 0, images: 0, comments: 0 };
  for (const p of pages) {
    st.layers += p.doc.layers?.length ?? 1;
    for (const id of p.doc.order) {
      const el = p.doc.elements[id];
      if (isShape(el)) {
        st.shapes++;
        if (el.kind === 'image' || el.kind === 'icon') st.images++;
      } else if (isConnector(el)) st.connectors++;
      if (el?.text.trim()) st.labels++;
      st.comments += el?.comments?.length ?? 0;
    }
  }
  return st;
}
