/** Where click-to-connect puts a new library item next to the selected shape. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Top-left for a `size` box placed `gap` to the right of `src`, vertically
 * centred on it; while that spot overlaps an obstacle, steps down by
 * `size.h + step`. Obstacles that fully enclose `src` (its containers) are
 * ignored, since the new item usually belongs in them too.
 */
export function placeBeside(src: Box, size: { w: number; h: number }, obstacles: Box[], gap = 60, step = 40, maxSteps = 200): Box {
  const encloses = (o: Box) => o.x <= src.x && o.y <= src.y && o.x + o.w >= src.x + src.w && o.y + o.h >= src.y + src.h;
  const blockers = obstacles.filter((o) => !encloses(o));
  const spot: Box = { x: src.x + src.w + gap, y: src.y + src.h / 2 - size.h / 2, w: size.w, h: size.h };
  for (let i = 0; i < maxSteps && blockers.some((o) => overlaps(spot, o)); i++) spot.y += size.h + step;
  return spot;
}
