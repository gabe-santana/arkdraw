/**
 * Smart Enter while editing a UML class (compartment text: header, `--`
 * separators, one member per line). Enter on a member row starts a new row
 * with the same indentation and visibility marker (`+ `, `- `, `# `, `~ `);
 * Enter on an empty marker-only row drops the marker (like leaving a list);
 * Enter at the end of the header of a class without compartments adds the
 * attribute compartment. Shift+Enter always inserts a plain newline.
 */

export interface EnterEdit {
  /** Characters to delete before the caret first. */
  remove: number;
  /** Text inserted at the caret. */
  insert: string;
}

const SEPARATOR = /^\s*-{2,}\s*$/;
const MEMBER_PREFIX = /^(\s*)([+\-#~]\s*)?/;

/** The edit Enter should make at `caret` in `text`, or null for a plain newline. */
export function umlEnterEdit(text: string, caret: number): EnterEdit | null {
  const before = text.slice(0, caret);
  const lineStart = before.lastIndexOf('\n') + 1;
  const nl = text.indexOf('\n', caret);
  const lineEnd = nl < 0 ? text.length : nl;
  const line = text.slice(lineStart, lineEnd);
  if (SEPARATOR.test(line)) return null;

  const inHeader = !text.slice(0, lineStart).split('\n').some((l) => SEPARATOR.test(l));
  if (inHeader) {
    const hasCompartments = text.split('\n').some((l) => SEPARATOR.test(l));
    const atHeaderEnd = caret === lineEnd && text.slice(lineEnd).trim() === '';
    return !hasCompartments && atHeaderEnd && line.trim() ? { remove: 0, insert: '\n--\n+ ' } : null;
  }

  const [prefix = '', indent = '', marker = ''] = MEMBER_PREFIX.exec(line) ?? [];
  if (!marker && !indent) return null;
  const col = caret - lineStart;
  // Empty marker-only row: Enter removes the marker instead of repeating it.
  if (line.trim() === marker.trim() && marker && col >= prefix.length) return { remove: col, insert: '' };
  if (col < prefix.length) return null;
  return { remove: 0, insert: `\n${indent}${marker ? `${marker.trim()} ` : ''}` };
}

/**
 * The editor's text with `<br>` / block breaks as `\n` (setting innerText
 * creates `<br>`s), plus the caret offset in that text.
 */
export function plainText(root: Node, caretNode: Node, caretOffset: number) {
  let text = '';
  let caret = -1;
  const walk = (n: Node) => {
    if (n === caretNode && n.nodeType !== Node.TEXT_NODE) {
      // Caret between children: offset counts child nodes.
      n.childNodes.forEach((c, i) => {
        if (i === caretOffset) caret = text.length;
        walk(c);
      });
      if (caret < 0) caret = text.length;
      return;
    }
    if (n.nodeType === Node.TEXT_NODE) {
      if (n === caretNode) caret = text.length + caretOffset;
      text += n.nodeValue ?? '';
    } else if (n.nodeName === 'BR') {
      text += '\n';
    } else {
      const block = n !== root && /^(DIV|P)$/.test(n.nodeName);
      if (block && text && !text.endsWith('\n')) text += '\n';
      n.childNodes.forEach(walk);
    }
  };
  walk(root);
  return { text, caret: caret < 0 ? text.length : caret };
}

/**
 * Keydown handler for the contentEditable editor. Returns true when it handled
 * Enter (and prevented the default newline).
 */
export function handleUmlEnter(e: { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean; preventDefault(): void }, node: HTMLElement | null, kind: string): boolean {
  if (kind !== 'uml.class' || !node || e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed || !node.contains(sel.anchorNode)) return false;
  const { text, caret } = plainText(node, sel.anchorNode!, sel.anchorOffset);
  const edit = umlEnterEdit(text, caret);
  if (!edit) return false;
  e.preventDefault();
  for (let i = 0; i < edit.remove; i++) sel.modify('extend', 'backward', 'character');
  if (edit.insert) document.execCommand('insertText', false, edit.insert);
  else if (edit.remove) document.execCommand('delete');
  return true;
}
