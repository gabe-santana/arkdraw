/**
 * mxGraph's Explore / Anonymize / Voice plugins as built-in commands. (Replay
 * lives in ReplayDialog.tsx.)
 *
 * - Explore: focus on one element and its direct neighbours; everything else
 *   is dimmed. Selecting a neighbour moves the focus. Esc or the command again exits.
 * - Anonymize: replaces every letter with x/X (digits with 0) on the page —
 *   labels, names, tooltips, data values, table cells — keeping the layout.
 * - Voice: "Dictate label" fills the selected element's label from the Web
 *   Speech API, where the browser provides it.
 */
import type { DiagramElement, Doc } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { commitDoc, useHighlights } from './editorBridge';
import { t } from '@/i18n';

// ---------------------------------------------------------------------------
// Explore
// ---------------------------------------------------------------------------

/** The element, its connectors and the shapes at their other ends. */
export function neighbourhood(doc: Doc, id: string): string[] {
  const out = new Set([id]);
  const el = doc.elements[id];
  if (isConnector(el)) {
    if (el.source.elementId) out.add(el.source.elementId);
    if (el.target.elementId) out.add(el.target.elementId);
    return [...out];
  }
  for (const cid of doc.order) {
    const c = doc.elements[cid];
    if (!isConnector(c)) continue;
    const a = c.source.elementId;
    const b = c.target.elementId;
    if (a === id || b === id) {
      out.add(cid);
      if (a) out.add(a);
      if (b) out.add(b);
    }
  }
  // Keep containers' contents visible together with them.
  for (const oid of doc.order) {
    const s = doc.elements[oid];
    if (isShape(s) && s.containerId && out.has(s.containerId)) out.add(oid);
  }
  return doc.order.filter((x) => out.has(x));
}

export function exploreFrom(id: string) {
  const s = useEditor.getState();
  if (!s.doc.elements[id]) return;
  const ids = neighbourhood(s.doc, id);
  useHighlights.setState({ explore: { focus: id, ids } });
  requestAnimationFrame(() => useEditor.getState().zoomToFit(ids));
}

export function toggleExplore() {
  if (useHighlights.getState().explore) return useHighlights.setState({ explore: null });
  const s = useEditor.getState();
  const id = s.selection[0];
  if (!id) return useUi.getState().toast(t('automation.explore.selectFirst'), 'info');
  exploreFrom(id);
  useUi.getState().toast(t('automation.explore.hint'), 'info');
}

// ---------------------------------------------------------------------------
// Anonymize
// ---------------------------------------------------------------------------

/** Letters → x/X, digits → 0; keeps whitespace, punctuation, and %placeholders% / $$math$$ markers. */
export function anonymizeText(text: string): string {
  return text.replace(/%[A-Za-z_][\w.-]*%|(\p{Lu})|(\p{L})|(\p{N})/gu, (m, upper, letter, digit) => (upper ? 'X' : letter ? 'x' : digit ? '0' : m));
}

function anonymizeElement(el: DiagramElement): DiagramElement {
  const next: DiagramElement = { ...el, text: anonymizeText(el.text) };
  if (el.name) next.name = anonymizeText(el.name);
  if (el.tooltip) next.tooltip = anonymizeText(el.tooltip);
  if (el.data) next.data = Object.fromEntries(Object.entries(el.data).map(([k, v]) => [k, anonymizeText(v)]));
  if (el.comments) next.comments = undefined;
  if (isShape(el) && el.table && isShape(next)) next.table = { ...el.table, cells: el.table.cells.map((row) => row.map(anonymizeText)) };
  return next;
}

export function anonymizeDoc(doc: Doc): Doc {
  const elements: Doc['elements'] = {};
  for (const id of doc.order) if (doc.elements[id]) elements[id] = anonymizeElement(doc.elements[id]);
  return { ...doc, elements, ...(doc.layers ? { layers: doc.layers.map((l) => ({ ...l, ...(l.data ? { data: Object.fromEntries(Object.entries(l.data).map(([k, v]) => [k, anonymizeText(v)])) } : {}) })) } : {}) };
}

export async function anonymizePage() {
  const s = useEditor.getState();
  if (!s.doc.order.length) return;
  const choice = await useUi.getState().ask({
    title: t('automation.anonymize.title'),
    message: t('automation.anonymize.message'),
    confirmLabel: t('automation.anonymize.confirm'),
  });
  if (choice !== 'confirm') return;
  commitDoc(anonymizeDoc(useEditor.getState().doc));
  useUi.getState().toast(t('automation.anonymize.done'), 'success');
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

const recognitionCtor = (): (new () => Recognition) | undefined =>
  (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

export const canDictate = () => typeof window !== 'undefined' && !!recognitionCtor();

/** Listens once and puts what was said into the selected element's label (one undo step). */
export function dictateLabel() {
  const Ctor = recognitionCtor();
  const ui = useUi.getState();
  if (!Ctor) return ui.toast(t('automation.dictate.unavailable'), 'error');
  const id = useEditor.getState().selection[0];
  if (!id) return ui.toast(t('automation.dictate.selectFirst'), 'info');
  const rec = new Ctor();
  rec.lang = document.documentElement.lang || navigator.language || 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const said = e.results[0]?.[0]?.transcript?.trim();
    if (!said) return;
    const s = useEditor.getState();
    if (s.doc.elements[id]) s.updateElements({ [id]: { text: said } });
    ui.toast(t('automation.dictate.said', { text: said }), 'success');
  };
  rec.onerror = (e) => ui.toast(e.error === 'not-allowed' ? t('automation.dictate.denied') : t('automation.dictate.failed', { error: e.error }), 'error');
  ui.toast(t('automation.dictate.listening'), 'info');
  rec.start();
}
