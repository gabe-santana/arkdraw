/**
 * UI languages (src/i18n): message formatting, locale matching, the
 * language store, catalog lookups, palette search in another language, and
 * translation completeness for every shipped locale.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { formatMessage } from '@/i18n/format';
import { LOCALES, matchLocale, matchLocaleTag } from '@/i18n/locales';
import { applyLocale, formatNumber, initI18n, loadMessages, resolvePreference, setLocalePreference, t, tx, useI18n } from '@/i18n';
import { actionLabel, groupLabel, templateCategory, templateName } from '@/i18n/catalog';
import { EN, EN_NAMESPACES } from '@/i18n/en';
import { ACTIONS, ACTION_MAP } from '@/app/actions';
import '@/extensibility/actions'; // runtime-registered commands (Edit shape…, Plugins…, UI modes)
import { searchTemplates } from '@/templates';
import { TEMPLATES, CATEGORIES } from '@/templates';
import { USER_CATEGORY } from '@/storage/userTemplates';

const LOCALE_MODULES = import.meta.glob<{ default: Record<string, string> }>('/src/i18n/locales/*/*.ts', { eager: true });
const translated = LOCALES.filter((l) => l.code !== 'en');

/** locale → namespace → messages */
function localeFiles(code: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [path, mod] of Object.entries(LOCALE_MODULES)) {
    const m = /\/locales\/([^/]+)\/([^/]+)\.ts$/.exec(path);
    if (m && m[1] === code) out[m[2]] = mod.default;
  }
  return out;
}

/** Placeholder variable names used anywhere in a message (incl. inside plural/select branches). */
function vars(msg: string): string[] {
  const out = new Set<string>();
  for (const m of msg.matchAll(/\{\s*(\w+)\s*(?:,\s*(?:plural|select)\s*,|\})/g)) out.add(m[1]);
  return [...out].sort();
}

/** Sample values for every variable in a message. */
function sample(msg: string, n: number): Record<string, string | number> {
  const v: Record<string, string | number> = {};
  for (const name of vars(msg)) v[name] = /count|^n$|total|pages|seconds|percent|from|to|cols|rows|index|step|size|value/i.test(name) ? n : 'X';
  return v;
}

describe('formatMessage (ICU-lite)', () => {
  it('interpolates placeholders and leaves unknown braces alone', () => {
    expect(formatMessage('Hello {name}!', { name: 'Ada' }, 'en')).toBe('Hello Ada!');
    expect(formatMessage('Missing {name}', {}, 'en')).toBe('Missing {name}');
    expect(formatMessage('JSON: {"a": 1}', { a: 2 }, 'en')).toBe('JSON: {"a": 1}');
    expect(formatMessage("l'image de {who}", { who: 'Ana' }, 'fr')).toBe("l'image de Ana");
  });

  it('formats numbers per locale', () => {
    expect(formatMessage('{n} items', { n: 1234.5 }, 'en')).toBe('1,234.5 items');
    expect(formatMessage('{n} itens', { n: 1234.5 }, 'pt-BR')).toBe('1.234,5 itens');
  });

  it('selects plural branches with Intl.PluralRules', () => {
    const en = '{count, plural, =0 {No shapes} one {# shape} other {# shapes}}';
    expect(formatMessage(en, { count: 0 }, 'en')).toBe('No shapes');
    expect(formatMessage(en, { count: 1 }, 'en')).toBe('1 shape');
    expect(formatMessage(en, { count: 1200 }, 'en')).toBe('1,200 shapes');
    const ru = '{count, plural, one {# фигура} few {# фигуры} many {# фигур} other {# фигуры}}';
    expect([1, 3, 5, 21, 1.5].map((count) => formatMessage(ru, { count }, 'ru'))).toEqual(['1 фигура', '3 фигуры', '5 фигур', '21 фигура', '1,5 фигуры']);
    expect(formatMessage('{count, plural, other {# 個の図形}}', { count: 1 }, 'ja')).toBe('1 個の図形');
  });

  it('supports select and placeholders nested in branches', () => {
    const msg = '{kind, select, page {Page {name}} other {Everything}}';
    expect(formatMessage(msg, { kind: 'page', name: 'Intro' }, 'en')).toBe('Page Intro');
    expect(formatMessage(msg, { kind: 'doc' }, 'en')).toBe('Everything');
    expect(formatMessage('{count, plural, one {# layer in {page}} other {# layers in {page}}}', { count: 2, page: 'P1' }, 'en')).toBe('2 layers in P1');
  });
});

