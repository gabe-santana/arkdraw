/// <reference types="vite-plugin-pwa/vanillajs" />
/**
 * Service-worker registration for the web build (installable, offline PWA).
 * Never runs inside the desktop app: Tauri serves the bundle itself, and a
 * service worker there would only get in the way of updates.
 */
import { create } from 'zustand';
import { isTauri } from '@/lib/platform';

interface PwaState {
  /** A new version is installed and waiting. */
  needRefresh: boolean;
  /** The app shell is cached; ArkDraw now works offline. */
  offlineReady: boolean;
  /** Activates the waiting version and reloads. */
  update: (() => Promise<void>) | null;
  dismiss: () => void;
}

export const usePwa = create<PwaState>((set) => ({
  needRefresh: false,
  offlineReady: false,
  update: null,
  dismiss: () => set({ needRefresh: false, offlineReady: false }),
}));

const HOUR = 60 * 60 * 1000;
let registered = false;

/** Registers the service worker (web production builds only). Safe to call more than once. */
export async function registerPwa(): Promise<void> {
  if (registered || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (isTauri()) {
    // Belt and braces: make sure no stray worker ever controls the desktop webview.
    navigator.serviceWorker.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }
  if (!import.meta.env.PROD) return;
  registered = true;
  const { registerSW } = await import('virtual:pwa-register');
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
    onOfflineReady: () => usePwa.setState({ offlineReady: true }),
    onRegisteredSW: (_url, reg) => {
      if (!reg) return;
      // Long-lived tabs: look for a new version every hour (and when coming back online).
      setInterval(() => navigator.onLine && reg.update().catch(() => {}), HOUR);
      window.addEventListener('online', () => reg.update().catch(() => {}));
    },
  });
  usePwa.setState({ update: () => updateSW(true) });
}
