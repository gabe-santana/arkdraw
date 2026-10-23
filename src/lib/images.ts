/**
 * Pure helpers for image shapes: URL detection, fit-to-box sizing and crop
 * math. `ImageCrop` stores the visible window as fractions (0..1) of the
 * source image; the panel edits it as four inset percentages instead.
 */
import type { ImageCrop, Rect } from '@/model/types';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

/** True for a pasted string that is exactly one image URL (by extension) or a `data:image/…` URI. */
export function isImageUrl(text: string): boolean {
  const t = text.trim();
  if (/^data:image\/[\w.+-]+[;,]/i.test(t)) return true;
  if (!t || /\s/.test(t)) return false;
  try {
    const u = new URL(t);
    return (u.protocol === 'http:' || u.protocol === 'https:') && IMAGE_EXT.test(u.pathname);
  } catch {
    return false;
  }
}

/**
 * Validates user input for "Insert image from URL": http(s) and `data:image/…`
 * URLs are accepted; root/dot-relative paths resolve against `base`.
 * Returns the absolute URL, or null when unusable.
 */
export function normalizeImageUrl(input: string, base?: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (/^data:/i.test(t)) return /^data:image\/[\w.+-]+[;,]/i.test(t) ? t : null;
  try {
    const u = /^(\/|\.\.?\/)/.test(t) && base ? new URL(t, base) : new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** MIME type guessed from a URL's file extension (for servers that send octet-stream). */
export function imageMimeFromUrl(url: string): string | null {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* keep raw */
  }
  const ext = IMAGE_EXT.exec(path)?.[1]?.toLowerCase();
  if (!ext) return null;
  return ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
}

/** Scales a natural size down (never up) so its longest side is at most `max`. */
export function fitImageSize(w: number, h: number, max = 480): { w: number; h: number } {
  if (!(w > 0) || !(h > 0)) return { w: 200, h: 150 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

// --- Crop ---------------------------------------------------------------------------------

export type CropSide = 'top' | 'right' | 'bottom' | 'left';
/** Insets in percent of the source image. */
export type CropSides = Record<CropSide, number>;

export const FULL_CROP: ImageCrop = { x: 0, y: 0, w: 1, h: 1 };
/** Max inset per side, and the cap for two opposite sides together (exclusive of 95). */
export const MAX_CROP_SIDE = 90;
export const MAX_CROP_PAIR = 94;

const OPPOSITE: Record<CropSide, CropSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

export function cropToSides(crop?: ImageCrop): CropSides {
  const c = crop ?? FULL_CROP;
  return {
    top: r4(c.y * 100),
    left: r4(c.x * 100),
    right: r4((1 - c.x - c.w) * 100),
    bottom: r4((1 - c.y - c.h) * 100),
  };
}

/** Inverse of `cropToSides`; no crop at all returns undefined (so the field is dropped). */
export function sidesToCrop(s: CropSides): ImageCrop | undefined {
  if (!s.top && !s.right && !s.bottom && !s.left) return undefined;
  return { x: s.left / 100, y: s.top / 100, w: 1 - (s.left + s.right) / 100, h: 1 - (s.top + s.bottom) / 100 };
}

/**
 * Clamps each side to 0..MAX_CROP_SIDE and keeps opposite sides summing to at
 * most MAX_CROP_PAIR. When a pair overflows, the side being edited (`changed`)
 * gives way, so typing a big number never moves the other edge.
 */
export function clampCropSides(s: CropSides, changed?: CropSide): CropSides {
  const out = { ...s };
  for (const k of Object.keys(out) as CropSide[]) {
    const v = Number.isFinite(out[k]) ? out[k] : 0;
    out[k] = Math.min(MAX_CROP_SIDE, Math.max(0, v));
  }
  for (const [a, b] of [['top', 'bottom'], ['left', 'right']] as Array<[CropSide, CropSide]>) {
    if (out[a] + out[b] <= MAX_CROP_PAIR) continue;
    const give = changed === a || changed === b ? changed : b;
    out[give] = Math.max(0, MAX_CROP_PAIR - out[OPPOSITE[give]]);
  }
  return out;
}

/** Sets one side (percent), clamped, and returns the resulting crop. */
export function withCropSide(crop: ImageCrop | undefined, side: CropSide, value: number): ImageCrop | undefined {
  return sidesToCrop(clampCropSides({ ...cropToSides(crop), [side]: value }, side));
}

/**
 * New bounds for a shape when its crop changes, keeping the image's on-canvas
 * scale and the still-visible pixels in place (so cropping trims the edge you
 * edit instead of stretching the picture). Honours rotation and flips.
 */
export function rectForCrop(
  rect: Rect,
  from: ImageCrop | undefined,
  to: ImageCrop | undefined,
  opts: { rotation?: number; flipH?: boolean; flipV?: boolean } = {},
): Rect {
  const o = from ?? FULL_CROP;
  const n = to ?? FULL_CROP;
  const fullW = rect.w / o.w;
  const fullH = rect.h / o.h;
  const w = fullW * n.w;
  const h = fullH * n.h;
  // Center shift in the shape's local (unrotated, unflipped) frame.
  let dx = (n.x + n.w / 2 - (o.x + o.w / 2)) * fullW;
  let dy = (n.y + n.h / 2 - (o.y + o.h / 2)) * fullH;
  if (opts.flipH) dx = -dx;
  if (opts.flipV) dy = -dy;
  const a = ((opts.rotation ?? 0) * Math.PI) / 180;
  const cx = rect.x + rect.w / 2 + dx * Math.cos(a) - dy * Math.sin(a);
  const cy = rect.y + rect.h / 2 + dx * Math.sin(a) + dy * Math.cos(a);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Bounds at the image's natural pixel size (of the cropped part), keeping the center. */
export function rectForNaturalSize(rect: Rect, natural: { w: number; h: number }, crop?: ImageCrop): Rect {
  const c = crop ?? FULL_CROP;
  const w = Math.max(1, Math.round(natural.w * c.w));
  const h = Math.max(1, Math.round(natural.h * c.h));
  return { x: rect.x + rect.w / 2 - w / 2, y: rect.y + rect.h / 2 - h / 2, w, h };
}
