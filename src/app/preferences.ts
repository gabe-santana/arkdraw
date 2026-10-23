/**
 * User preferences (Extras → Preferences): author name for comments, custom
 * colour palette, default font. Persisted locally.
 */
import { create } from 'zustand';
import type { FontKey } from '@/model/types';
import { setDefaultFont } from '@/model/defaults';

export interface Preferences {
  author: string;
  /** Extra swatches shown in every colour picker. */
  customColors: string[];
  defaultFont: FontKey;
  /** Recently used colours (most recent first). */
  recentColors: string[];
}

const KEY = 'opendraw:preferences';
const DEFAULTS: Preferences = { author: '', customColors: [], defaultFont: 'sans', recentColors: [] };

function load(): Preferences {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export const usePreferences = create<Preferences & { update: (p: Partial<Preferences>) => void; useColor: (c: string) => void }>((set, get) => ({
  ...load(),
  update: (p) => {
    set(p);
    if (p.defaultFont) setDefaultFont(p.defaultFont);
    const { update: _u, useColor: _c, ...rest } = get();
    void _u;
    void _c;
    try {
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
  },
  useColor: (c) => {
    if (!c || c === 'none' || c.startsWith('url(')) return;
    const recent = [c, ...get().recentColors.filter((x) => x.toLowerCase() !== c.toLowerCase())].slice(0, 12);
    get().update({ recentColors: recent });
  },
}));

setDefaultFont(usePreferences.getState().defaultFont);

export const authorName = () => usePreferences.getState().author || 'You';
