/**
 * Translated labels (draw.io `label_<lang>` attributes on UserObject). The
 * translations live in the element's data as `label_<lang>` keys, so they
 * round-trip through .opendraw and draw.io unchanged; the page's diagram
 * language picks which one is shown.
 */
import type { DiagramElement } from '@/model/types';

export const LANGUAGES: Array<{ code: string; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ar', name: 'العربية' },
  { code: 'he', name: 'עברית' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

export const languageName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;

/** Data key holding the `lang` translation. */
export const labelKey = (lang: string) => `label_${lang.toLowerCase()}`;

const KEY = /^label_([a-z]{2,3}(?:[-_][a-z0-9]{2,8})?)$/i;

/** Languages an element has translations for. */
export function translationLangs(el: DiagramElement): string[] {
  return Object.keys(el.data ?? {})
    .map((k) => KEY.exec(k)?.[1].toLowerCase())
    .filter((l): l is string => !!l);
}

/** Every translation language used in a set of elements. */
export function docLangs(els: Iterable<DiagramElement>): string[] {
  const out = new Set<string>();
  for (const el of els) for (const l of translationLangs(el)) out.add(l);
  return [...out].sort();
}

/** The label to show for `lang` (falls back to the base label, then the base language: `pt-br` → `pt`). */
export function localizedText(el: Pick<DiagramElement, 'text' | 'data'>, lang: string | undefined): string {
  if (!lang || !el.data) return el.text;
  const key = labelKey(lang);
  const hit = el.data[key] ?? el.data[labelKey(lang.split(/[-_]/)[0])];
  return hit !== undefined && hit !== '' ? hit : el.text;
}

/** True when editing `el` under `lang` should edit its translation rather than the base label. */
export const editsTranslation = (el: Pick<DiagramElement, 'data'>, lang: string | undefined): string | null =>
  lang && el.data && el.data[labelKey(lang)] !== undefined ? labelKey(lang) : null;
