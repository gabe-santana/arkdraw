import { afterEach, describe, expect, it } from 'vitest';
import { draftHasContent, RECOVERY_KEY, shieldRecoveryDraft, takeRecoveryDraft } from '@/web/recovery';

const draft = (elements: unknown[]) => JSON.stringify({ name: 'Mine', path: null, data: JSON.stringify({ format: 'opendraw', pages: [{ elements }] }) });

afterEach(() => localStorage.clear());

// Browsers dispatch localStorage.setItem through Storage.prototype; happy-dom binds
// methods onto the instance, so call through the prototype like a browser would.
const write = (k: string, v: string) => (Object.getPrototypeOf(localStorage) as Storage).setItem.call(localStorage, k, v);

describe('recovery draft guard', () => {
  it('takes the draft out of storage', () => {
    localStorage.setItem(RECOVERY_KEY, draft([]));
    expect(takeRecoveryDraft()).toBe(draft([]));
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
  });

  it('knows when a draft is worth asking about', () => {
    expect(draftHasContent(draft([{ id: 'a' }]))).toBe(true);
    expect(draftHasContent(draft([]))).toBe(false);
    expect(draftHasContent('garbage')).toBe(false);
    expect(draftHasContent(null)).toBe(false);
  });

  it('embed shield hides the draft, drops writes to it, and restores it on pagehide', () => {
    const mine = draft([{ id: 'a' }]);
    localStorage.setItem(RECOVERY_KEY, mine);
    const release = shieldRecoveryDraft();
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();

    // The editor's recovery mirror tries to save the embedded document.
    write(RECOVERY_KEY, draft([{ id: 'host-doc' }]));
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
    // Other keys are untouched.
    write('opendraw:theme', '{"theme":"dark"}');
    expect(localStorage.getItem('opendraw:theme')).toBe('{"theme":"dark"}');

    window.dispatchEvent(new Event('pagehide'));
    expect(localStorage.getItem(RECOVERY_KEY)).toBe(mine);

    release();
    write(RECOVERY_KEY, 'x');
    expect(localStorage.getItem(RECOVERY_KEY)).toBe('x');
  });
});
