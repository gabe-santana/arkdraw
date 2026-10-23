/**
 * Floating format bar for the WYSIWYG editor of formatted labels: formats
 * only the selected run (bold, italic, underline, strike, size, colour,
 * highlight, sub/superscript, link, clear). Buttons never take focus, so the
 * editor's selection survives clicks.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AArrowDown, AArrowUp, Baseline, Bold, Highlighter, Italic, Link2, RemoveFormatting, Strikethrough, Subscript, Superscript, Underline, Unlink,
} from 'lucide-react';
import { PALETTE } from '@/model/defaults';
import { nextFontSize } from '@/app/commands';
import { cn } from '@/lib/cn';
import { safeHref } from './richFormat';
import { useT } from '@/i18n';

type Cmd = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'subscript' | 'superscript';

const exec = (cmd: string, value?: string) => {
  try {
    return document.execCommand(cmd, false, value);
  } catch {
    return false;
  }
};

/** The editor's selection range, if it is a non-empty selection inside `root`. */
export function selectionIn(root: HTMLElement | null): Range | null {
  const sel = window.getSelection();
  if (!root || !sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  return !r.collapsed && root.contains(r.commonAncestorContainer) ? r : null;
}

export function toggleRun(cmd: Cmd) {
  exec('styleWithCSS', 'false');
  exec(cmd);
}

/** Font size (document px) at the start of the selection. */
function sizeAt(range: Range, base: number): number {
  let n: Node | null = range.startContainer;
  while (n && n.nodeType !== 1) n = n.parentNode;
  const sized = (n as Element | null)?.closest('[data-size]');
  return Number(sized?.getAttribute('data-size')) || base;
}

/** Wraps the selection in a sized span (sizes inside it are replaced). */
export function setRunSize(root: HTMLElement, size: number, zoom: number) {
  const range = selectionIn(root);
  if (!range) return;
  const frag = range.extractContents();
  frag.querySelectorAll<HTMLElement>('[data-size]').forEach((s) => {
    s.removeAttribute('data-size');
    s.style.fontSize = '';
  });
  const span = document.createElement('span');
  span.dataset.size = String(size);
  span.style.fontSize = `${size * zoom}px`;
  span.appendChild(frag);
  range.insertNode(span);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  const r = document.createRange();
  r.selectNodeContents(span);
  sel.addRange(r);
}

export function stepRunSize(root: HTMLElement, base: number, zoom: number, dir: 1 | -1) {
  const range = selectionIn(root);
  if (range) setRunSize(root, nextFontSize(sizeAt(range, base), dir), zoom);
}

export function clearRunFormatting(root: HTMLElement) {
  const range = selectionIn(root);
  if (!range) return;
  exec('removeFormat');
  exec('unlink');
  // removeFormat leaves our sized spans alone in some engines.
  const r2 = selectionIn(root);
  if (r2) {
    const frag = r2.extractContents();
    frag.querySelectorAll('span, font, sub, sup, b, i, u, s, strike, code, a, mark').forEach((n) => n.replaceWith(...Array.from(n.childNodes)));
    const text = document.createTextNode(frag.textContent ?? '');
    r2.insertNode(text);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    const r = document.createRange();
    r.selectNodeContents(text);
    sel.addRange(r);
  }
}

/** Ctrl+B / I / U and Ctrl+Shift+> / < on a selection; returns true when handled. */
export function runShortcut(e: KeyboardEvent, root: HTMLElement | null, base: number, zoom: number): boolean {
  if (!root || !(e.ctrlKey || e.metaKey) || e.altKey || !selectionIn(root)) return false;
  const k = e.key.toLowerCase();
  if (!e.shiftKey && (k === 'b' || k === 'i' || k === 'u')) {
    toggleRun(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline');
    return true;
  }
  if (e.shiftKey && (k === '>' || k === '.' || k === '<' || k === ',')) {
    stepRunSize(root, base, zoom, k === '>' || k === '.' ? 1 : -1);
    return true;
  }
  return false;
}

function Btn({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      tabIndex={-1}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn('flex size-[26px] items-center justify-center rounded-md transition-colors [&_svg]:size-3.5', active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-hover hover:text-fg')}
    >
      {children}
    </button>
  );
}

function Swatches({ colors, onPick, none }: { colors: string[]; onPick: (c: string | null) => void; none?: boolean }) {
  const t = useT();
  return (
    <div className="absolute left-0 top-full z-10 mt-1 grid w-[156px] grid-cols-6 gap-1 rounded-lg bg-panel p-2 shadow-pop">
      {none && (
        <button type="button" tabIndex={-1} title={t('common.none')} onMouseDown={(e) => (e.preventDefault(), onPick(null))} className="relative size-5 rounded-md bg-panel-2 ring-1 ring-line">
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rotate-45 bg-danger" />
        </button>
      )}
      {colors.map((c) => (
        <button key={c} type="button" tabIndex={-1} title={c} onMouseDown={(e) => (e.preventDefault(), onPick(c))} className="size-5 rounded-md" style={{ background: c, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.1)' }} />
      ))}
    </div>
  );
}

const STATES: Cmd[] = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript'];

export function FormatBar({ editor, baseSize, zoom }: { editor: React.RefObject<HTMLDivElement | null>; baseSize: number; zoom: number }) {
  const t = useT();
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<null | 'color' | 'highlight' | 'link'>(null);
  const [href, setHref] = useState('');
  const saved = useRef<Range | null>(null);

  useEffect(() => {
    const update = () => {
      if (!selectionIn(editor.current) && !editor.current?.contains(window.getSelection()?.anchorNode ?? null)) return;
      const next: Record<string, boolean> = {};
      for (const c of STATES) {
        try {
          next[c] = document.queryCommandState(c);
        } catch {
          /* unsupported */
        }
      }
      setActive(next);
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, [editor]);

  const root = () => editor.current;
  const run = (fn: () => void) => () => {
    setMenu(null);
    fn();
    root()?.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const restore = () => {
    const r = saved.current;
    if (!r) return;
    root()?.focus();
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
  };
  const applyLink = () => {
    const url = safeHref(/^[a-z][\w+.-]*:|^#/i.test(href.trim()) ? href.trim() : `https://${href.trim()}`);
    restore();
    if (url) exec('createLink', url);
    setMenu(null);
    setHref('');
  };

  return (
    <div
      data-format-bar
      role="toolbar"
      aria-label={t('canvas.format.toolbar')}
      onPointerDown={(e) => e.stopPropagation()}
      className="animate-pop absolute bottom-full left-0 mb-2 flex items-center gap-0.5 rounded-xl bg-panel p-1 shadow-pop"
      style={{ whiteSpace: 'nowrap' }}
    >
      <Btn label={t('canvas.format.bold', { shortcut: 'Ctrl+B' })} active={active.bold} onClick={run(() => toggleRun('bold'))}><Bold /></Btn>
      <Btn label={t('canvas.format.italic', { shortcut: 'Ctrl+I' })} active={active.italic} onClick={run(() => toggleRun('italic'))}><Italic /></Btn>
      <Btn label={t('canvas.format.underline', { shortcut: 'Ctrl+U' })} active={active.underline} onClick={run(() => toggleRun('underline'))}><Underline /></Btn>
      <Btn label={t('canvas.format.strikethrough')} active={active.strikeThrough} onClick={run(() => toggleRun('strikeThrough'))}><Strikethrough /></Btn>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <Btn label={t('canvas.format.smaller', { shortcut: 'Ctrl+Shift+<' })} onClick={run(() => root() && stepRunSize(root()!, baseSize, zoom, -1))}><AArrowDown /></Btn>
      <Btn label={t('canvas.format.larger', { shortcut: 'Ctrl+Shift+>' })} onClick={run(() => root() && stepRunSize(root()!, baseSize, zoom, 1))}><AArrowUp /></Btn>
      <div className="relative">
        <Btn label={t('canvas.format.textColor')} active={menu === 'color'} onClick={() => setMenu(menu === 'color' ? null : 'color')}><Baseline /></Btn>
        {menu === 'color' && <Swatches colors={PALETTE.strokes} onPick={(c) => run(() => (exec('styleWithCSS', 'false'), exec('foreColor', c ?? '#000000')))()} />}
      </div>
      <div className="relative">
        <Btn label={t('canvas.format.highlight')} active={menu === 'highlight'} onClick={() => setMenu(menu === 'highlight' ? null : 'highlight')}><Highlighter /></Btn>
        {menu === 'highlight' && (
          <Swatches
            none
            colors={['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', ...PALETTE.fills.slice(1, 7)]}
            onPick={(c) => run(() => (exec('styleWithCSS', 'true'), exec('hiliteColor', c ?? 'transparent'), exec('styleWithCSS', 'false')))()}
          />
        )}
      </div>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <Btn label={t('canvas.format.subscript')} active={active.subscript} onClick={run(() => toggleRun('subscript'))}><Subscript /></Btn>
      <Btn label={t('canvas.format.superscript')} active={active.superscript} onClick={run(() => toggleRun('superscript'))}><Superscript /></Btn>
      <div className="relative">
        <Btn
          label={t('canvas.format.link')}
          active={menu === 'link'}
          onClick={() => {
            saved.current = selectionIn(root())?.cloneRange() ?? null;
            if (saved.current) setMenu(menu === 'link' ? null : 'link');
          }}
        >
          <Link2 />
        </Btn>
        {menu === 'link' && (
          <div className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1 rounded-lg bg-panel p-1.5 shadow-pop">
            <input
              autoFocus
              data-format-bar-input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === 'Escape') {
                  setMenu(null);
                  restore();
                }
              }}
              placeholder="https://…"
              className="h-7 w-48 rounded-md bg-panel-2 px-2 text-[12px] text-fg outline-none ring-1 ring-transparent focus:ring-accent/40"
            />
          </div>
        )}
      </div>
      <Btn label={t('canvas.format.removeLink')} onClick={run(() => exec('unlink'))}><Unlink /></Btn>
      <Btn label={t('canvas.format.clearFormatting')} onClick={run(() => root() && clearRunFormatting(root()!))}><RemoveFormatting /></Btn>
    </div>
  );
}