describe('locale matching', () => {
  it('maps BCP-47 tags to shipped locales', () => {
    expect(matchLocaleTag('pt')).toBe('pt-BR');
    expect(matchLocaleTag('pt-PT')).toBe('pt-BR');
    expect(matchLocaleTag('PT_br')).toBe('pt-BR');
    expect(matchLocaleTag('es-MX')).toBe('es');
    expect(matchLocaleTag('zh-TW')).toBe('zh-CN');
    expect(matchLocaleTag('de-AT')).toBe('de');
    expect(matchLocaleTag('nl')).toBeNull();
    expect(matchLocale(['nl-NL', 'fr-CA', 'en'])).toBe('fr');
    expect(matchLocale([])).toBe('en');
    expect(resolvePreference('auto', ['ja-JP'])).toBe('ja');
    expect(resolvePreference('ko', ['ja-JP'])).toBe('ko');
  });
});

describe('language store', () => {
  beforeEach(() => applyLocale('en', 'auto'));
  afterAll(() => applyLocale('en', 'auto'));

  it('switches language, persists the choice and sets <html lang>', async () => {
    expect(t('common.cancel')).toBe('Cancel');
    await setLocalePreference('pt-BR');
    expect(useI18n.getState().locale).toBe('pt-BR');
    expect(localStorage.getItem('arkdraw:locale')).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(t('common.cancel')).toBe('Cancelar');
    expect(t('menu.file')).toBe('Arquivo');
    expect(formatNumber(1234.5)).toBe('1.234,5');
    localStorage.removeItem('arkdraw:locale');
  });

  it('falls back to English for missing keys and unknown dynamic keys', async () => {
    await applyLocale('de');
    const messages = useI18n.getState().messages;
    useI18n.setState({ messages: { ...messages, 'common.cancel': undefined as unknown as string } });
    expect(t('common.cancel')).toBe('Cancel');
    expect(tx('action.plugin.something', 'Plugin command')).toBe('Plugin command');
  });

  it('?lang= overrides the saved preference for the session only', async () => {
    localStorage.setItem('arkdraw:locale', 'fr');
    await initI18n('de-DE');
    expect(useI18n.getState().locale).toBe('de');
    expect(useI18n.getState().preference).toBe('fr');
    expect(localStorage.getItem('arkdraw:locale')).toBe('fr');
    await initI18n(null);
    expect(useI18n.getState().locale).toBe('fr');
    await initI18n('xx'); // unsupported: keep the preference
    expect(useI18n.getState().locale).toBe('fr');
    localStorage.removeItem('arkdraw:locale');
  });

  it('translates registry strings by id', async () => {
    await applyLocale('pt-BR');
    expect(actionLabel(ACTION_MAP['file.save'])).toBe('Salvar');
    expect(groupLabel('File')).toBe('Arquivo');
    expect(actionLabel({ id: 'plugin.custom', label: 'Custom thing' })).toBe('Custom thing');
    const blank = TEMPLATES.find((x) => x.id === 'blank')!;
    expect(templateName(blank)).not.toBe(blank.name);
    expect(templateCategory('Flowcharts')).toBe('Fluxogramas');
  });

  it('palette search matches the translated AND the English label', async () => {
    const { searchActions } = await import('@/chrome/CommandPalette');
    await applyLocale('pt-BR');
    expect(searchActions('salvar').slice(0, 3).map((r) => r.item.id)).toContain('file.save');
    expect(searchActions('save').slice(0, 3).map((r) => r.item.id)).toContain('file.save');
    expect(searchActions('desfazer')[0].item.id).toBe('edit.undo');
    await applyLocale('ru');
    expect(searchActions('отменить').slice(0, 3).map((r) => r.item.id)).toContain('edit.undo');
    await applyLocale('ja');
    const save = actionLabel(ACTION_MAP['file.save']);
    expect(searchActions(save).slice(0, 3).map((r) => r.item.id)).toContain('file.save');
  });
});

