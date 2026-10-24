/**
 * UI translations. Tiny and dependency-free:
 *
 *   t('common.cancel')                       → "Cancel" / "Cancelar" / …
 *   t('layers.count', { count: 3 })          → ICU-lite plurals (./format.ts)
 *   const t = useT();                        → same, and re-renders on language change
 *
 * English (./en/*) is bundled and is the source of truth and fallback; other
 * languages live in ./locales/<code>/<namespace>.ts and load lazily (one chunk
 * per language, ./bundles/<code>.ts). Strings that come from registries — command labels, template
 * names — are looked up by id (./catalog.ts) and fall back to the registry's
 * English text.
 *
 * Language choice: Preferences → Language ("Auto" follows navigator.languages),
 * persisted in localStorage; `?lang=` overrides it for the session (web).
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { EN, type MessageKey } from './en';
import { formatMessage, formatNumberIn, type MessageVars } from './format';
import { isLocaleCode, matchLocale, matchLocaleTag, SOURCE_LOCALE, type LocaleCode } from './locales';

export { LOCALES, matchLocale, matchLocaleTag, type LocaleCode } from './locales';
export type { MessageKey } from './en';
export type { MessageVars } from './format';

export type LocalePreference = LocaleCode | 'auto';

const STORAGE_KEY = 'arkdraw:locale';

/**
 * Lazy locale bundles: ./bundles/<code>.ts gathers ./locales/<code>/<namespace>.ts,
 * so each language is a single chunk.
 */
const BUNDLES = import.meta.glob<{ default: Record<string, Record<string, string>> }>('./bundles/*.ts');

interface I18nState {
  /** What the user picked (Preferences). */
  preference: LocalePreference;
  /** The language in effect. */
  locale: LocaleCode;
  /** Translations for `locale` (English is merged in by t() as the fallback). */
  messages: Record<string, string>;
}

function readPreference(): LocalePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (v === 'auto' || isLocaleCode(v))) return v;
  } catch {
    /* storage unavailable */
  }
  return 'auto';
}

const systemLanguages = (): readonly string[] => {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
};

/** The locale a preference stands for ("auto" → the system languages). */
export const resolvePreference = (pref: LocalePreference, system: readonly string[] = systemLanguages()): LocaleCode =>
  pref === 'auto' ? matchLocale(system) : pref;

export const useI18n = create<I18nState>(() => ({ preference: 'auto', locale: SOURCE_LOCALE, messages: {} }));

/** Loads (and caches) the translation modules of one locale. */
const cache = new Map<LocaleCode, Promise<Record<string, string>>>();
export function loadMessages(locale: LocaleCode): Promise<Record<string, string>> {
  if (locale === SOURCE_LOCALE) return Promise.resolve({});
  let p = cache.get(locale);
  if (!p) {
    const load = BUNDLES[`./bundles/${locale}.ts`];
    p = (load ? load() : Promise.resolve({ default: {} }))
      .then((m) => Object.assign({}, ...Object.values(m.default)) as Record<string, string>)
      .catch((err) => {
        cache.delete(locale);
        console.warn(`[i18n] could not load ${locale}`, err);
        return {};
      });
    cache.set(locale, p);
  }
  return p;
}

let switchToken = 0;

/** Switches the UI language (without persisting). Resolves once the strings are in. */
export async function applyLocale(locale: LocaleCode, preference: LocalePreference = useI18n.getState().preference): Promise<void> {
  const token = ++switchToken;
  const messages = await loadMessages(locale);
  if (token !== switchToken) return;
  useI18n.setState({ locale, preference, messages });
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

/** Preferences → Language. Persists the choice and applies it. */
export function setLocalePreference(pref: LocalePreference): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* storage unavailable */
  }
  return applyLocale(resolvePreference(pref), pref);
}

/**
 * Startup: the session override (`?lang=`) or the saved preference. Called
 * before the first render so the app paints in the right language.
 */
export function initI18n(sessionLang: string | null = sessionLangParam()): Promise<void> {
  const preference = readPreference();
  const session = matchLocaleTag(sessionLang);
  return applyLocale(session ?? resolvePreference(preference), preference);
}

function sessionLangParam(): string | null {
  try {
    return typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
  } catch {
    return null;
  }
}

/** Raw lookup: the current translation, then English, then null. */
export function lookup(key: string): string | null {
  return useI18n.getState().messages[key] ?? (EN as Record<string, string>)[key] ?? null;
}

/** Translates a key from the English dictionary. */
export function t(key: MessageKey, vars?: MessageVars): string {
  return formatMessage(lookup(key) ?? key, vars, useI18n.getState().locale);
}

/**
 * Translates a dynamic key (registry ids: commands, templates…), falling back
 * to the given English text when no translation exists.
 */
export function tx(key: string, fallback: string, vars?: MessageVars): string {
  return formatMessage(lookup(key) ?? fallback, vars, useI18n.getState().locale);
}

export type TFunction = typeof t;

/** `t` for React components: re-renders when the language changes. */
export function useT(): TFunction {
  const messages = useI18n((s) => s.messages);
  const locale = useI18n((s) => s.locale);
  // A new identity per language, so memoized values that call t() recompute.
  return useMemo(() => ((key, vars) => t(key, vars)) as TFunction, [messages, locale]);
}

export const useLocale = () => useI18n((s) => s.locale);
export const currentLocale = () => useI18n.getState().locale;

/** Locale-aware number (1,234.5 / 1.234,5 / 1 234,5). */
export const formatNumber = (n: number) => formatNumberIn(currentLocale(), n);

/** Locale-aware date/time. */
export function formatDate(d: Date | number, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string {
  try {
    return new Intl.DateTimeFormat(currentLocale(), opts).format(d);
  } catch {
    return new Date(d).toLocaleString();
  }
}

/** "3 minutes ago" in the UI language. */
export function formatRelativeTime(d: Date | number, now = Date.now()): string {
  const diff = (typeof d === 'number' ? d : d.getTime()) - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' });
  if (abs < 45_000) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < 45 * 60_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 22 * 3_600_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 7 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), 'day');
  return formatDate(d, { dateStyle: 'medium' });
}
