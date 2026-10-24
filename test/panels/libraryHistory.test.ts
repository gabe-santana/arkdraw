import { beforeEach, describe, expect, it } from 'vitest';
import { createShape } from '@/model/defaults';
import { LIBRARIES } from '@/shapes/libraries';
import { hasRef, parseRefs, pushRecent, refKey, toggleRef, RECENT_LIMIT, type LibraryRef, recordElementsUse, useLibraryHistory } from '@/panels/libraryHistory';
import { placeBeside } from '@/panels/libraryPlacement';

const shape = (label: string, libraryId = 'general'): LibraryRef => ({ type: 'shape', libraryId, label });
const icon = (iconId: string, provider = 'aws'): LibraryRef => ({ type: 'icon', provider, iconId });

describe('recent list', () => {
  it('puts the latest item first', () => {
    const list = pushRecent(pushRecent([], shape('Rectangle')), icon('ec2'));
    expect(list.map(refKey)).toEqual(['icon:aws:ec2', 'shape:general:Rectangle']);
  });

  it('dedupes by moving an existing item to the front', () => {
    let list: LibraryRef[] = [];
    for (const l of ['A', 'B', 'C']) list = pushRecent(list, shape(l));
    list = pushRecent(list, shape('A'));
    expect(list.map((r) => (r as { label: string }).label)).toEqual(['A', 'C', 'B']);
  });

  it('distinguishes the same label in different libraries and providers', () => {
    let list = pushRecent([], shape('Box', 'general'));
    list = pushRecent(list, shape('Box', 'flowchart'));
    list = pushRecent(list, icon('x', 'aws'));
    list = pushRecent(list, icon('x', 'gcp'));
    expect(list).toHaveLength(4);
  });

  it('keeps at most the limit', () => {
    let list: LibraryRef[] = [];
    for (let i = 0; i < 30; i++) list = pushRecent(list, shape(`S${i}`));
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0]).toEqual(shape('S29'));
    expect(pushRecent(list, shape('new'), 3)).toHaveLength(3);
  });
});

describe('favorites', () => {
  it('toggles on and off', () => {
    const on = toggleRef([], icon('s3'));
    expect(hasRef(on, icon('s3'))).toBe(true);
    const off = toggleRef(on, { type: 'icon', provider: 'aws', iconId: 's3' });
    expect(off).toEqual([]);
  });

  it('appends new favorites in order', () => {
    const list = toggleRef(toggleRef([], shape('A')), shape('B'));
    expect(list.map(refKey)).toEqual(['shape:general:A', 'shape:general:B']);
  });
});

describe('persistence parsing', () => {
  it('drops malformed and duplicate entries', () => {
    const json = JSON.stringify([shape('A'), { type: 'shape', label: 'no lib' }, 'junk', null, icon('x'), shape('A')]);
    expect(parseRefs(json)).toEqual([shape('A'), icon('x')]);
  });

  it('survives garbage', () => {
    expect(parseRefs('{not json')).toEqual([]);
    expect(parseRefs('{"a":1}')).toEqual([]);
    expect(parseRefs(null)).toEqual([]);
  });
});

describe('store', () => {
  beforeEach(() => localStorage.clear());

  it('persists favorites and recent to localStorage', async () => {
    const { useLibraryHistory } = await import('@/panels/libraryHistory');
    const s = useLibraryHistory.getState();
    s.toggleFavorite(shape('Ellipse'));
    s.recordUse(icon('lambda'));
    expect(parseRefs(localStorage.getItem('opendraw:library-favorites'))).toEqual([shape('Ellipse')]);
    expect(parseRefs(localStorage.getItem('opendraw:library-recent'))).toEqual([icon('lambda')]);
    useLibraryHistory.getState().clearRecent();
    expect(useLibraryHistory.getState().recent).toEqual([]);
    expect(localStorage.getItem('opendraw:library-recent')).toBe('[]');
  });
});

describe('placeBeside', () => {
  const src = { x: 0, y: 0, w: 120, h: 60 };
  const size = { w: 100, h: 40 };

  it('goes 60px to the right, vertically centred', () => {
    expect(placeBeside(src, size, [])).toEqual({ x: 180, y: 10, w: 100, h: 40 });
  });

  it('steps down by h + 40 while the spot is taken', () => {
    const taken = [
      { x: 180, y: 0, w: 100, h: 60 }, // blocks y=10
      { x: 200, y: 90, w: 50, h: 20 }, // blocks y=90
    ];
    expect(placeBeside(src, size, taken).y).toBe(10 + 2 * 80);
  });

  it('ignores obstacles that do not overlap, and touching edges', () => {
    const near = [
      { x: 0, y: 200, w: 500, h: 50 },
      { x: 280, y: 10, w: 40, h: 40 }, // touches the right edge only
    ];
    expect(placeBeside(src, size, near).y).toBe(10);
  });

  it('ignores containers enclosing the source', () => {
    const container = { x: -20, y: -20, w: 600, h: 400 };
    expect(placeBeside(src, size, [container])).toEqual({ x: 180, y: 10, w: 100, h: 40 });
  });
});

describe('recordElementsUse', () => {
  it('puts the shapes a generated diagram used in Recent, first element first', async () => {
    useLibraryHistory.getState().clearRecent();
    const els = [
      createShape('cylinder', { x: 0, y: 0, w: 80, h: 80 }, {}, 'DB'),
      createShape('rectangle', { x: 0, y: 0, w: 80, h: 40 }, {}, 'API'),
      createShape('cylinder', { x: 0, y: 0, w: 80, h: 80 }, {}, 'Cache'),
      createShape('text', { x: 0, y: 0, w: 80, h: 20 }, {}, 'note'),
    ];
    await recordElementsUse(els);
    const recent = useLibraryHistory.getState().recent;
    expect(recent).toHaveLength(2);
    expect(recent[0]).toMatchObject({ type: 'shape', label: LIBRARIES.flatMap((l) => l.items).find((i) => i.kind === 'cylinder')!.label });
  });
});
