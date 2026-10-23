import { describe, expect, it } from 'vitest';
import {
  clampCropSides, cropToSides, fitImageSize, imageMimeFromUrl, isImageUrl, normalizeImageUrl, rectForCrop,
  rectForNaturalSize, sidesToCrop, withCropSide, MAX_CROP_PAIR,
} from '@/lib/images';

describe('isImageUrl', () => {
  it('accepts http(s) URLs ending in an image extension', () => {
    expect(isImageUrl('https://example.com/a/b/photo.PNG')).toBe(true);
    expect(isImageUrl('  http://x.org/p.jpeg?size=large#frag  ')).toBe(true);
    for (const ext of ['jpg', 'gif', 'webp', 'svg']) expect(isImageUrl(`https://x.org/i.${ext}`)).toBe(true);
  });
  it('accepts data:image URIs, including SVG text with spaces', () => {
    expect(isImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isImageUrl('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10"></svg>')).toBe(true);
  });
  it('rejects text, non-image URLs and other schemes', () => {
    expect(isImageUrl('hello world')).toBe(false);
    expect(isImageUrl('https://example.com/page.html')).toBe(false);
    expect(isImageUrl('https://example.com/photo.png and more text')).toBe(false);
    expect(isImageUrl('ftp://example.com/photo.png')).toBe(false);
    expect(isImageUrl('data:text/plain,hi.png')).toBe(false);
    expect(isImageUrl('photo.png')).toBe(false);
    expect(isImageUrl('')).toBe(false);
  });
});

