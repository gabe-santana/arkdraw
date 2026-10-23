/** Supported UI languages and BCP-47 matching (navigator.languages, `?lang=`). */

export const LOCALES = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'pt-BR', name: 'Português (Brasil)', english: 'Portuguese (Brazil)' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'it', name: 'Italiano', english: 'Italian' },
  { code: 'zh-CN', name: '简体中文', english: 'Chinese (Simplified)' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'ru', name: 'Русский', english: 'Russian' },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];
export const SOURCE_LOCALE: LocaleCode = 'en';

const CODES = LOCALES.map((l) => l.code) as readonly string[];

export const isLocaleCode = (s: string): s is LocaleCode => CODES.includes(s);

/**
 * Best supported locale for one BCP-47 tag, or null. Exact match first, then
 * the language alone: `pt`, `pt-PT` → pt-BR, `es-MX` → es, `zh`, `zh-Hans`,
 * `zh-TW` → zh-CN (the only Chinese we ship), `en-GB` → en.
 */
export function matchLocaleTag(tag: string | null | undefined): LocaleCode | null {
  if (!tag) return null;
  const norm = tag.trim().replace(/_/g, '-');
  if (!norm) return null;
  const exact = LOCALES.find((l) => l.code.toLowerCase() === norm.toLowerCase());
  if (exact) return exact.code;
  const lang = norm.split('-')[0].toLowerCase();
  const byLang = LOCALES.find((l) => l.code.split('-')[0].toLowerCase() === lang);
  return byLang?.code ?? null;
}

/** First supported locale among the user's preferred languages; English otherwise. */
export function matchLocale(tags: readonly string[] | undefined | null): LocaleCode {
  for (const t of tags ?? []) {
    const m = matchLocaleTag(t);
    if (m) return m;
  }
  return SOURCE_LOCALE;
}
