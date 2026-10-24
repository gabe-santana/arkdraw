import { describe, expect, it } from 'vitest';
import { classifyLink, editorUrl, fitCamera, toggleableLayers, visibleOrder, withLayerOverrides } from '@/viewer/model';
import { nameFromUrl, pagesFromContent } from '@/web/loadDiagram';
import { decodeShareHash } from '@/web/shareLink';
import { newPage } from '@/store/editor';
import { parsePages, serializePages } from '@/io/fileFormat';
import type { Doc, ShapeElement } from '@/model/types';
import { DEFAULT_STYLE } from '@/model/defaults';

const shape = (id: string, layerId?: string): ShapeElement => ({
  id,
  type: 'shape',
  kind: 'rectangle',
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  text: '',
  groupIds: [],
  style: { ...DEFAULT_STYLE },
  ...(layerId ? { layerId } : {}),
});

const layered: Doc = {
  elements: { a: shape('a', 'l1'), b: shape('b', 'l2') },
  order: ['a', 'b'],
  layers: [
    { id: 'l1', name: 'Base', visible: true, locked: false },
    { id: 'l2', name: 'Notes', visible: false, locked: false },
  ],
};

describe('viewer model', () => {
  it('applies layer toggles on top of authored visibility', () => {
    expect(visibleOrder(layered)).toEqual(['a']);
    expect(visibleOrder(withLayerOverrides(layered, { l2: true }))).toEqual(['a', 'b']);
    expect(visibleOrder(withLayerOverrides(layered, { l1: false }))).toEqual([]);
    expect(toggleableLayers(layered).map((l) => l.name)).toEqual(['Base', 'Notes']);
    expect(toggleableLayers({ elements: {}, order: [] })).toEqual([]);
  });

  it('classifies links safely', () => {
    const pages = [{ id: 'p1' }, { id: 'p2' }];
    expect(classifyLink('page:p2', pages)).toEqual({ kind: 'page', pageId: 'p2' });
    expect(classifyLink('page:gone', pages)).toEqual({ kind: 'invalid' });
    expect(classifyLink('example.com/docs', pages)).toEqual({ kind: 'external', url: 'https://example.com/docs' });
    expect(classifyLink('mailto:a@b.c', pages)).toEqual({ kind: 'external', url: 'mailto:a@b.c' });
    expect(classifyLink('javascript:alert(1)', pages)).toEqual({ kind: 'invalid' });
    expect(classifyLink('data:text/html,x', pages)).toEqual({ kind: 'invalid' });
  });

  it('fits content into the viewport, capped at 100%', () => {
    const c = fitCamera({ x: 0, y: 0, w: 2000, h: 1000 }, 1000, 600, { top: 0, right: 0, bottom: 0, left: 0 });
    expect(c.z).toBeCloseTo(0.5);
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(50);
    expect(fitCamera({ x: 0, y: 0, w: 10, h: 10 }, 1000, 600).z).toBe(1);
  });

  it('hands the same diagram to the editor', () => {
    const pages = [newPage('One', layered), newPage('Two')];
    const href = editorUrl('https://d.example.com/?viewer=1&toolbar=0#Rold', { source: { kind: 'inline', hash: '#Rold' } }, pages, 1);
    const url = new URL(href);
    expect(url.searchParams.get('viewer')).toBeNull();
    expect(url.searchParams.get('toolbar')).toBeNull();
    expect(url.searchParams.get('page')).toBe('2');
    expect(parsePages(decodeShareHash(url.hash)).map((p) => p.name)).toEqual(['One', 'Two']);

    const fromUrl = editorUrl('https://d.example.com/?lightbox=1&url=https%3A%2F%2Fx.org%2Fa.drawio', { source: { kind: 'url', url: 'https://x.org/a.drawio' } }, pages, 0);
    expect(fromUrl).toBe('https://d.example.com/?url=https%3A%2F%2Fx.org%2Fa.drawio');
  });
});

describe('loadDiagram', () => {
  it('parses ArkDraw JSON and mxGraph XML', async () => {
    const json = serializePages([newPage('Only', layered)]);
    expect((await pagesFromContent(json)).map((p) => p.name)).toEqual(['Only']);
    expect((await pagesFromContent(new TextEncoder().encode(`﻿${json}`))).length).toBe(1);
    const xml = '<mxfile><diagram name="D1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
    expect((await pagesFromContent(xml)).map((p) => p.name)).toEqual(['D1']);
  });

  it('rejects unknown content', async () => {
    await expect(pagesFromContent('hello')).rejects.toThrow(/Unrecognized/);
    await expect(pagesFromContent('   ')).rejects.toThrow(/empty/);
  });

  it('derives a document name from the URL', () => {
    expect(nameFromUrl('https://x.org/docs/Network%20Map.drawio')).toBe('Network Map');
    expect(nameFromUrl('https://x.org/a/flow.drawio.png')).toBe('flow');
    expect(nameFromUrl('https://x.org/')).toBe('Shared diagram');
  });
});
