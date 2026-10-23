/**
 * Drop-shadow options (draw.io shadowColor / shadowBlur / shadowOffsetX /
 * shadowOffsetY / shadowOpacity). Shapes without options share the built-in
 * soft shadow filter; customised ones get their own filter.
 */
import type { ElementStyle } from '@/model/types';

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
