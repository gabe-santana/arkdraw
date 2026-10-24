import { describe, expect, it } from 'vitest';
import { createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';
import { serializePages } from '@/io/fileFormat';
import { docOrigin, offerOrigin, setOrigin } from '@/storage/origin';
import { makeEntry } from '@/storage/library';
import { pagesForScope, toTemplate } from '@/storage/userTemplates';

const page = () => newPage('P', { elements: { s: { ...createShape('rectangle', { x: 0, y: 0, w: 80, h: 40 }, {}, 'Hi'), id: 's' } }, order: ['s'] });

describe('document origin tracking', () => {
  it('adopts an offered origin on the next load and clears it on other loads', () => {
    offerOrigin({ kind: 'library', id: 'doc-1' });
    useEditor.getState().loadPages([page()], { path: null, name: 'A' });
    expect(docOrigin()).toEqual({ kind: 'library', id: 'doc-1' });
    // Saving keeps it (markSaved doesn't replace pages).
    useEditor.getState().markSaved(null, 'A');
    expect(docOrigin()).toEqual({ kind: 'library', id: 'doc-1' });
    useEditor.getState().newDoc();
    expect(docOrigin()).toBeNull();
    // Handles for non-ArkDraw files are never written back.
    offerOrigin({ kind: 'handle', handle: { name: 'x.drawio' } as FileSystemFileHandle });
    useEditor.getState().loadPages([page()], { path: null, name: 'x' });
    expect(docOrigin()).toBeNull();
    setOrigin(null);
  });
});

describe('browser library entries and user templates', () => {
  it('summarises a document with a thumbnail', () => {
    const e = makeEntry('Report.arkdraw', serializePages([page(), newPage('Empty')]));
    expect(e).toMatchObject({ name: 'Report', pages: 2, elements: 1 });
    expect(e.thumb?.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('builds templates with fresh ids every time and captures the selection', () => {
    const t = toTemplate({ id: 't1', name: 'Mine', description: '', created: 0, data: serializePages([page()]) });
    expect(t.id).toBe('user:t1');
    const a = t.build()[0];
    const b = t.build()[0];
    expect(a.doc.order[0]).not.toBe(b.doc.order[0]);
    expect(a.doc.elements[a.doc.order[0]].text).toBe('Hi');
    useEditor.getState().loadPages([page()], { path: null, name: 'x' });
    useEditor.getState().select(['s']);
    expect(pagesForScope('selection')[0].doc.order).toEqual(['s']);
  });
});
