/**
 * Diagram animation as pure functions of time (docs/specs/animation.md).
 *
 * Nothing here mutates the document or uses CSS animations: given an element
 * and a time `t` in seconds, these return the visual state. The canvas
 * preview and the GIF exporter call the same functions, so exported frames
 * are identical to what the user previews.
 */
import { create } from 'zustand';
import type { ConnectorElement, DiagramElement, Doc, ShapeElement, Vec } from '@/model/types';
import { isConnector, isShape } from '@/model/types';
import { dist } from '@/lib/geometry';

/** Seconds per build-sequence step. */
export const STEP_DURATION = 0.8;
export const SHAPE_REVEAL = 0.18;
export const CONNECTOR_REVEAL = 0.4;
/** Hold on the final frame before the sequence loops. */
export const SEQUENCE_HOLD = 1.5;

export const FLOW_SPEED = 40; // px / s
export const DOT_SPEED = 120; // px / s
export const PULSE_PERIOD = 1.6; // s

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

// ---------------------------------------------------------------------------
// Build sequence
// ---------------------------------------------------------------------------

/** Effective step: connectors can't appear before both of their ends. */
export function effectiveReveal(el: DiagramElement, doc: Doc): number {
  let step = el.reveal ?? 0;
  if (isConnector(el)) {
    for (const end of [el.source, el.target]) {
      const other = end.elementId ? doc.elements[end.elementId] : undefined;
      if (other?.reveal) step = Math.max(step, other.reveal);
    }
  }
  return step;
}

export function maxRevealStep(doc: Doc): number {
  let max = 0;
  for (const id of doc.order) max = Math.max(max, effectiveReveal(doc.elements[id], doc));
  return max;
}

export function sequenceDuration(doc: Doc): number {
  const steps = maxRevealStep(doc);
  return steps ? steps * STEP_DURATION + SEQUENCE_HOLD : 0;
}

/** 0 = hidden, 1 = fully shown. Time wraps around the sequence length. */
export function revealProgress(step: number, isConn: boolean, t: number, seqDuration: number): number {
  if (!step || !seqDuration) return 1;
  const local = t % seqDuration;
  const start = (step - 1) * STEP_DURATION;
  return easeOut(clamp01((local - start) / (isConn ? CONNECTOR_REVEAL : SHAPE_REVEAL)));
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export interface ShapeFx {
  opacity: number;
  transform?: string;
  glow?: number;
}

export function shapeEffect(el: ShapeElement, t: number, reveal: number): ShapeFx {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  let scale = 1;
  let dy = 0;
  let glow: number | undefined;
  if (reveal < 1) scale *= 0.92 + 0.08 * reveal;
  const a = el.animation;
  if (a && a.kind !== 'none') {
    const phase = (t * (a.speed || 1)) / PULSE_PERIOD;
    const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
    if (a.kind === 'pulse') scale *= 1 + 0.045 * wave;
    if (a.kind === 'glow') glow = wave;
    if (a.kind === 'bounce') dy = -8 * Math.abs(Math.sin(phase * Math.PI));
  }
  const transform =
    scale !== 1 || dy !== 0
      ? `translate(${cx} ${cy + dy}) scale(${scale}) translate(${-cx} ${-cy})`
      : undefined;
  return { opacity: reveal, transform, glow };
}

export interface ConnectorFx {
  dashArray?: string;
  dashOffset?: number;
  /** Fraction of the path drawn (build sequence). */
  drawn: number;
  dots?: Vec[];
  glow?: number;
}

export function polylineLength(pts: Vec[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

function pointAt(pts: Vec[], d: number): Vec {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (acc + seg >= d && seg > 0) {
      const k = (d - acc) / seg;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
    }
    acc += seg;
  }
  return pts[pts.length - 1];
}

export const flowDash = (strokeWidth: number) => [8 + strokeWidth * 2, 6 + strokeWidth * 2] as const;

/**
 * `samples` is the connector's sampled route (from connectorGeometry), used
 * to place travelling dots on any routing style.
 */
export function connectorEffect(el: ConnectorElement, t: number, reveal: number, samples: Vec[]): ConnectorFx {
  const fx: ConnectorFx = { drawn: reveal };
  const a = el.animation;
  if (!a || a.kind === 'none') return fx;
  const speed = a.speed || 1;
  const dir = a.reverse ? 1 : -1;
  if (a.kind === 'flow') {
    const [on, off] = flowDash(el.style.strokeWidth);
    fx.dashArray = `${on} ${off}`;
    fx.dashOffset = dir * ((t * FLOW_SPEED * speed) % (on + off));
  } else if (a.kind === 'dots') {
    const len = polylineLength(samples);
    if (len > 0) {
      const count = len > 360 ? 3 : len > 160 ? 2 : 1;
      const travel = ((t * DOT_SPEED * speed) / len) % 1;
      fx.dots = Array.from({ length: count }, (_, k) => {
        const f = (travel + k / count) % 1;
        return pointAt(samples, (a.reverse ? 1 - f : f) * len);
      });
    }
  } else if (a.kind === 'pulse') {
    fx.glow = 0.5 - 0.5 * Math.cos(((t * speed) / PULSE_PERIOD) * Math.PI * 2);
  }
  return fx;
}

/** Whether a doc has anything to animate. */
export function hasAnimation(doc: Doc): boolean {
  return doc.order.some((id) => {
    const el = doc.elements[id];
    return (el.animation && el.animation.kind !== 'none') || !!el.reveal;
  });
}

/** Length of one seamless loop, for GIF "auto" duration. */
export function loopDuration(doc: Doc, sampleLengths: (c: ConnectorElement) => number): number {
  const seq = sequenceDuration(doc);
  if (seq) return Math.min(seq, 30);
  const periods: number[] = [];
  for (const id of doc.order) {
    const el = doc.elements[id];
    const a = el.animation;
    if (!a || a.kind === 'none') continue;
    const speed = a.speed || 1;
    if (isConnector(el) && a.kind === 'flow') {
      const [on, off] = flowDash(el.style.strokeWidth);
      periods.push((on + off) / (FLOW_SPEED * speed));
    } else if (isConnector(el) && a.kind === 'dots') {
      periods.push(sampleLengths(el) / (DOT_SPEED * speed));
    } else if (isShape(el) || a.kind === 'pulse') {
      periods.push(PULSE_PERIOD / speed);
    }
  }
  if (!periods.length) return 2;
  // Smallest duration (≤ 6 s) that's a near-whole multiple of every period.
  for (let d = Math.max(...periods); d <= 6; d += 0.05) {
    if (periods.every((p) => Math.abs(d / p - Math.round(d / p)) < 0.02)) return Math.round(d * 100) / 100;
  }
  return Math.min(6, Math.max(...periods));
}

// ---------------------------------------------------------------------------
// Preview clock
// ---------------------------------------------------------------------------

/** Global animation clock for the canvas preview. */
export const useClock = create<{ t: number }>(() => ({ t: 0 }));

let raf = 0;
export function startClock() {
  cancelAnimationFrame(raf);
  // Frame timestamps only: they follow the document's animation timeline, which can run slower or faster than performance.now().
  let last: number | undefined;
  const tick = (now: number) => {
    last ??= now;
    useClock.setState((s) => ({ t: s.t + (now - last!) / 1000 }));
    last = now;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
export function stopClock(reset = false) {
  cancelAnimationFrame(raf);
  if (reset) useClock.setState({ t: 0 });
}
