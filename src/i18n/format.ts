/**
 * ICU-lite message formatting (no dependencies):
 *
 *   "Hello {name}"                                         → simple placeholder
 *   "{count, plural, =0 {No shapes} one {# shape} other {# shapes}}"
 *   "{kind, select, page {This page} other {Everything}}"
 *
 * Plural categories come from Intl.PluralRules, so Russian (one/few/many),
 * Japanese (other only) etc. work. `#` inside a plural branch is the
 * locale-formatted number. Numbers in plain placeholders are formatted with
 * Intl.NumberFormat. Anything that doesn't parse as a placeholder (e.g. JSON
 * in a help text) is left verbatim, and apostrophes are plain text — there is
 * no ICU quoting, so French/Italian copy needs no escaping.
 */

export type MessageVars = Record<string, string | number | boolean | null | undefined>;

const pluralRules = new Map<string, Intl.PluralRules>();
const numberFormats = new Map<string, Intl.NumberFormat>();

function plural(locale: string, n: number): Intl.LDMLPluralRule {
  let r = pluralRules.get(locale);
  if (!r) {
    try {
      r = new Intl.PluralRules(locale);
    } catch {
      r = new Intl.PluralRules('en');
    }
    pluralRules.set(locale, r);
  }
  return r.select(n);
}

export function formatNumberIn(locale: string, n: number): string {
  let f = numberFormats.get(locale);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    } catch {
      f = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
    }
    numberFormats.set(locale, f);
  }
  return f.format(n);
}

/** Index of the `}` matching the `{` at `open`, or -1. */
function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Parses `=0 {…} one {…} other {…}` into a selector → body map. */
function parseBranches(s: string): Map<string, string> | null {
  const out = new Map<string, string>();
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    const m = /^(=?[\w-]+)\s*\{/.exec(s.slice(i));
    if (!m) return null;
    const open = i + m[0].length - 1;
    const close = matchBrace(s, open);
    if (close < 0) return null;
    out.set(m[1], s.slice(open + 1, close));
    i = close + 1;
  }
  return out.size ? out : null;
}

function display(v: MessageVars[string], locale: string): string {
  if (v === null || v === undefined) return '';
  return typeof v === 'number' ? formatNumberIn(locale, v) : String(v);
}

export function formatMessage(template: string, vars: MessageVars | undefined, locale: string): string {
  if (!template.includes('{')) return template;
  let out = '';
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf('{', i);
    if (open < 0) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);
    const close = matchBrace(template, open);
    if (close < 0) {
      out += template.slice(open);
      break;
    }
    const inner = template.slice(open + 1, close);
    const simple = /^\s*(\w+)\s*$/.exec(inner);
    const complex = /^\s*(\w+)\s*,\s*(plural|select)\s*,([\s\S]*)$/.exec(inner);
    if (simple && vars && simple[1] in vars) {
      out += display(vars[simple[1]], locale);
    } else if (complex && vars) {
      const [, name, kind, rest] = complex;
      const branches = parseBranches(rest);
      const value = vars[name];
      if (!branches) out += template.slice(open, close + 1);
      else if (kind === 'plural') {
        const n = Number(value ?? 0);
        const body = branches.get(`=${n}`) ?? branches.get(plural(locale, n)) ?? branches.get('other') ?? '';
        // Nested placeholders are allowed inside branches; `#` is the count.
        out += formatMessage(body.replace(/#/g, formatNumberIn(locale, n)), vars, locale);
      } else {
        const body = branches.get(String(value)) ?? branches.get('other') ?? '';
        out += formatMessage(body, vars, locale);
      }
    } else {
      out += template.slice(open, close + 1);
    }
    i = close + 1;
  }
  return out;
}