describe('translations', () => {
  const report: string[] = [];
  afterAll(() => console.log(`UI translation coverage\n${report.join('\n')}`));

  const enDictKeys = Object.keys(EN);
  const actionKeys = ACTIONS.map((a) => `action.${a.id}`);
  const templateKeys = [
    ...[...CATEGORIES, USER_CATEGORY].map((c) => `templateCategory.${c}`),
    ...TEMPLATES.flatMap((x) => [`template.${x.id}.name`, `template.${x.id}.description`]),
  ];

  for (const { code } of translated) {
    describe(code, () => {
      const files = localeFiles(code);
      const all: Record<string, string> = Object.assign({}, ...Object.values(files));

      it('has a file for every English namespace, with exactly its keys', () => {
        const missing: string[] = [];
        for (const [ns, en] of Object.entries(EN_NAMESPACES)) {
          const tr = files[ns] ?? {};
          for (const k of Object.keys(en)) if (typeof tr[k] !== 'string' || !tr[k].trim()) missing.push(k);
          for (const k of Object.keys(tr)) expect(k in en, `${code}/${ns}: unknown key ${k}`).toBe(true);
        }
        const dictPct = (100 * (enDictKeys.length - missing.length)) / enDictKeys.length;
        const actionPct = (100 * actionKeys.filter((k) => all[k]).length) / actionKeys.length;
        const tplPct = (100 * templateKeys.filter((k) => all[k]).length) / templateKeys.length;
        report.push(`  ${code.padEnd(6)} strings ${dictPct.toFixed(1)}%  commands ${actionPct.toFixed(1)}%  templates ${tplPct.toFixed(1)}%`);
        if (missing.length) console.warn(`${code}: ${missing.length} untranslated keys (English fallback): ${missing.slice(0, 20).join(', ')}`);
        // New strings may land before their translations (they fall back to English), but not many.
        expect(dictPct).toBeGreaterThanOrEqual(97);
        expect(actionPct).toBe(100);
        expect(tplPct).toBeGreaterThanOrEqual(95);
      });

      it('keeps every placeholder name and produces well-formed text', () => {
        const problems: string[] = [];
        const source: Record<string, string> = { ...EN };
        for (const a of ACTIONS) source[`action.${a.id}`] = a.label;
        for (const [k, msg] of Object.entries(all)) {
          const en = source[k];
          if (en === undefined) continue;
          if (vars(en).join() !== vars(msg).join()) problems.push(`${k}: {${vars(en)}} vs {${vars(msg)}}`);
          for (const n of [0, 1, 2, 5, 21]) {
            const out = formatMessage(msg, sample(msg, n), code);
            const enOut = formatMessage(en, sample(en, n), 'en');
            // A leftover "{" means a branch or placeholder failed to parse.
            if ((out.match(/[{}]/g)?.length ?? 0) > (enOut.match(/[{}]/g)?.length ?? 0)) problems.push(`${k} (n=${n}): ${out}`);
          }
          if ((en.match(/%\w+%/g) ?? []).join() !== (msg.match(/%\w+%/g) ?? []).join()) problems.push(`${k}: %tokens% differ`);
        }
        expect(problems).toEqual([]);
      });

      it('loads through the lazy loader', async () => {
        const messages = await loadMessages(code);
        expect(Object.keys(messages).length).toBe(Object.keys(all).length);
      });
    });
  }
});

