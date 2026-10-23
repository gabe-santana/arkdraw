import { useEffect } from 'react';
import { isShape } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { IS_MAC } from '@/lib/platform';
import { ACTIONS } from './actions';
import { seedTextEditor } from '@/canvas/TextEditor';

const CODE_KEYS: Record<string, string> = {
  BracketRight: ']',
  BracketLeft: '[',
  Equal: '=',
  Minus: '-',
  Quote: "'",
  Backslash: '\\',
  Slash: '/',
  Period: '.',
  Comma: ',',
  NumpadAdd: '+',
  NumpadSubtract: '-',
};

/** Matches a KeyboardEvent against a combo like "Mod+Shift+]". */
export function matchesCombo(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.endsWith('++') ? [...combo.slice(0, -2).split('+').filter(Boolean), '+'] : combo.split('+');
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  const mod = IS_MAC ? e.metaKey : e.ctrlKey;
  if (mod !== mods.has('Mod')) return false;
  if (IS_MAC && e.ctrlKey) return false;
  if (e.altKey !== mods.has('Alt')) return false;
  if (key === '+') return e.key === '+' || (e.code === 'Equal' && e.shiftKey) || e.code === 'NumpadAdd';
  if (e.shiftKey !== mods.has('Shift')) return false;
  const k = key.toLowerCase();
  if (/^[a-z]$/.test(k)) return e.code === `Key${k.toUpperCase()}` || (!e.altKey && e.key.toLowerCase() === k);
  if (/^[0-9]$/.test(k)) return e.code === `Digit${k}`;
  if (key.length > 1) return e.key === key;
  return CODE_KEYS[e.code] === key || e.key === key;
}

const isTyping = (t: EventTarget | null) => !!(t as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]');

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      const s = useEditor.getState();
      if (isTyping(e.target) || s.editingId) return;
      // Modal surfaces own the keyboard while open.
      if (ui.paletteOpen || ui.exportOpen || ui.confirm || ui.shortcutsOpen || ui.aiSettingsOpen || ui.editDataId || ui.editStyleOpen || ui.editDiagramOpen || ui.importOpen || ui.templatesOpen || ui.shapePicker) return;

      if (e.key === 'Escape') {
        if (ui.contextMenu) ui.set({ contextMenu: null });
        else if (s.tool !== 'select') s.setTool('select');
        else s.clearSelection();
        return;
      }
      // Ctrl/⌘+Enter with nothing selected opens the shape picker (draw.io).
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !s.selection.length) {
        e.preventDefault();
        const r = document.querySelector('[data-canvas]')!.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const { x, y, z } = s.camera;
        ui.set({ shapePicker: { clientX: cx, clientY: cy, worldX: (cx - r.left - x) / z, worldY: (cy - r.top - y) / z } });
        return;
      }
      if ((e.key === 'Enter' || e.key === 'F2') && s.selection.length === 1 && !e.ctrlKey && !e.metaKey) {
        const el = s.doc.elements[s.selection[0]];
        if (el && !el.locked && el.behavior?.editable !== false) {
          e.preventDefault();
          s.setEditing(el.id);
        }
        return;
      }
      // Typing with one element selected starts editing its label, replacing it (draw.io).
      // Tool letters (R, O, …) therefore only act with nothing selected.
      if (startsTyping(e) && s.selection.length === 1) {
        const el = s.doc.elements[s.selection[0]];
        if (el && !el.locked && el.behavior?.editable !== false) {
          e.preventDefault();
          seedTextEditor(e.key);
          s.setEditing(el.id);
          return;
        }
      }
      if (e.key.startsWith('Arrow') && !e.altKey && (e.ctrlKey || e.metaKey) && e.shiftKey && s.selection.length) {
        // Resize by the grid size (draw.io).
        e.preventDefault();
        const g = s.settings.gridSize;
        const [dw, dh] = { ArrowLeft: [-g, 0], ArrowRight: [g, 0], ArrowUp: [0, -g], ArrowDown: [0, g] }[e.key as 'ArrowLeft']!;
        const patches: Record<string, { w: number; h: number }> = {};
        for (const id of s.selection) {
          const el = s.doc.elements[id];
          if (el?.type === 'shape' && !el.locked) patches[id] = { w: Math.max(g, el.w + dw), h: Math.max(g, el.h + dh) };
        }
        s.updateElements(patches);
        return;
      }
      if (e.key.startsWith('Arrow') && !e.ctrlKey && !e.metaKey && !e.altKey && !s.selection.length) {
        // Nothing selected: arrows pan the canvas.
        e.preventDefault();
        const d = e.shiftKey ? 200 : 40;
        const [dx, dy] = { ArrowLeft: [d, 0], ArrowRight: [-d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key as 'ArrowLeft']!;
        s.panBy(dx, dy);
        return;
      }
      if (e.key.startsWith('Arrow') && !e.ctrlKey && !e.metaKey && !e.altKey && s.selection.length) {
        e.preventDefault();
        const d = e.shiftKey ? s.settings.gridSize : 1;
        const [dx, dy] = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key as 'ArrowLeft']!;
        s.nudge(dx, dy);
        return;
      }

      for (const action of ACTIONS) {
        if (!action.shortcuts?.some((c) => matchesCombo(e, c))) continue;
        // Let the native paste event handle Mod+V (it carries clipboard data without prompts).
        if (action.id === 'edit.paste') return;
        e.preventDefault();
        if (action.enabled?.() ?? true) action.run();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** A plain printable key: no modifiers (Shift is fine), not Space (pan) or Shift+digit (zoom shortcuts). */
export function startsTyping(e: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'>): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
  if ([...e.key].length !== 1 || e.key === ' ') return false;
  return !(e.shiftKey && e.code.startsWith('Digit'));
}

/** True when exactly one unlocked shape is selected. */
export const singleShape = () => {
  const s = useEditor.getState();
  const el = s.selection.length === 1 ? s.doc.elements[s.selection[0]] : undefined;
  return isShape(el) && !el.locked ? el : null;
};
