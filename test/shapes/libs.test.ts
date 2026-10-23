/**
 * Sanity checks for the auto-discovered shape libraries in src/shapes/libs.
 */
import { describe, expect, it } from 'vitest';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_STYLE } from '@/model/defaults';
import type { ShapeDef, ShapeLibrary } from '@/shapes/types';
import { SHAPES } from '@/shapes/registry';
import { LIBRARIES } from '@/shapes/libraries';

const MODULES = import.meta.glob<{ shapes?: ShapeDef[]; libraries?: ShapeLibrary[] }>('../../src/shapes/libs/*.tsx', { eager: true });
const libShapes = Object.values(MODULES).flatMap((m) => m.shapes ?? []);
const libLibraries = Object.values(MODULES).flatMap((m) => m.libraries ?? []);

const SIZES: Array<[number, number]> = [
  [38, 38],
  [140, 80],
  [12, 200],
  [600, 240],
];

describe('shape libraries (src/shapes/libs)', () => {
  it('contributes shapes and libraries', () => {
    expect(libShapes.length).toBeGreaterThan(300);
    expect(libLibraries.length).toBeGreaterThan(15);
  });

  it('defines every new kind exactly once and registers it', () => {
    const seen = new Set<string>();
    for (const def of libShapes) {
      expect(seen.has(def.kind), `duplicate kind ${def.kind}`).toBe(false);
      seen.add(def.kind);
      expect(def.kind, 'kind must be <lib>.<name>').toMatch(/^[a-z0-9]+\.[A-Za-z0-9.]+$/);
      expect(SHAPES[def.kind], `${def.kind} not registered`).toBe(def);
      expect(def.label.trim()).not.toBe('');
    }
  });

  it('has unique library ids', () => {
    const ids = LIBRARIES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('references only existing kinds from library items', () => {
    for (const lib of libLibraries) {
      expect(lib.items.length, `${lib.name} is empty`).toBeGreaterThan(0);
      for (const it of lib.items) {
        expect(SHAPES[it.kind], `${lib.name} › ${it.label}: unknown kind ${it.kind}`).toBeDefined();
        expect(it.w).toBeGreaterThan(0);
        expect(it.h).toBeGreaterThan(0);
      }
    }
  });

  it('has a non-empty draw.io style for every shape', () => {
    for (const def of libShapes) expect(def.drawio.trim(), def.kind).not.toBe('');
  });

  it('renders every shape at several sizes without throwing or producing NaN', () => {
    const texts = ['', 'Label', 'Title\nSecond line\nThird'];
    for (const def of libShapes) {
      for (const [w, h] of SIZES) {
        for (const text of texts) {
          const markup = renderToStaticMarkup(
            createElement('svg', null, createElement(Fragment, null, def.render({ w, h, style: { ...DEFAULT_STYLE }, text }))),
          );
          expect(markup, `${def.kind} @${w}x${h}`).not.toMatch(/NaN|Infinity|undefined/);
        }
        const box = def.textBox?.(w, h);
        if (box) for (const v of [box.x, box.y, box.w, box.h]) expect(Number.isFinite(v), `${def.kind} textBox`).toBe(true);
      }
    }
  }, 60000);

  it('renders every library item with its preset style and text', () => {
    for (const lib of libLibraries) {
      for (const it of lib.items) {
        const def = SHAPES[it.kind];
        const markup = renderToStaticMarkup(
          createElement('svg', null, def.render({ w: it.w, h: it.h, style: { ...DEFAULT_STYLE, ...it.style }, text: it.text ?? '' })),
        );
        expect(markup, `${lib.name} › ${it.label}`).not.toMatch(/NaN|Infinity/);
      }
    }
  }, 30000);
});