describe('no hard-coded English in the main UI', () => {
  // Heuristic: capitalised English in JSX text or in title/placeholder/aria-label/label/alt
  // attributes of src/chrome and src/panels must go through t().
  const SOURCES = import.meta.glob<string>(['/src/chrome/*.tsx', '/src/panels/*.tsx'], { eager: true, query: '?raw', import: 'default' });
  const ALLOW = new Set(['Aa', 'Ctrl', 'Esc', 'ArkDraw', 'X', 'Y', 'W', 'H', 'LTR', 'RTL', 'Google Fonts']);
  const patterns = [
    />\s*([A-Z][a-z]+(?:[ '’-][A-Za-z]+)*[.…!?]?)\s*</g,
    /\b(?:title|placeholder|aria-label|label|alt)="([A-Z][^"]*[a-z][^"]*)"/g,
  ];

  it('scans src/chrome and src/panels', () => {
    const hits: string[] = [];
    for (const [path, src] of Object.entries(SOURCES)) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const re of patterns)
        for (const m of code.matchAll(re)) {
          const text = m[1].trim();
          if (ALLOW.has(text) || /^Promise$/.test(text)) continue;
          hits.push(`${path}: ${text}`);
        }
    }
    expect(Object.keys(SOURCES).length).toBeGreaterThan(10);
    expect(hits).toEqual([]);
  });
});

describe('shape search understands common pt-BR / es terms', () => {
  it('maps translated words to the English shape names', async () => {
    const { SearchIndex } = await import('@/search/engine');
    const names = ['Database', 'Server', 'User', 'Queue', 'Load Balancer', 'Cloud', 'Router', 'Folder', 'Banco Inter logo'];
    const index = new SearchIndex(names, (n) => [{ text: n, weight: 3 }]);
    const top = (q: string) => index.search(q, 3)[0]?.item;
    expect(top('banco de dados')).toBe('Database');
    expect(top('base de datos')).toBe('Database');
    expect(top('servidores')).toBe('Server');
    expect(top('usuário')).toBe('User');
    expect(top('fila')).toBe('Queue');
    expect(top('balanceador de carga')).toBe('Load Balancer');
    expect(top('nuvem')).toBe('Cloud');
    expect(top('roteador')).toBe('Router');
    expect(top('pasta')).toBe('Folder');
    // The typed words still match literally.
    expect(index.search('banco inter', 3)[0]?.item).toBe('Banco Inter logo');
  });
});

describe('English search keeps working in every UI language', () => {
  afterAll(() => applyLocale('en', 'auto'));

  const english = <T,>(fn: () => T): Promise<T> => applyLocale('en').then(fn);

  it('command palette: English labels/keywords find the same commands as in English', async () => {
    const { searchActions } = await import('@/chrome/CommandPalette');
    const queries = ['export', 'bold', 'layers', 'group', 'undo', 'snap to grid', 'png'];
    const top = (q: string) => searchActions(q).slice(0, 3).map((r) => r.item.id);
    const base = await english(() => Object.fromEntries(queries.map((q) => [q, top(q)])));
    for (const code of ['pt-BR', 'de', 'ja'] as const) {
      await applyLocale(code);
      for (const q of queries) expect(top(q).slice(0, base[q].length), `${code}: "${q}"`).toEqual(base[q]);
    }
    await applyLocale('pt-BR');
    expect(top('exportar')).toContain('file.export');
    expect(top('negrito')).toContain('format.bold');
  });

  it('shape and icon search return the same results for English queries', async () => {
    const { searchShapes } = await import('@/search/indexes');
    const { SearchIndex } = await import('@/search/engine');
    const { readFileSync, existsSync } = await import('node:fs');
    const icons: Array<{ id: string; name: string; keywords: string[]; category: string; provider: string }> = [];
    for (const p of ['aws', 'azure', 'gcp']) {
      const f = `public/icons/${p}/index.json`;
      if (existsSync(f)) for (const i of JSON.parse(readFileSync(f, 'utf-8')).icons) icons.push({ ...i, provider: p });
    }
    const iconIndex = new SearchIndex(icons, (i) => [
      { text: i.name, weight: 3 },
      { text: i.keywords.join(' '), weight: 1.5 },
      { text: i.category, weight: 1 },
    ]);
    const queries = ['database', 'load balancer', 'vnet', 'lamda', 'server', 'queue'];
    const run = () =>
      queries.map((q) => [
        searchShapes(q, 5).map((h) => `${h.libraryId}:${h.item.label}`),
        iconIndex.search(q, 5).map((r) => `${r.item.provider}:${r.item.name}`),
      ]);
    const base = await english(run);
    expect(base[0][0].length).toBeGreaterThan(0);
    for (const code of ['pt-BR', 'de', 'ja'] as const) {
      await applyLocale(code);
      expect(run(), code).toEqual(base);
    }
    if (icons.length) {
      expect(base[3][1].join('|')).toMatch(/Lambda/i); // "lamda" typo still resolves
      expect(base[2][1].join('|')).toMatch(/Virtual Network/i);
    }
  });

  it('template search matches English and translated names', async () => {
    const ids = (q: string) => searchTemplates(TEMPLATES, q).map((x) => x.id);
    const base = await english(() => ['flowchart', 'kanban', 'network'].map(ids));
    for (const code of ['pt-BR', 'de', 'ja'] as const) {
      await applyLocale(code);
      const now = ['flowchart', 'kanban', 'network'].map(ids);
      now.forEach((list, i) => expect(list, code).toEqual(expect.arrayContaining(base[i])));
    }
    await applyLocale('pt-BR');
    expect(ids('fluxograma').length).toBeGreaterThan(0);
  });
});
