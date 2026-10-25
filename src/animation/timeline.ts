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
/** A shape's pop-in (springs past full size and settles). */
export const SHAPE_REVEAL = 0.5;
/** A connector drawing itself. */
export const CONNECTOR_REVEAL = 0.5;
/** Leaving: a quick shrink and fade. */
export const LEAVE_DURATION = 0.28;
/** Hold on the final frame before the sequence loops. */
export const SEQUENCE_HOLD = 1.5;

export const FLOW_SPEED = 40; // px / s
export const DOT_SPEED = 120; // px / s
export const PULSE_PERIOD = 1.6; // s

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeIn = (k: number) => k * k * k;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
/** Damped spring from 0 to 1: overshoots once (about 9%), then settles. */
const spring = (k: number) => (k >= 1 ? 1 : 1 - Math.exp(-5.5 * k) * Math.cos(2.8 * Math.PI * k));
/** Fraction of the connector drawn, `k` being its linear reveal progress. */
export const drawnFraction = (k: number) => easeInOut(clamp01(k));

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

/** Effective exit step: a connector leaves no later than the first of its ends (0 = never). */
export function effectiveHide(el: DiagramElement, doc: Doc): number {
  let step = el.hide ?? 0;
  if (isConnector(el)) {
    for (const end of [el.source, el.target]) {
      const other = end.elementId ? doc.elements[end.elementId] : undefined;
      if (other?.hide) step = step ? Math.min(step, other.hide) : other.hide;
    }
  }
  return step;
}

export function maxRevealStep(doc: Doc): number {
  let max = 0;
  for (const id of doc.order) {
    const el = doc.elements[id];
    max = Math.max(max, effectiveReveal(el, doc), el.hide ?? 0);
  }
  return max;
}

export function sequenceDuration(doc: Doc): number {
  const steps = maxRevealStep(doc);
  return steps ? steps * STEP_DURATION + SEQUENCE_HOLD : 0;
}

/**
 * Linear progress of the element's entrance: 0 = hidden, 1 = fully in. Effects
 * apply their own easing (shapes spring in, connectors draw). Time wraps around
 * the sequence length.
 */
export function revealProgress(step: number, isConn: boolean, t: number, seqDuration: number): number {
  if (!step || !seqDuration) return 1;
  const local = t % seqDuration;
  const start = (step - 1) * STEP_DURATION;
  return clamp01((local - start) / (isConn ? CONNECTOR_REVEAL : SHAPE_REVEAL));
}

/**
 * 1 = still shown, 0 = gone: the element fades out when its exit step starts.
 * An element leaving at the step another one appears at swaps cleanly with it.
 */
export function hideProgress(step: number, t: number, seqDuration: number): number {
  if (!step || !seqDuration) return 1;
  const local = t % seqDuration;
  const start = (step - 1) * STEP_DURATION;
  return 1 - easeIn(clamp01((local - start) / LEAVE_DURATION));
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export interface ShapeFx {
  opacity: number;
  transform?: string;
  glow?: number;
}

/**
 * `reveal`: linear entrance progress (0..1); `present`: 1 until the element
 * leaves, then down to 0 (see hideProgress).
 */
export function shapeEffect(el: ShapeElement, t: number, reveal: number, present = 1): ShapeFx {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  let scale = 1;
  let dy = 0;
  let glow: number | undefined;
  // Pops in: starts small, springs just past full size and settles, rising a little.
  if (reveal < 1) {
    scale *= 0.45 + 0.55 * spring(reveal);
    dy += 12 * (1 - easeOut(reveal));
  }
  // Leaves: shrinks a touch while it fades.
  if (present < 1) scale *= 0.85 + 0.15 * present;
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
  return { opacity: easeOut(clamp01(reveal * 2.2)) * present, transform, glow };
}

/** A pulse travelling along a connector: a bright head with a tapering trail. */
export interface Packet {
  head: Vec;
  /** Points behind the head, nearest first. */
  trail: Vec[];
  /** 0..1: packets fade in as they leave the source and out as they arrive. */
  alpha: number;
}

export interface ConnectorFx {
  dashArray?: string;
  dashOffset?: number;
  /** Fraction of the path drawn (build sequence). */
  drawn: number;
  packets?: Packet[];
  glow?: number;
}

const TRAIL = 7;

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
  const fx: ConnectorFx = { drawn: drawnFraction(reveal) };
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
      // Trail spacing grows with speed, so faster packets streak longer.
      const gap = Math.min(10, Math.max(3, len * 0.012)) * Math.sqrt(speed);
      fx.packets = Array.from({ length: count }, (_, k) => {
        const f = (travel + k / count) % 1;
        // Accelerates out of the source, brakes into the target.
        const d = easeInOut(f) * len;
        const at = (x: number) => pointAt(samples, a.reverse ? len - x : x);
        const trail = Array.from({ length: TRAIL }, (_, j) => at(Math.max(0, d - (j + 1) * gap * (0.6 + 0.8 * Math.sin(Math.PI * f)))));
        return { head: at(d), trail, alpha: clamp01(Math.min(f, 1 - f) / 0.1) };
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
    return (el.animation && el.animation.kind !== 'none') || !!el.reveal || !!el.hide;
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
