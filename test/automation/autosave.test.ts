import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createShape } from '@/model/defaults';
import { newPage, useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';

// A fake File System Access handle. `perm` is what queryPermission reports; writes are counted.
const h = vi.hoisted(() => {
  const state = { perm: 'denied' as string, writes: 0 };
  const makeHandle = (name: string) => ({
    name,
    queryPermission: vi.fn(async () => state.perm),
    requestPermission: vi.fn(async () => 'denied'),
    createWritable: vi.fn(async () => ({
      write: async () => {
        state.writes++;
      },
      close: async () => {},
    })),
  });
  return { state, makeHandle, current: makeHandle('x.arkdraw') };
});

vi.mock('@/app/fileCommands', () => ({ isDirty: () => true }));
// Only docOrigin is replaced; the real writeHandle and ensurePermission run against the fake handle.
vi.mock('@/storage/origin', async (orig) => ({
  ...(await orig<typeof import('@/storage/origin')>()),
  docOrigin: () => ({ kind: 'handle', handle: h.current as unknown as FileSystemFileHandle }),
}));

const { autosaveNow } = await import('@/automation/autosave');

const page = () => newPage('P', { elements: { s: { ...createShape('rectangle', { x: 0, y: 0, w: 80, h: 40 }, {}, 'Hi'), id: 's' } }, order: ['s'] });

describe('autosave to a file handle', () => {
  beforeEach(() => {
    h.state.perm = 'denied';
    h.state.writes = 0;
    h.current = h.makeHandle('x.arkdraw');
    useUi.setState({ toasts: [], autosavePaused: false });
    useEditor.getState().loadPages([page()], { path: null, name: 'x' });
  });

  it('tells the user once when write permission has lapsed, and checks permission on each change', async () => {
    expect(await autosaveNow()).toBe(false);
    expect(await autosaveNow()).toBe(false);
    const toasts = useUi.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toMatch(/Autosave paused/);
    expect(useUi.getState().autosavePaused).toBe(true);
    expect(h.current.queryPermission).toHaveBeenCalledTimes(2);
    expect(h.current.requestPermission).not.toHaveBeenCalled();
    expect(h.state.writes).toBe(0);
  });

  it('resumes once permission is granted, and warns again on the next lapse', async () => {
    expect(await autosaveNow()).toBe(false);
    expect(useUi.getState().toasts).toHaveLength(1);

    h.state.perm = 'granted';
    expect(await autosaveNow()).toBe(true);
    expect(h.state.writes).toBe(1);
    expect(useUi.getState().autosavePaused).toBe(false);

    h.state.perm = 'denied';
    useUi.setState({ toasts: [] });
    expect(await autosaveNow()).toBe(false);
    expect(useUi.getState().toasts).toHaveLength(1);
    expect(useUi.getState().toasts[0].message).toMatch(/Autosave paused/);
  });

  it('warns about a second document that lapses while the first is still paused', async () => {
    expect(await autosaveNow()).toBe(false);
    useUi.setState({ toasts: [] });

    h.current = h.makeHandle('y.arkdraw');
    expect(await autosaveNow()).toBe(false);
    expect(useUi.getState().toasts).toHaveLength(1);
    expect(useUi.getState().toasts[0].message).toMatch(/Autosave paused/);
  });
});