describe('normalizeImageUrl', () => {
  it('accepts http(s) and data:image, resolving relative paths against a base', () => {
    expect(normalizeImageUrl(' https://x.org/a b.png ')).toBe('https://x.org/a%20b.png');
    expect(normalizeImageUrl('data:image/gif;base64,R0lG')).toBe('data:image/gif;base64,R0lG');
    expect(normalizeImageUrl('/app-icon.svg', 'http://localhost:1420/some/page')).toBe('http://localhost:1420/app-icon.svg');
    // Extension-less URLs are fine for an explicit insert (the server decides).
    expect(normalizeImageUrl('https://picsum.photos/200')).toBe('https://picsum.photos/200');
  });
  it('rejects junk and non-image data URIs', () => {
    expect(normalizeImageUrl('')).toBeNull();
    expect(normalizeImageUrl('not a url')).toBeNull();
    expect(normalizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeImageUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(normalizeImageUrl('/rel.png')).toBeNull();
  });
});

describe('imageMimeFromUrl', () => {
  it('maps extensions to MIME types', () => {
    expect(imageMimeFromUrl('https://x.org/a.svg?v=1')).toBe('image/svg+xml');
    expect(imageMimeFromUrl('https://x.org/a.JPG')).toBe('image/jpeg');
    expect(imageMimeFromUrl('https://x.org/a.webp')).toBe('image/webp');
    expect(imageMimeFromUrl('https://x.org/a')).toBeNull();
  });
});

describe('fitImageSize', () => {
  it('scales the longest side down to the max, keeping aspect', () => {
    expect(fitImageSize(960, 480)).toEqual({ w: 480, h: 240 });
    expect(fitImageSize(300, 1200, 400)).toEqual({ w: 100, h: 400 });
  });
  it('never scales up and falls back for bad sizes', () => {
    expect(fitImageSize(64, 32)).toEqual({ w: 64, h: 32 });
    expect(fitImageSize(0, 10)).toEqual({ w: 200, h: 150 });
    expect(fitImageSize(NaN, 10)).toEqual({ w: 200, h: 150 });
  });
});

describe('crop sides', () => {
  it('round-trips between ImageCrop fractions and inset percentages', () => {
    const crop = { x: 0.1, y: 0.2, w: 0.6, h: 0.5 };
    const s = cropToSides(crop);
    expect(s).toEqual({ top: 20, left: 10, right: 30, bottom: 30 });
    const back = sidesToCrop(s)!;
    expect(back.x).toBeCloseTo(0.1);
    expect(back.y).toBeCloseTo(0.2);
    expect(back.w).toBeCloseTo(0.6);
    expect(back.h).toBeCloseTo(0.5);
  });
  it('treats no crop as zero insets, and zero insets as no crop', () => {
    expect(cropToSides(undefined)).toEqual({ top: 0, left: 0, right: 0, bottom: 0 });
    expect(sidesToCrop({ top: 0, left: 0, right: 0, bottom: 0 })).toBeUndefined();
  });
  it('clamps each side to 0..90', () => {
    expect(clampCropSides({ top: -5, right: 120, bottom: 0, left: NaN })).toEqual({ top: 0, right: 90, bottom: 0, left: 0 });
  });
  it('keeps opposite sides below 95% by shrinking the side being edited', () => {
    const s = clampCropSides({ top: 50, bottom: 60, left: 10, right: 10 }, 'bottom');
    expect(s.top).toBe(50);
    expect(s.bottom).toBe(MAX_CROP_PAIR - 50);
    expect(s.top + s.bottom).toBeLessThan(95);
    const t = clampCropSides({ top: 80, bottom: 30, left: 0, right: 0 }, 'top');
    expect(t).toEqual({ top: MAX_CROP_PAIR - 30, bottom: 30, left: 0, right: 0 });
    // Without a hint the second side of the pair gives way.
    const u = clampCropSides({ top: 0, bottom: 0, left: 70, right: 70 });
    expect(u.left).toBe(70);
    expect(u.left + u.right).toBeLessThan(95);
  });
  it('withCropSide sets one side and keeps the rest', () => {
    const c = withCropSide(undefined, 'left', 25)!;
    expect(c).toEqual({ x: 0.25, y: 0, w: 0.75, h: 1 });
    expect(withCropSide(c, 'left', 0)).toBeUndefined();
    const big = withCropSide({ x: 0, y: 0, w: 0.5, h: 1 }, 'left', 80)!; // right is 50 → left capped at 44
    expect(big.x).toBeCloseTo(0.44);
    expect(big.w).toBeCloseTo(0.06);
  });
});

describe('rectForCrop', () => {
  const rect = { x: 100, y: 100, w: 200, h: 100 };
  it('trims the cropped edge and keeps the image scale', () => {
    // Crop 25% off the left: width drops by a quarter, the right edge stays put.
    const r = rectForCrop(rect, undefined, { x: 0.25, y: 0, w: 0.75, h: 1 });
    expect(r.w).toBeCloseTo(150);
    expect(r.h).toBeCloseTo(100);
    expect(r.x).toBeCloseTo(150);
    expect(r.x + r.w).toBeCloseTo(300);
    expect(r.y).toBeCloseTo(100);
  });
  it('restores the original rect when the crop is reset', () => {
    const crop = { x: 0.1, y: 0.2, w: 0.5, h: 0.6 };
    const cropped = rectForCrop(rect, undefined, crop);
    const back = rectForCrop(cropped, crop, undefined);
    expect(back.x).toBeCloseTo(rect.x);
    expect(back.y).toBeCloseTo(rect.y);
    expect(back.w).toBeCloseTo(rect.w);
    expect(back.h).toBeCloseTo(rect.h);
  });
  it('mirrors the shift for flipped images', () => {
    const r = rectForCrop(rect, undefined, { x: 0.25, y: 0, w: 0.75, h: 1 }, { flipH: true });
    // Flipped: the source's left edge is drawn on the right, so the left edge stays put.
    expect(r.x).toBeCloseTo(100);
    expect(r.w).toBeCloseTo(150);
  });
  it('moves the center along the rotated axis', () => {
    const r = rectForCrop(rect, undefined, { x: 0.25, y: 0, w: 0.75, h: 1 }, { rotation: 90 });
    // Local +x is world +y after a 90° rotation: center shifts down by 25, not right.
    expect(r.x + r.w / 2).toBeCloseTo(200);
    expect(r.y + r.h / 2).toBeCloseTo(175);
  });
});

describe('rectForNaturalSize', () => {
  it('uses the natural size of the cropped part, keeping the center', () => {
    const r = rectForNaturalSize({ x: 0, y: 0, w: 100, h: 100 }, { w: 800, h: 400 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 });
    expect(r).toEqual({ x: -150, y: -50, w: 400, h: 200 });
    expect(rectForNaturalSize({ x: 0, y: 0, w: 10, h: 10 }, { w: 64, h: 32 })).toEqual({ x: -27, y: -11, w: 64, h: 32 });
  });
});
