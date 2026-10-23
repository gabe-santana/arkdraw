/**
 * Diagram themes (Extras → Theme…): recolor a whole page in one undoable step.
 *
 * Colors are reassigned by role so the diagram's structure survives: every
 * distinct fill color becomes the next theme slot (shapes that shared a color
 * still share one), outlines and connectors take the theme's line color, and
 * text gets the color that reads on its background.
 */
import type { DiagramElement, Doc, ElementStyle } from '@/model/types';

export interface DiagramTheme {
  id: string;
  label: string;
  /** Fill slots, paired with `strokes` by index. */
  fills: string[];
  strokes: string[];
  /** Text inside filled shapes. */
  text: string;
  /** Free text and connector labels (on the canvas). */
  canvasText: string;
  /** Connectors and unfilled outlines. */
  line: string;
}

export const DIAGRAM_THEMES: DiagramTheme[] = [
  {
    id: 'classic',
    label: 'Classic',
    fills: ['#dae8fc', '#d5e8d4', '#ffe6cc', '#fff2cc', '#f8cecc', '#e1d5e7'],
    strokes: ['#6c8ebf', '#82b366', '#d79b00', '#d6b656', '#b85450', '#9673a6'],
    text: '#1f2937',
    canvasText: '#1f2937',
    line: '#4b5563',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    fills: ['#e0f2fe', '#ccfbf1', '#dbeafe', '#cffafe', '#e0e7ff', '#f0f9ff'],
    strokes: ['#0284c7', '#0d9488', '#2563eb', '#0891b2', '#4f46e5', '#0369a1'],
    text: '#0c4a6e',
    canvasText: '#0c4a6e',
    line: '#0369a1',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    fills: ['#ffedd5', '#fee2e2', '#fef3c7', '#fce7f3', '#ffe4e6', '#fff7ed'],
    strokes: ['#ea580c', '#dc2626', '#d97706', '#db2777', '#e11d48', '#c2410c'],
    text: '#431407',
    canvasText: '#431407',
    line: '#9a3412',
  },
  {
    id: 'forest',
    label: 'Forest',
    fills: ['#dcfce7', '#ecfccb', '#d1fae5', '#fef9c3', '#e7e5e4', '#f0fdf4'],
    strokes: ['#16a34a', '#65a30d', '#059669', '#ca8a04', '#78716c', '#15803d'],
    text: '#14532d',
    canvasText: '#14532d',
    line: '#3f6212',
  },
  {
    id: 'mono',
    label: 'Monochrome',
    fills: ['#ffffff', '#f4f4f5', '#e4e4e7', '#fafafa', '#d4d4d8', '#f4f4f5'],
    strokes: ['#18181b', '#3f3f46', '#52525b', '#27272a', '#71717a', '#18181b'],
    text: '#18181b',
    canvasText: '#18181b',
    line: '#3f3f46',
  },
  {
    id: 'bold',
    label: 'Bold',
    fills: ['#4f46e5', '#0d9488', '#ea580c', '#db2777', '#2563eb', '#16a34a'],
    strokes: ['#3730a3', '#115e59', '#9a3412', '#9d174d', '#1e40af', '#166534'],
    text: '#ffffff',
    canvasText: '#334155',
    line: '#334155',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    fills: ['#1e293b', '#312e81', '#134e4a', '#3b0764', '#1e3a8a', '#422006'],
    strokes: ['#94a3b8', '#818cf8', '#2dd4bf', '#c084fc', '#60a5fa', '#fbbf24'],
    text: '#f1f5f9',
    canvasText: '#334155',
    line: '#475569',
  },
];

/** Shapes whose colors belong to their content (images, icons) keep them. */
const KEEP_KINDS = new Set(['icon', 'image']);

const norm = (c: string) => c.trim().toLowerCase();

/**
 * Style patches recoloring `ids` (default: every element) with `theme`.
 * Pure: returns `{ id: { style } }` for elements that change.
 */
export function themePatches(doc: Doc, theme: DiagramTheme, ids: string[] = doc.order): Record<string, { style: ElementStyle }> {
  const slots = new Map<string, number>();
  const slotOf = (fill: string) => {
    const key = norm(fill);
    if (!slots.has(key)) slots.set(key, slots.size);
    return slots.get(key)! % theme.fills.length;
  };
  const out: Record<string, { style: ElementStyle }> = {};
  for (const id of ids) {
    const el: DiagramElement | undefined = doc.elements[id];
    if (!el) continue;
    const s = el.style;
    let next: ElementStyle;
    if (el.type === 'connector') {
      next = { ...s, stroke: s.stroke === 'none' ? 'none' : theme.line, textColor: theme.canvasText };
    } else if (KEEP_KINDS.has(el.kind)) {
      continue;
    } else if (s.fill === 'none') {
      next = { ...s, stroke: s.stroke === 'none' ? 'none' : theme.line, textColor: theme.canvasText };
    } else {
      const slot = slotOf(s.fill);
      next = {
        ...s,
        fill: theme.fills[slot],
        stroke: s.stroke === 'none' ? 'none' : theme.strokes[slot % theme.strokes.length],
        textColor: theme.text,
        gradient: s.gradient ? theme.strokes[slot % theme.strokes.length] : undefined,
      };
    }
    // Theme colors replace any user-defined dark colors (they no longer match).
    delete next.darkFill;
    delete next.darkStroke;
    delete next.darkText;
    out[id] = { style: next };
  }
  return out;
}
