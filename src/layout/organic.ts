/**
 * Organic (force-directed) layout: Fruchterman–Reingold with linear cooling.
 * Forces act on the gaps between node circumcircles rather than center
 * distances, so large shapes push harder. Starts from the current positions
 * plus a small seeded jitter (deterministic: same input, same output), adds
 * weak gravity so disconnected parts stay together, and finishes with an
 * overlap-removal pass.
 */
import type { Vec } from '@/model/types';
import { hashString, makeRun, seededRandom, type LGraph } from './engine';
import type { LayoutAlgorithm, LayoutOptions } from './types';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Pushes overlapping boxes apart (keeping `gap` between them) along the
 * axis of least penetration; falls back to a sweep that guarantees no
 * overlap. Mutates `boxes`.
 */
export function removeOverlaps(boxes: Box[], gap: number) {
  const hit = (a: Box, b: Box) =>
    a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (!hit(a, b)) continue;
        moved = true;
        const acx = a.x + a.w / 2;
        const bcx = b.x + b.w / 2;
        const acy = a.y + a.h / 2;
        const bcy = b.y + b.h / 2;
        const px = (a.w + b.w) / 2 + gap - Math.abs(acx - bcx);
        const py = (a.h + b.h) / 2 + gap - Math.abs(acy - bcy);
        if (px <= py) {
          const s = (acx < bcx || (acx === bcx && i < j) ? -1 : 1) * (px / 2 + 0.5);
          a.x += s;
          b.x -= s;
        } else {
          const s = (acy < bcy || (acy === bcy && i < j) ? -1 : 1) * (py / 2 + 0.5);
          a.y += s;
          b.y -= s;
        }
      }
    }
    if (!moved) return;
  }
  // Guaranteed fallback: place boxes one by one, sliding right past conflicts.
  const order = boxes.map((_, i) => i).sort((i, j) => boxes[i].x - boxes[j].x || i - j);
  const placed: Box[] = [];
  for (const i of order) {
    const b = boxes[i];
    for (let guard = 0; guard < boxes.length + 1; guard++) {
      const c = placed.find((p) => hit(p, b));
      if (!c) break;
      b.x = c.x + c.w + gap + 0.5;
    }
    placed.push(b);
  }
}

function place(g: LGraph, o: LayoutOptions): Map<string, Vec> {
  const nodes = [...g.nodes].sort((a, b) => a.index - b.index);
  const n = nodes.length;
  const idx = new Map(nodes.map((v, i) => [v.id, i]));
  const rand = seededRandom(hashString(nodes.map((v) => v.id).join('|')));
  const rad = nodes.map((v) => Math.hypot(v.w, v.h) / 2);
  const meanD = rad.reduce((s, r) => s + 2 * r, 0) / Math.max(1, n);
  const k = Math.max(30, o.levelSpacing);

  const px = nodes.map((v) => v.x + v.w / 2 + (rand() - 0.5) * k * 0.2);
  const py = nodes.map((v) => v.y + v.h / 2 + (rand() - 0.5) * k * 0.2);
  const edges = g.edges.map((e) => [idx.get(e.from)!, idx.get(e.to)!] as const);

  const iters = n > 300 ? Math.max(40, Math.floor(90000 / n)) : 300;
  const t0 = Math.max(k, meanD) * Math.sqrt(Math.max(1, n)) * 0.5;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  for (let it = 0; it < iters; it++) {
    const t = t0 * (1 - it / iters) + 1;
    dx.fill(0);
    dy.fill(0);
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cx += px[i];
      cy += py[i];
    }
    cx /= n;
    cy /= n;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ex = px[i] - px[j];
        let ey = py[i] - py[j];
        let d = Math.hypot(ex, ey);
        if (d < 1e-6) {
          ex = rand() - 0.5;
          ey = rand() - 0.5;
          d = Math.hypot(ex, ey);
        }
        const gapD = Math.max(d - rad[i] - rad[j], k * 0.05);
        const f = (k * k) / gapD;
        const fx = (ex / d) * f;
        const fy = (ey / d) * f;
        dx[i] += fx;
        dy[i] += fy;
        dx[j] -= fx;
        dy[j] -= fy;
      }
    }
    for (const [a, b] of edges) {
      const ex = px[a] - px[b];
      const ey = py[a] - py[b];
      const d = Math.hypot(ex, ey);
      if (d < 1e-6) continue;
      const gapD = Math.max(d - rad[a] - rad[b], 0);
      const f = (gapD * gapD) / k;
      const fx = (ex / d) * f;
      const fy = (ey / d) * f;
      dx[a] -= fx;
      dy[a] -= fy;
      dx[b] += fx;
      dy[b] += fy;
    }
    for (let i = 0; i < n; i++) {
      // Weak gravity keeps disconnected components close.
      dx[i] += (cx - px[i]) * 0.02 * Math.sqrt(n);
      dy[i] += (cy - py[i]) * 0.02 * Math.sqrt(n);
      const len = Math.hypot(dx[i], dy[i]);
      if (len < 1e-9) continue;
      const step = Math.min(len, t);
      px[i] += (dx[i] / len) * step;
      py[i] += (dy[i] / len) * step;
    }
  }

  const boxes: Box[] = nodes.map((v, i) => ({ x: px[i] - v.w / 2, y: py[i] - v.h / 2, w: v.w, h: v.h }));
  removeOverlaps(boxes, Math.max(10, o.nodeSpacing / 2));
  return new Map(nodes.map((v, i) => [v.id, { x: boxes[i].x, y: boxes[i].y }]));
}

export const layout: LayoutAlgorithm = {
  id: 'organic',
  label: 'Organic',
  description: 'Force-directed layout (Fruchterman–Reingold), deterministic and size-aware.',
  run: makeRun(place),
};
