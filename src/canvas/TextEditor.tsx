/**
 * In-place text editing. A contentEditable overlay is laid out over the
 * element's text box with the same font metrics as the SVG renderer, so the
 * text doesn't shift when editing starts or ends.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ElementStyle, Rect, ShapeElement } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { compartmentHeight, getShapeDef, textBoxOf, c4Layout } from '@/shapes/registry';
import { connectorGeometryInDoc } from '@/lib/connectorGeometry';
import { lineHeight, LINE_HEIGHT, wrapText } from '@/lib/text';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { matchesCombo } from '@/app/useShortcuts';
import { spellCheckEnabled, spellCheckLanguage } from '@/desktop/config';
import { stepFontSize, toggleTextStyle } from '@/app/commands';
import { fontStack } from '@/text/fonts';
import { shapeLabelBox } from '@/text/labelLayout';
import { domToRich, richToEditorHtml } from '@/text/richDom';
import type { BaseStyle } from '@/text/richFormat';
import { needsRich, richSize } from '@/text/RichTextBlock';
import { editsTranslation } from '@/text/translations';
import { FormatBar, runShortcut } from '@/text/FormatBar';

/** Formatting the WYSIWYG editor's runs are relative to. */
const baseOf = (s: ElementStyle): BaseStyle => ({ bold: s.bold, italic: s.italic, underline: !!s.underline, strike: !!s.strike, size: s.fontSize, color: s.textColor });
import { handleUmlEnter } from './umlEnter';

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
  // Same box as the renderer (label position, spacing).
  const labelled = placement !== 'custom' ? shapeLabelBox(el) : null;
  if (labelled) return labelled;
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
  const b = textBoxOf(def, el.w, el.h, el.params);
  return { box: { ...b, x: b.x + el.x, y: b.y + el.y }, style: el.style };
}

export function TextEditor() {
  const editingId = useEditor((s) => s.editingId);
  const el = useEditor((s) => (s.editingId ? s.doc.elements[s.editingId] : undefined));
  const elements = useEditor((s) => s.doc.elements);
  const camera = useEditor((s) => s.camera);
  const adapt = useEditor((s) => s.settings.adaptColors);
  const lang = useEditor((s) => s.pages.find((p) => p.id === s.activePageId)?.settings.language);
  const ref = useRef<HTMLDivElement>(null);
  const committed = useRef(false);
  /** Formatted labels get a WYSIWYG editor; this is its content as first serialized. */
  const initialRich = useRef<string | null>(null);
  const rich = !!el?.style.richText;
  // With a diagram language set, an existing translation is edited in place.
  const translationKey = el ? editsTranslation(el, lang) : null;

  // Initialize content & focus once per editing session.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !el) return;
    committed.current = false;
    const source = translationKey ? (el.data?.[translationKey] ?? '') : el.text;
    initialRich.current = null;
    if (rich && seed === null) {
      node.innerHTML = richToEditorHtml(source, baseOf(el.style), camera.z);
      initialRich.current = domToRich(node, baseOf(el.style)).replace(/\n$/, '');
    } else node.innerText = seed ?? source;
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
    const node = ref.current;
    const text = ((rich && node ? domToRich(node, baseOf(el.style)) : node?.innerText) ?? '').replace(/\n$/, '');
    const s = useEditor.getState();
    s.setEditing(null);
    const cur = s.doc.elements[editingId];
    if (!cur) return;
    // Unchanged WYSIWYG content: keep the stored text byte-for-byte.
    if (rich && initialRich.current !== null && text === initialRich.current) return;
    if (translationKey) {
      if (text !== cur.data?.[translationKey]) s.updateElements({ [cur.id]: { data: { ...cur.data, [translationKey]: text } } });
      return;
    }
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
  // Labels above the shape grow upwards from their anchor line.
  const growsUp = box.h === 0 && style.verticalAlign === 'bottom';

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
        transform: growsUp ? 'translateY(-100%)' : undefined,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {rich && <FormatBar editor={ref} baseSize={style.fontSize} zoom={z} />}
      <div
        ref={ref}
        contentEditable={rich ? 'true' : 'plaintext-only'}
        suppressContentEditableWarning
        spellCheck={spellCheckEnabled()}
        lang={spellCheckLanguage()}
        dir={style.textDirection}
        onBlur={(e) => {
          // Focus moving into the format bar (link field) keeps the session open.
          const next = e.relatedTarget as HTMLElement | null;
          if (next?.closest('[data-format-bar]')) {
            next.addEventListener('blur', (ev) => {
              const to = (ev as FocusEvent).relatedTarget as HTMLElement | null;
              if (!to || (!to.closest('[data-format-bar]') && to !== ref.current)) commit();
            }, { once: true });
            return;
          }
          commit();
        }}
        onPaste={(e) => {
          if (!rich) return;
          // Paste as plain text; formatting comes from the format bar.
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (rich && e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
            return;
          }
          // With a text selection in a formatted label, Ctrl+B/I/U and size steps format just that run.
          if (rich && runShortcut(e.nativeEvent, ref.current, style.fontSize, z)) {
            e.preventDefault();
            return;
          }
          if (isShape(el) && handleUmlEnter(e, ref.current, el.kind)) return;
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
          fontFamily: fontStack(style.fontFamily),
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
  const box = textBoxOf(def, el.w, el.h, el.params);
  if (needsRich(text, el.style)) return richSize(text, box.w, el.style).h + (el.h - box.h);
  const lines = wrapText(text, box.w, el.style).length;
  return lines * lineHeight(el.style.fontSize) + (el.h - box.h);
}
