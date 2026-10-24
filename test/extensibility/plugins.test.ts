/**
 * Plugin runtime: registration, the context API, disposal, persistence of the
 * plugin list, and loading the example plugins from docs/plugins/examples.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACTIONS, ACTION_MAP, registerAction, runAction } from '@/app/actions';
import { IMPORTERS } from '@/io/import';
import { useEditor } from '@/store/editor';
import { createShape } from '@/model/defaults';
import { useUi } from '@/store/ui';
import { useUserLibraries } from '@/panels/userLibraries';
import { getNamedStencil } from '@/stencils/registry';
import { menuItemsFor, withMenuExtensions } from '@/extensibility/menus';
import {
  installPluginGlobal, registerPlugin, registeredPlugins, removePlugin, setPluginEnabled, unregisterPlugin, usePlugins, type PluginContext,
} from '@/extensibility/plugins';
import { SAMPLE_STENCIL } from '@/stencils/StencilEditorDialog';
import '@/extensibility/actions';

beforeEach(() => {
  useEditor.getState().newDoc();
  for (const p of registeredPlugins()) unregisterPlugin(p.id);
});

describe('registerAction', () => {
  it('adds, replaces and removes runtime actions', () => {
    let n = 0;
    const off = registerAction({ id: 'test.x', label: 'X', group: 'Tools', run: () => n++ });
    expect(ACTION_MAP['test.x'].label).toBe('X');
    runAction('test.x');
    expect(n).toBe(1);
    const off2 = registerAction({ id: 'test.x', label: 'X2', group: 'Tools', run: () => (n += 10) });
    expect(ACTIONS.filter((a) => a.id === 'test.x')).toHaveLength(1);
    runAction('test.x');
    expect(n).toBe(11);
    off2();
    off();
    expect(ACTION_MAP['test.x']).toBeUndefined();
  });

  it('registers the extensibility actions', () => {
    for (const id of ['edit.editShape', 'arrange.insertShape', 'extras.plugins', 'view.uiMode.minimal', 'view.uiMode.sketch']) expect(ACTION_MAP[id], id).toBeDefined();
  });
});

describe('plugins', () => {
  it('validates the plugin object', async () => {
    await expect(registerPlugin({} as never)).rejects.toThrow(/id/);
    await expect(registerPlugin({ id: 'bad id!', activate() {} })).rejects.toThrow(/id/);
  });

  it('exposes actions, menus, shapes, formats, editor and ui, and disposes everything', async () => {
    let ctx!: PluginContext;
    let deactivated = false;
    const seen: number[] = [];
    await registerPlugin({
      id: 'demo',
      name: 'Demo',
      activate(c) {
        ctx = c;
        c.actions.register({ id: 'hello', label: 'Say hello', menu: 'Extras', run: () => c.ui.toast('hello') });
        c.shapes.registerLibrary({ id: 'lib', name: 'Demo shapes', shapes: [{ name: 'Tag', stencil: SAMPLE_STENCIL }] });
        c.shapes.registerStencil('demo.tag', SAMPLE_STENCIL);
        c.formats.registerImporter({ id: 'txt', label: 'Lines…', description: 'one shape per line', extensions: ['lines'], acceptsText: true, run: async () => ({ pages: [] }) });
        c.formats.registerExporter({ id: 'jsonl', label: 'JSON Lines', extension: 'jsonl', export: () => '' });
        c.editor.subscribe(({ doc }) => seen.push(doc.order.length));
      },
      deactivate: () => void (deactivated = true),
    });
    expect(usePlugins.getState().active.demo.name).toBe('Demo');
    expect(ACTION_MAP['plugin.demo.hello']).toBeDefined();
    expect(menuItemsFor('Extras')).toContain('plugin.demo.hello');
    expect(menuItemsFor('File')).toContain('plugin.demo.export.jsonl');
    expect(withMenuExtensions('Extras', ['a'], (id) => id, '-', (id) => !!ACTION_MAP[id])).toEqual(['a', '-', 'plugin.demo.hello']);
    expect(useUserLibraries.getState().libraries.find((l) => l.id === 'plugin:demo:lib')?.items[0].elements[0]).toMatchObject({ kind: 'stencil' });
    expect(getNamedStencil('demo.tag')).toBe(SAMPLE_STENCIL);
    expect(IMPORTERS.some((i) => i.id === 'plugin.demo.txt')).toBe(true);

    runAction('plugin.demo.hello');
    expect(useUi.getState().toasts.at(-1)?.message).toBe('hello');

    // Editor helpers: one undo step per transaction.
    const past = useEditor.getState().past.length;
    const [a, b] = ctx.editor.transact(() => [ctx.editor.addShape({ text: 'A', x: 0, y: 0 }), ctx.editor.addShape({ stencil: SAMPLE_STENCIL, x: 200, y: 0, w: 120, h: 60 })]);
    const c = ctx.editor.connect(a, b);
    expect(useEditor.getState().past.length).toBe(past + 2);
    expect(ctx.editor.getElement(b)).toMatchObject({ kind: 'stencil', connectionPoints: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] });
    expect(ctx.editor.getElement(c)).toMatchObject({ type: 'connector', source: { elementId: a }, target: { elementId: b } });
    ctx.editor.update(a, { text: 'A2', id: 'nope' } as never);
    expect(ctx.editor.getElement(a)?.text).toBe('A2');
    ctx.editor.setStyle([a], { fill: '#ff0000' });
    expect(ctx.editor.getElement(a)?.style.fill).toBe('#ff0000');
    ctx.editor.remove([c]);
    expect(ctx.editor.getElement(c)).toBeUndefined();
    expect(seen.length).toBeGreaterThan(0);
    expect(() => ctx.editor.connect(a, 'missing')).toThrow();

    unregisterPlugin('demo');
    expect(deactivated).toBe(true);
    expect(ACTION_MAP['plugin.demo.hello']).toBeUndefined();
    expect(menuItemsFor('Extras')).not.toContain('plugin.demo.hello');
    expect(useUserLibraries.getState().libraries.some((l) => l.id === 'plugin:demo:lib')).toBe(false);
    expect(getNamedStencil('demo.tag')).toBeUndefined();
    expect(IMPORTERS.some((i) => i.id === 'plugin.demo.txt')).toBe(false);
    const n = seen.length;
    ctx.editor.addShape({});
    expect(seen.length).toBe(n);
  });

  it('isolates errors thrown by plugin actions', async () => {
    await registerPlugin({ id: 'boom', activate: (c) => void c.actions.register({ id: 'go', label: 'Go', run: () => { throw new Error('kaput'); } }) });
    expect(() => runAction('plugin.boom.go')).not.toThrow();
    expect(useUi.getState().toasts.at(-1)).toMatchObject({ kind: 'error' });
  });

  it('installs window.ArkDraw and picks up queued plugins', async () => {
    let activated = false;
    window.ArkDrawPlugins = [{ id: 'queued', activate: () => void (activated = true) }];
    installPluginGlobal();
    expect(window.ArkDraw?.version).toBeTruthy();
    expect(typeof window.ArkDraw?.registerPlugin).toBe('function');
    expect(typeof window.ArkDraw?.loadPluginsFrom).toBe('function');
    await Promise.resolve();
    expect(activated).toBe(true);
  });

  it('runs the example plugins', async () => {
    installPluginGlobal();
    for (const file of ['word-count.js', 'export-json-lines.js']) {
      const code = readFileSync(resolve(process.cwd(), 'docs/plugins/examples', file), 'utf8');
      new Function(code)();
    }
    await Promise.resolve();
    expect(ACTION_MAP['plugin.word-count.count']).toBeDefined();
    expect(ACTION_MAP['plugin.json-lines.export.jsonl']).toBeDefined();
    useEditor.getState().addElements([createShape('rectangle', { x: 0, y: 0, w: 10, h: 10 }, {}, 'two words')]);
    runAction('plugin.word-count.count');
    expect(useUi.getState().toasts.at(-1)?.message).toMatch(/word/);
  });

  it('persists the plugin list and toggles entries', async () => {
    usePlugins.setState({ entries: [{ source: 'https://example.com/p.js', enabled: true }] });
    useUi.setState({ ask: async () => 'confirm' } as never);
    await setPluginEnabled('https://example.com/p.js', false);
    expect(usePlugins.getState().entries[0].enabled).toBe(false);
    expect(JSON.parse(localStorage.getItem('arkdraw:plugins')!)[0]).toMatchObject({ source: 'https://example.com/p.js', enabled: false });
    removePlugin('https://example.com/p.js');
    expect(usePlugins.getState().entries).toEqual([]);
  });
});
