import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ErrorBoundary } from '@/ui/ErrorBoundary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = 'arkdraw:recovery';

function Broken(): never {
  throw new Error('render exploded');
}

async function renderCrashed(): Promise<{ host: HTMLElement; root: Root }> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const errors = console.error;
  console.error = () => {};
  try {
    await act(async () => root.render(createElement(ErrorBoundary, null, createElement(Broken))));
  } finally {
    console.error = errors;
  }
  return { host, root };
}

function button(host: HTMLElement, label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll('button')].find((b) => b.textContent === label);
  if (!found) throw new Error(`missing button: ${label}`);
  return found;
}

afterEach(() => {
  localStorage.removeItem(KEY);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('top-level error boundary', () => {
  it('shows a recovery screen instead of unmounting the root when a child throws', async () => {
    const { host, root } = await renderCrashed();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('render exploded');
    expect(host.textContent).toContain('Reload and discard draft');
    await act(async () => root.unmount());
  });

  it('downloads the autosaved document (not the draft wrapper) as an .arkdraw file', async () => {
    const document_ = '{"format":"arkdraw","pages":[]}';
    localStorage.setItem(KEY, JSON.stringify({ name: 'flow', path: null, data: document_ }));
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });

    const { host, root } = await renderCrashed();
    await act(async () => button(host, 'Download as JSON').click());

    expect(clicked).toEqual(['flow.arkdraw']);
    expect(await blobs[0].text()).toBe(document_);
    // The draft is preserved by downloading.
    expect(localStorage.getItem(KEY)).not.toBeNull();
    await act(async () => root.unmount());
  });

  it('explains when there is no autosaved document to download', async () => {
    const { host, root } = await renderCrashed();
    await act(async () => button(host, 'Download as JSON').click());
    expect(host.querySelector('[role="status"]')?.textContent).toContain('No autosaved document');
    await act(async () => root.unmount());
  });

  it('discards the recovery draft when reloading from the recovery screen', async () => {
    localStorage.setItem(KEY, JSON.stringify({ name: 'flow', path: null, data: '{}' }));
    const { host, root } = await renderCrashed();
    // Stub navigation so the test runner is not reloaded.
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    await act(async () => button(host, 'Reload and discard draft').click());
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    await act(async () => root.unmount());
  });
});
