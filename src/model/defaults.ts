import type { ConnectorElement, ElementStyle, Endpoint, FontKey, ShapeElement } from './types';
import { uid } from '@/lib/id';

/** CSS font stacks. Each ends in a generic family so PDF export can map it. */
export const FONT_STACKS: Record<FontKey, string> = {
  sans: '"Inter Variable", Inter, "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"JetBrains Mono", "Cascadia Code", Menlo, Consolas, "Liberation Mono", monospace',
  hand: 'Caveat, "Segoe Print", "Comic Sans MS", cursive',
};

export const FONT_LABELS: Record<FontKey, string> = {
  sans: 'Inter',
  serif: 'Serif',
  mono: 'Mono',
  hand: 'Hand-drawn',
};

export const DEFAULT_STYLE: ElementStyle = {
  fill: '#ffffff',
  stroke: '#1e293b',
  strokeWidth: 1.5,
  strokeStyle: 'solid',
  opacity: 1,
  radius: 8,
  shadow: false,
  fontFamily: 'sans',
  fontSize: 14,
  bold: false,
  italic: false,
  textColor: '#0f172a',
  textAlign: 'center',
  verticalAlign: 'middle',
};

export const DEFAULT_CONNECTOR_STYLE: ElementStyle = {
  ...DEFAULT_STYLE,
  fill: 'none',
  stroke: '#475569',
  strokeWidth: 1.5,
  radius: 10,
  fontSize: 13,
  textColor: '#334155',
};

/**
 * A refined palette: soft fills paired with saturated strokes.
 * Used by the properties panel swatches.
 */
export const PALETTE = {
  strokes: [
    '#1e293b', '#64748b', '#dc2626', '#ea580c', '#d97706', '#16a34a',
    '#0d9488', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#db2777',
  ],
  fills: [
    '#ffffff', '#f1f5f9', '#fee2e2', '#ffedd5', '#fef3c7', '#dcfce7',
    '#ccfbf1', '#dbeafe', '#e0e7ff', '#ede9fe', '#fae8ff', '#fce7f3',
  ],
};

// --- User default style (mxGraph "Set as Default Style") ------------------------

const DEFAULT_KEY = 'opendraw:default-style';
let userDefault: Partial<ElementStyle> = (() => {
  try {
    return JSON.parse(localStorage.getItem(DEFAULT_KEY) || '{}');
  } catch {
    return {};
  }
})();

let defaultFont: FontKey | null = null;
/** Font for new generic shapes (Preferences). */
export function setDefaultFont(font: FontKey) {
  defaultFont = font === 'sans' ? null : font;
}

/** Overrides applied to every newly created generic shape (null resets). */
export function setUserDefaultStyle(style: Partial<ElementStyle> | null) {
  userDefault = style ?? {};
  try {
    if (style) localStorage.setItem(DEFAULT_KEY, JSON.stringify(style));
    else localStorage.removeItem(DEFAULT_KEY);
  } catch {
    /* storage unavailable */
  }
  for (const fn of defaultListeners) fn();
}

const defaultListeners = new Set<() => void>();
/** The user's default style ({} when none) and change subscription (Format panel presets). */
export const getUserDefaultStyle = (): Partial<ElementStyle> => userDefault;
export function onUserDefaultStyleChange(fn: () => void): () => void {
  defaultListeners.add(fn);
  return () => defaultListeners.delete(fn);
}

export function createShape(
  kind: string,
  rect: { x: number; y: number; w: number; h: number },
  style: Partial<ElementStyle> = {},
  text = '',
): ShapeElement {
  return {
    id: uid(),
    type: 'shape',
    kind,
    ...rect,
    text,
    // Library presets win over the user's default; the default wins over built-ins.
    style: { ...DEFAULT_STYLE, ...(defaultFont ? { fontFamily: defaultFont } : {}), ...(Object.keys(style).length ? {} : userDefault), ...style },
    groupIds: [],
  };
}

/** Remembered connector look (mxGraph applies the last-used edge style to new edges). */
let connectorDefaults: Partial<ConnectorElement> = {};
export function rememberConnectorStyle(c: Partial<ConnectorElement>) {
  const { routing, startArrow, endArrow, connectorShape, lineJumps, style } = c;
  connectorDefaults = {
    ...connectorDefaults,
    ...(routing ? { routing } : {}),
    ...(startArrow ? { startArrow } : {}),
    ...(endArrow ? { endArrow } : {}),
    ...(connectorShape !== undefined ? { connectorShape } : {}),
    ...(lineJumps !== undefined ? { lineJumps } : {}),
    ...(style ? { style: { ...DEFAULT_CONNECTOR_STYLE, ...connectorDefaults.style, ...style } } : {}),
  };
}

export function createConnector(
  source: Endpoint,
  target: Endpoint,
  overrides: Partial<ConnectorElement> = {},
): ConnectorElement {
  return {
    id: uid(),
    type: 'connector',
    source,
    target,
    routing: 'orthogonal',
    startArrow: 'none',
    endArrow: 'triangle',
    text: '',
    style: { ...DEFAULT_CONNECTOR_STYLE },
    groupIds: [],
    ...connectorDefaults,
    ...overrides,
  };
}
