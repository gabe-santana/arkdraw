import { describe, expect, it } from 'vitest';
import { CATEGORIES, TEMPLATES, searchTemplates } from '@/templates';
import { isConnector, isShape, type ShapeElement } from '@/model/types';
import { SHAPES } from '@/shapes/registry';

const area = (s: ShapeElement) => Math.max(0, s.w) * Math.max(0, s.h);

function overlap(a: ShapeElement, b: ShapeElement) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

describe('template catalog', () => {
  it('has at least 36 templates with unique ids, a blank one, and every category used', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(36);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(TEMPLATES.some((t) => t.id === 'blank')).toBe(true);
    for (const c of CATEGORIES) expect(TEMPLATES.some((t) => t.category === c), c).toBe(true);
    for (const t of TEMPLATES) {
      expect(t.name.trim(), t.id).not.toBe('');
      expect(t.description.trim(), t.id).not.toBe('');
      expect(t.keywords.length, t.id).toBeGreaterThan(0);
    }
  });

  it('searches names, categories and keywords', () => {
    expect(searchTemplates(TEMPLATES, 'kubernetes').map((t) => t.id)).toContain('kubernetes-app');
    expect(searchTemplates(TEMPLATES, 'AWS serverless').map((t) => t.id)).toEqual(['aws-serverless']);
    expect(searchTemplates(TEMPLATES, '').length).toBe(TEMPLATES.length);
  });
});

describe.each(TEMPLATES.map((t) => [t.id, t] as const))('template %s', (_id, t) => {
  const pages = t.build();

  it('builds at least one page with elements', () => {
    expect(pages.length).toBeGreaterThanOrEqual(1);
    if (t.id === 'blank') return;
    for (const p of pages) expect(p.doc.order.length, p.name).toBeGreaterThan(0);
  });

  it('has unique element ids, consistent order and known shape kinds', () => {
    const all = pages.flatMap((p) => p.doc.order);
    expect(new Set(all).size).toBe(all.length);
    for (const p of pages) {
      expect(Object.keys(p.doc.elements).sort()).toEqual([...p.doc.order].sort());
      for (const el of Object.values(p.doc.elements)) {
        if (isShape(el)) {
          expect(SHAPES[el.kind], `${el.kind} in ${p.name}`).toBeDefined();
          for (const v of [el.x, el.y, el.w, el.h]) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it('builds fresh ids on every call', () => {
    const again = t.build();
    const a = new Set(pages.flatMap((p) => p.doc.order));
    expect(again.flatMap((p) => p.doc.order).some((id) => a.has(id))).toBe(false);
  });

  it('only references existing shapes from connectors and containers', () => {
    for (const p of pages) {
      const els = p.doc.elements;
      for (const el of Object.values(els)) {
        if (isConnector(el)) {
          for (const end of [el.source, el.target]) {
            if (end.elementId) expect(isShape(els[end.elementId]), `${el.id} → ${end.elementId}`).toBe(true);
          }
        } else if (el.containerId) {
          expect(isShape(els[el.containerId]), `${el.id} in ${el.containerId}`).toBe(true);
        }
      }
    }
  });

  it('has no two sibling shapes overlapping more than 20% of the smaller one', () => {
    for (const p of pages) {
      const groups = new Map<string, ShapeElement[]>();
      for (const el of Object.values(p.doc.elements)) {
        if (!isShape(el)) continue;
        const key = el.containerId ?? '';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(el);
      }
      const bad: string[] = [];
      for (const list of groups.values()) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            const smaller = Math.min(area(a), area(b));
            if (smaller > 0 && overlap(a, b) > 0.2 * smaller) bad.push(`${a.kind} "${a.text.split('\n')[0]}" × ${b.kind} "${b.text.split('\n')[0]}"`);
          }
        }
      }
      expect(bad, p.name).toEqual([]);
    }
  });
});
