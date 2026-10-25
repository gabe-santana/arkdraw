/**
 * Drop-shadow options (mxGraph shadowColor / shadowBlur / shadowOffsetX /
 * shadowOffsetY / shadowOpacity). Shapes without options share the built-in
 * soft shadow filter; customised ones get their own filter.
 */
import type { ElementStyle, Rect } from '@/model/types';

/** The built-in look (matches the shared `od-shadow` filter in ElementBodies). */
export const SHADOW_DEFAULTS = { color: '#0f172a', blur: 5, offsetX: 0, offsetY: 4, opacity: 0.16 };

export const SHADOW_KEYS = ['shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowOpacity'] as const;

export function hasCustomShadow(s: ElementStyle): boolean {
  return SHADOW_KEYS.some((k) => s[k] !== undefined);
}

export function shadowParams(s: ElementStyle) {
  return {
    color: s.shadowColor ?? SHADOW_DEFAULTS.color,
    blur: s.shadowBlur ?? SHADOW_DEFAULTS.blur,
    offsetX: s.shadowOffsetX ?? SHADOW_DEFAULTS.offsetX,
    offsetY: s.shadowOffsetY ?? SHADOW_DEFAULTS.offsetY,
    opacity: s.shadowOpacity ?? SHADOW_DEFAULTS.opacity,
  };
}

export const customShadowId = (elId: string) => `od-sh-${elId.replace(/[^\w-]/g, '_')}`;

/** `filter` attribute value for a shadowed element. */
export function shadowFilterUrl(elId: string, s: ElementStyle, sharedId: string): string {
  return `url(#${hasCustomShadow(s) ? customShadowId(elId) : sharedId})`;
}

/** Per-element <filter> (render inside <defs>) — only when the style customises the shadow. */
export function CustomShadowFilter({ elId, style }: { elId: string; style: ElementStyle }) {
  if (!hasCustomShadow(style)) return null;
  const p = shadowParams(style);
  return (
    <filter id={customShadowId(elId)} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      <feDropShadow dx={p.offsetX} dy={p.offsetY} stdDeviation={Math.max(0, p.blur)} floodColor={p.color} floodOpacity={p.opacity} />
    </filter>
  );
}

/**
 * <filter> for a shadowed connector (render inside <defs>). A straight line has
 * a zero-height or zero-width bounding box, which collapses an objectBoundingBox
 * filter region and hides the line, so the region is set in user space around
 * the route instead. `reach` is how far the line work extends past the route.
 */
export function ConnectorShadowFilter({ elId, style, route, reach }: { elId: string; style: ElementStyle; route: Rect; reach: number }) {
  const p = shadowParams(style);
  const m = reach + Math.max(0, p.blur) * 3 + Math.max(Math.abs(p.offsetX), Math.abs(p.offsetY));
  return (
    <filter id={customShadowId(elId)} filterUnits="userSpaceOnUse" x={route.x - m} y={route.y - m} width={route.w + m * 2} height={route.h + m * 2} colorInterpolationFilters="sRGB">
      <feDropShadow dx={p.offsetX} dy={p.offsetY} stdDeviation={Math.max(0, p.blur)} floodColor={p.color} floodOpacity={p.opacity} />
    </filter>
  );
}
