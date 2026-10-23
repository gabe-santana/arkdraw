import { describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';
import { ACTION_MAP } from '@/app/actions';
import { AutomationHost } from '@/automation/AutomationHost';
import { useAutomationUi, type AutomationDialog } from '@/automation/ui';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('automation dialogs render', () => {
  it('registers commands', () => {
    for (const id of ['file.saveTemplate', 'file.properties', 'file.embed', 'edit.pageData', 'edit.mermaid', 'extras.configuration', 'extras.explore', 'extras.anonymize', 'extras.replay', 'layout.parallelEdges', 'layout.fromJson']) {
      expect(ACTION_MAP[id], id).toBeTruthy();
    }
    expect(ACTION_MAP['file.print'].run.toString()).toContain('print');
  });

  it('mounts every dialog without crashing', async () => {
    useEditor.getState().loadPages([newPage('P', { elements: { s: { ...createShape('rectangle', { x: 0, y: 0, w: 80, h: 40 }, {}, 'Hi'), id: 's' } }, order: ['s'] })], { path: null, name: 'Doc' });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(createElement(AutomationHost)));
    const kinds: AutomationDialog[] = [
      { kind: 'data', target: { type: 'layer', id: 'layer-1' } },
      { kind: 'data', target: { type: 'page', id: useEditor.getState().activePageId } },
      { kind: 'data', target: { type: 'document' } },
      { kind: 'properties' },
      { kind: 'saveTemplate' },
      { kind: 'start' },
      { kind: 'configuration' },
      { kind: 'layoutJson' },
      { kind: 'print' },
      { kind: 'embed' },
    ];
    for (const d of kinds) {
      await act(async () => {
        useAutomationUi.getState().open(d);
        await wait(30);
      });
      // Lazily loaded dialogs need a moment.
      for (let i = 0; i < 60 && (document.body.querySelector('[role="dialog"]')?.textContent?.length ?? 0) < 10; i++) await act(async () => wait(50));
      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog?.textContent?.length, d.kind).toBeGreaterThan(10);
      await act(async () => useAutomationUi.getState().close());
    }
    await act(async () => root.unmount());
  });
});
