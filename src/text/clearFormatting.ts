/** Edit → Text → Clear formatting: text style back to defaults, inline formatting removed. */
import type { ConnectorElement, DiagramElement, ElementStyle, ShapeElement } from '@/model/types';
import { isConnector } from '@/model/types';
import { DEFAULT_CONNECTOR_STYLE, DEFAULT_STYLE } from '@/model/defaults';
import { isLocked, useEditor } from '@/store/editor';
import { serializeRuns, stripFormatting } from './richFormat';

/** Text-style keys reset by Clear formatting (alignment and layout stay). */
const RESET_KEYS = ['bold', 'italic', 'fontFamily', 'fontSize', 'textColor'] as const;
const DROP_KEYS = ['underline', 'strike', 'textOpacity', 'labelBackground', 'labelBorderColor'] as const;

export function clearedFormatting(el: DiagramElement): Partial<ShapeElement> & Partial<ConnectorElement> {
  const defaults = isConnector(el) ? DEFAULT_CONNECTOR_STYLE : DEFAULT_STYLE;
  const style: ElementStyle = { ...el.style };
  for (const k of RESET_KEYS) (style as unknown as Record<string, unknown>)[k] = defaults[k];
  for (const k of DROP_KEYS) delete style[k];
  const patch: Partial<ShapeElement> & Partial<ConnectorElement> = { style };
  if (el.style.richText) {
    // Still a formatted label: re-escape characters Markdown would interpret.
    const b = { bold: style.bold, italic: style.italic, underline: false, strike: false, size: style.fontSize };
    const text = serializeRuns([{ ...b, code: false, text: stripFormatting(el.text) }], b);
    if (text !== el.text) patch.text = text;
  }
  return patch;
}

/** Clears formatting on the edited element or the selection (one undo step). */
export function clearFormatting() {
  const s = useEditor.getState();
  const ids = (s.editingId ? [s.editingId] : s.selection).filter((id) => s.doc.elements[id] && !isLocked(s.doc, s.doc.elements[id]));
  if (!ids.length) return;
  s.updateElements(Object.fromEntries(ids.map((id) => [id, clearedFormatting(s.doc.elements[id])])));
}
