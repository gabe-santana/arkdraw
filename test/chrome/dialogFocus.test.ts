/** Dialogs focus the first field on open and keep Tab / Shift+Tab inside the dialog. */
import { afterAll, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Dialog } from '@/ui/Dialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement('div');
document.body.appendChild(host);
const root = createRoot(host);
afterAll(() => act(() => root.unmount()));

describe('Dialog focus', () => {
  it('focuses the first field, not the header close button, and wraps Tab inside', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    await act(async () =>
      root.render(
        createElement(Dialog, {
          open: true,
          onClose: () => {},
          children: createElement(
            'div',
            null,
            createElement('button', { 'aria-label': 'Close' }, 'x'),
            createElement('input', { id: 'name' }),
            createElement('button', null, 'OK'),
          ),
        }),
      ),
    );
    await new Promise((r) => setTimeout(r, 30));

    const input = document.querySelector('input');
    expect(document.activeElement).toBe(input);

    // Tab from the last control wraps to the first one inside the dialog.
    const ok = [...document.querySelectorAll('button')].find((b) => b.textContent === 'OK') as HTMLElement;
    ok.focus();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close');

    await act(async () => root.render(createElement(Dialog, { open: false, onClose: () => {}, children: null })));
    opener.remove();
  });
});
