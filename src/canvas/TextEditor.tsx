/**
 * In-place text editing. A contentEditable overlay is laid out over the
 * element's text box with the same font metrics as the SVG renderer, so the
 * text doesn't shift when editing starts or ends.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ElementStyle, Rect, ShapeElement } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { FONT_STACKS } from '@/model/defaults';
import { compartmentHeight, getShapeDef, textBoxOf, c4Layout } from '@/shapes/registry';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { lineHeight, LINE_HEIGHT, wrapText } from '@/lib/text';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { matchesCombo } from '@/app/useShortcuts';
import { stepFontSize, toggleTextStyle } from '@/app/commands';

/** Text typed while a shape was merely selected — seeds the editor. */
let seed: string | null = null;
export const seedTextEditor = (text: string) => {
  seed = text;
};

const FORMAT_KEYS: Array<[string, () => void]> = [
  ['Mod+B', () => toggleTextStyle('bold')],
  ['Mod+I', () => toggleTextStyle('italic')],
  ['Mod+U', () => toggleTextStyle('underline')],
  ['Mod+Shift+.', () => stepFontSize(1)],
  ['Mod+Shift+,', () => stepFontSize(-1)],
];

function editBox(el: ShapeElement): { box: Rect; style: ElementStyle } {
  const def = getShapeDef(el.kind);
  const placement = def.textPlacement ?? 'inside';
  if (placement === 'below') {
    return { box: { x: el.x - 60, y: el.y + el.h + 6, w: el.w + 120, h: lineHeight(el.style.fontSize) }, style: { ...el.style, verticalAlign: 'top', textAlign: 'center' } };
  }
  if (placement === 'custom') {
    const compartments = el.kind === 'uml.class' || el.kind === 'erd.entity';
    return {
      box: { x: el.x + 8, y: el.y + 8, w: el.w - 16, h: el.h - 16 },
      style: compartments ? { ...el.style, textAlign: 'left', verticalAlign: 'top' } : el.style,
    };
  }
  const b = textBoxOf(def, el.w, el.h);
  return { box: { ...b, x: b.x + el.x, y: b.y + el.y }, style: el.style };
}

export function TextEditor() {
  const editingId = useEditor((s) => s.editingId);
  const el = useEditor((s) => (s.editingId ? s.doc.elements[s.editingId] : undefined));
  const elements = useEditor((s) => s.doc.elements);
  const camera = useEditor((s) => s.camera);
  const adapt = useEditor((s) => s.settings.adaptColors);
  const ref = useRef<HTMLDivElement>(null);
  const committed = useRef(false);

  // Initialize content & focus once per editing session.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !el) return;
    committed.current = false;
    node.innerText = seed ?? el.text;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    if (seed !== null) range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    seed = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    // If the element disappears (undo/delete), stop editing.
    if (editingId && !el) useEditor.getState().setEditing(null);
  }, [editingId, el]);

  if (!el || !editingId) return null;

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const text = (ref.current?.innerText ?? '').replace(/\n$/, '');
    const s = useEditor.getState();
    s.setEditing(null);
    const cur = s.doc.elements[editingId];
    if (!cur) return;
    if (isShape(cur) && cur.kind === 'text' && !text.trim()) {
      s.deleteElements([cur.id]);
      return;
    }
    if (text === cur.text) return;
    const patch: Partial<ShapeElement> = { text };
    if (isShape(cur)) {
      const grown = grownHeight(cur, text);
      if (grown > cur.h) patch.h = grown;
    }
    s.updateElements({ [cur.id]: patch });
  };

  let box: Rect;
  let style: ElementStyle;
  if (isConnector(el)) {
    const g = connectorGeometryInDoc(el, elements);
    const w = 220;
    box = { x: g.label.x - w / 2, y: g.label.y - lineHeight(el.style.fontSize) / 2, w, h: lineHeight(el.style.fontSize) };
    style = { ...el.style, textAlign: 'center', verticalAlign: 'top' };
  } else {
    ({ box, style } = editBox(el));
  }

  const z = camera.z;
  const justify = style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'bottom' ? 'flex-end' : 'center';

  return (
    <div
      data-text-editor
      className={cn('absolute', adapt && 'diagram-adapt')}
      style={{
        left: box.x * z + camera.x,
        top: box.y * z + camera.y,
        width: box.w * z,
        minHeight: box.h * z,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={ref}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            ref.current?.blur();
          }
          // Formatting shortcuts apply to the whole label while editing.
          const format = FORMAT_KEYS.find(([combo]) => matchesCombo(e.nativeEvent, combo));
          if (format) {
            e.preventDefault();
            format[1]();
          }
        }}
        style={{
          fontFamily: FONT_STACKS[style.fontFamily],
          fontSize: style.fontSize * z,
          fontWeight: style.bold ? 700 : 400,
          fontStyle: style.italic ? 'italic' : 'normal',
          textDecoration: [style.underline && 'underline', style.strike && 'line-through'].filter(Boolean).join(' ') || undefined,
          lineHeight: LINE_HEIGHT,
          color: style.textColor,
          textAlign: style.textAlign,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          outline: 'none',
          caretColor: 'var(--accent)',
          minHeight: lineHeight(style.fontSize) * z,
          background: isConnector(el) ? 'var(--canvas)' : 'transparent',
          borderRadius: 4,
          cursor: 'text',
        }}
      />
    </div>
  );
}

/** Height a shape needs to fit `text`, for shapes that auto-grow. */
function grownHeight(el: ShapeElement, text: string): number {
  const def = getShapeDef(el.kind);
  if (el.kind === 'uml.class' || el.kind === 'erd.entity') return compartmentHeight(el.w, el.style, text);
  if (el.kind.startsWith('c4.') && el.kind !== 'c4.boundary') {
    const pad = el.kind === 'c4.person' ? el.h * 0.45 : 28;
    return c4Layout(text, el.w - 24, el.style).height + pad;
  }
  if (!def.autoGrow) return 0;
  const box = textBoxOf(def, el.w, el.h);
  const lines = wrapText(text, box.w, el.style).length;
  return lines * lineHeight(el.style.fontSize) + (el.h - box.h);
}
