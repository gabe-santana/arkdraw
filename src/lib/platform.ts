export type OS = 'mac' | 'windows' | 'linux';

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const OS_NAME: OS = (() => {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/Mac|iPhone|iPad/.test(ua)) return 'mac';
  if (/Windows/.test(ua)) return 'windows';
  return 'linux';
})();

export const IS_MAC = OS_NAME === 'mac';

/** Human-readable shortcut, e.g. "Mod+Shift+S" → "⌘⇧S" on macOS, "Ctrl+Shift+S" elsewhere. */
export function formatShortcut(combo: string): string[] {
  return combo.split('+').map((k) => {
    switch (k) {
      case 'Mod':
        return IS_MAC ? '⌘' : 'Ctrl';
      case 'Shift':
        return IS_MAC ? '⇧' : 'Shift';
      case 'Alt':
        return IS_MAC ? '⌥' : 'Alt';
      case 'Backspace':
        return IS_MAC ? '⌫' : 'Backspace';
      case 'Delete':
        return IS_MAC ? '⌦' : 'Del';
      case 'ArrowUp':
        return '↑';
      case 'ArrowDown':
        return '↓';
      default:
        return k;
    }
  });
}
