import { describe, expect, it } from 'vitest';
import type { Doc, DiagramElement } from '@/model/types';
import { createConnector, createShape } from '@/model/defaults';
import { effectiveHide, hasAnimation, hideProgress, revealProgress, sequenceDuration, STEP_DURATION } from '@/animation/timeline';
import { renderSvg } from '@/io/export/svg';

const docOf = (...els: DiagramElement[]): Doc => ({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) });
const at = (step: number) => (step - 1) * STEP_DURATION + 0.5;

describe('build sequence: leaving at a step', () => {
  it('fades an element out when its exit step starts', () => {
    const seq = sequenceDuration(docOf({ ...createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }), reveal: 2, hide: 4 }));
    const shown = (t: number) => revealProgress(2, false, t, seq) * hideProgress(4, t, seq);
    expect(shown(at(1))).toBe(0);
    expect(shown(at(2))).toBeCloseTo(1);
    expect(shown(at(3))).toBeCloseTo(1);
    expect(shown(at(4))).toBe(0);
    expect(hideProgress(0, at(9), seq)).toBe(1);
  });

  it('counts the exit step in the sequence length', () => {
    expect(sequenceDuration(docOf({ ...createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }), hide: 5 }))).toBeCloseTo(5 * STEP_DURATION + 1.5);
  });

  it('makes a connector leave no later than its ends', () => {
    const a = { ...createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }), hide: 3 };
    const b = createShape('rectangle', { x: 300, y: 0, w: 120, h: 60 });
    const c = createConnector({ x: 0, y: 0, elementId: a.id }, { x: 300, y: 0, elementId: b.id });
    const doc = docOf(a, b, c);
    expect(effectiveHide(c, doc)).toBe(3);
    expect(effectiveHide({ ...c, hide: 2 }, doc)).toBe(2);
    expect(effectiveHide({ ...c, hide: 6 }, doc)).toBe(3);
  });

  it('is an animation on its own', () => {
    expect(hasAnimation(docOf({ ...createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }), hide: 2 }))).toBe(true);
  });

  it('swaps two elements cleanly in exported frames', () => {
    const before = { ...createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }), text: 'before', hide: 2 };
    const after = { ...createShape('rectangle', { x: 0, y: 0, w: 120, h: 60 }), text: 'after', reveal: 2 };
    const doc = docOf(before, after);
    const seq = sequenceDuration(doc);
    const frame = (t: number) => renderSvg(doc, { background: null, embedFont: false, frame: { t, seq } }).svg;
    expect(frame(at(1))).toContain('before');
    expect(frame(at(1))).not.toContain('after');
    expect(frame(at(2))).toContain('after');
    expect(frame(at(2))).not.toContain('before');
  });
});
