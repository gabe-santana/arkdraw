/**
 * SQL DDL → ER diagram (draw.io's Arrange > Insert > Advanced > SQL).
 *
 * Reads CREATE TABLE statements in MySQL, PostgreSQL, SQL Server and SQLite
 * flavours: `backtick`, "double quote" and [bracket] quoting, schema-qualified
 * names, inline `PRIMARY KEY` / `REFERENCES t(c)`, table-level
 * `[CONSTRAINT x] PRIMARY KEY (…)` / `FOREIGN KEY (…) REFERENCES t (…)`, and
 * `ALTER TABLE … ADD [CONSTRAINT x] FOREIGN KEY|PRIMARY KEY …`. Comments
 * (`--`, `#`, `/* *\/`) and `GO` batch separators are ignored.
 *
 * Each table becomes an `erd.entity` ("name", `--`, rows like `PK id  uuid`),
 * laid out with dagre; each foreign key becomes a connector with crow's-foot
 * ends: `erMany` at the referencing (FK) table, `erOnlyOne` at the referenced one.
 */
import type { SpecEdge, SpecNode } from '@/ai/generate/spec';
import type { ImportResult, Importer } from './types';
import { layoutSpec, makeDoc, toText } from './_shared';

interface Column {
  name: string;
  type: string;
  pk: boolean;
  fk: boolean;
}

interface Table {
  name: string;
  columns: Column[];
}

interface ForeignKey {
  table: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
}

const QUOTED = String.raw`\x60[^\x60]+\x60|"[^"]+"|\[[^\]]+\]`;
const IDENT = String.raw`(?:${QUOTED}|[\w$#@]+)`;
const QNAME = String.raw`${IDENT}(?:\s*\.\s*${IDENT})*`;

/** Strips quoting from one identifier. */
const unquote = (s: string) => s.trim().replace(/^[`"[](.*)[`"\]]$/s, '$1');
/** `schema.table` → `table` (unquoted). */
const lastPart = (qname: string) => {
  const parts = qname.match(new RegExp(IDENT, 'g')) ?? [qname];
  return unquote(parts[parts.length - 1]);
};
const key = (name: string) => name.toLowerCase();
const identList = (s: string) => (s.match(new RegExp(IDENT, 'g')) ?? []).map(unquote);

/** Removes comments outside string literals and quoted identifiers. */
function stripComments(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === "'" || c === '"' || c === '`' || c === '[') {
      const close = c === '[' ? ']' : c;
      let j = i + 1;
      while (j < sql.length && !(sql[j] === close && sql[j + 1] !== close)) j += sql[j] === close ? 2 : 1;
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (c === '#' && /(^|\n)[ \t]*$/.test(out)) {
      // MySQL line comment (only at line start, so SQL Server #temp tables survive).
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end < 0 ? sql.length : end + 2;
      out += ' ';
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Splits on `sep` outside quotes and parentheses. */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '[') quote = ']';
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === sep && !quote && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Index of the parenthesis closing the one at `open`. */
function matchParen(s: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '[') quote = ']';
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

const TYPE_STOP = new Set([
  'not', 'null', 'primary', 'references', 'default', 'unique', 'check', 'constraint', 'auto_increment', 'autoincrement',
  'identity', 'collate', 'generated', 'comment', 'on', 'as', 'with', 'sparse', 'rowguidcol', 'filestream', 'masked',
  'encode', 'distkey', 'sortkey', 'key', 'invisible', 'visible', 'storage', 'column_format', 'serial_default',
]);

/** Splits a column definition remainder into the type and the rest. */
function splitType(rest: string): { type: string; tail: string } {
  const re = /`[^`]*`|"[^"]*"|\[[^\]]*\]|'(?:[^']|'')*'|\(|\)|[^\s()]+/g;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest))) {
    const tok = m[0];
    if (tok === '(') depth++;
    else if (tok === ')') depth--;
    else if (depth === 0) {
      const low = tok.toLowerCase();
      const next = rest.slice(re.lastIndex).trimStart().toLowerCase();
      const timeZone = (low === 'with' || low === 'without') && /^(local\s+)?time\s+zone\b/.test(next);
      if ((TYPE_STOP.has(low) && !timeZone) ||(low === 'character' && next.startsWith('set')) || (low === 'charset')) {
        return { type: rest.slice(0, m.index), tail: rest.slice(m.index) };
      }
    }
  }
  return { type: rest, tail: '' };
}

const cleanType = (t: string) =>
  t
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();

const FK_RE = new RegExp(String.raw`foreign\s+key\s*(?:${IDENT}\s*)?\(([^)]*)\)\s*references\s+(${QNAME})\s*(?:\(([^)]*)\))?`, 'i');
const PK_RE = /primary\s+key\s*(?:clustered|nonclustered)?\s*\(([^)]*)\)/i;

export interface ParsedSchema {
  tables: Table[];
  foreignKeys: ForeignKey[];
  warnings: string[];
}

export function parseSql(sql: string): ParsedSchema {
  const warnings: string[] = [];
  const tables = new Map<string, Table>();
  const fks: ForeignKey[] = [];
  const pending: Array<{ table: string; cols: string[] }> = [];
  const text = stripComments(sql.replace(/\r\n?/g, '\n')).replace(/^\s*go\s*$/gim, ';');

  for (const stmt of splitTop(text, ';')) {
    const create = new RegExp(
      String.raw`^create\s+(?:or\s+replace\s+)?(?:(?:global|local)\s+)?(?:temp(?:orary)?\s+|unlogged\s+|virtual\s+)?table\s+(?:if\s+not\s+exists\s+)?(${QNAME})\s*\(`,
      'i',
    ).exec(stmt);
    if (create) {
      const open = create.index + create[0].length - 1;
      const close = matchParen(stmt, open);
      if (close < 0) {
        warnings.push(`Unbalanced parentheses in CREATE TABLE ${create[1]}.`);
        continue;
      }
      const name = lastPart(create[1]);
      const table: Table = { name, columns: [] };
      if (tables.has(key(name))) warnings.push(`Table ${name} is defined twice; using the last definition.`);
      tables.set(key(name), table);
      for (let item of splitTop(stmt.slice(open + 1, close), ',')) {
        item = item.replace(new RegExp(String.raw`^constraint\s+${IDENT}\s+`, 'i'), '');
        let m: RegExpExecArray | null;
        if (/^primary\s+key\b/i.test(item)) {
          if ((m = PK_RE.exec(item))) pending.push({ table: name, cols: identList(m[1]) });
          continue;
        }
        if (/^foreign\s+key\b/i.test(item)) {
          if ((m = FK_RE.exec(item))) fks.push({ table: name, columns: identList(m[1]), refTable: lastPart(m[2]), refColumns: identList(m[3] ?? '') });
          continue;
        }
        if (/^(unique|key|index|fulltext|spatial|check|exclude|period|like|table\s+constraint)\b/i.test(item)) continue;
        const col = new RegExp(String.raw`^(${IDENT})\s*([\s\S]*)$`).exec(item);
        if (!col) continue;
        const { type, tail } = splitType(col[2]);
        const column: Column = { name: unquote(col[1]), type: cleanType(type), pk: /\bprimary\s+key\b/i.test(tail), fk: false };
        const ref = new RegExp(String.raw`\breferences\s+(${QNAME})\s*(?:\(([^)]*)\))?`, 'i').exec(tail);
        if (ref) fks.push({ table: name, columns: [column.name], refTable: lastPart(ref[1]), refColumns: identList(ref[2] ?? '') });
        table.columns.push(column);
      }
      continue;
    }
    const alter = new RegExp(String.raw`^alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(${QNAME})\s+([\s\S]*)$`, 'i').exec(stmt);
    if (alter) {
      const name = lastPart(alter[1]);
      for (const action of splitTop(alter[2], ',')) {
        let m: RegExpExecArray | null;
        if ((m = FK_RE.exec(action))) fks.push({ table: name, columns: identList(m[1]), refTable: lastPart(m[2]), refColumns: identList(m[3] ?? '') });
        else if ((m = PK_RE.exec(action))) pending.push({ table: name, cols: identList(m[1]) });
      }
      continue;
    }
  }

  for (const p of pending) {
    const t = tables.get(key(p.table));
    for (const c of p.cols) {
      const col = t?.columns.find((x) => key(x.name) === key(c));
      if (col) col.pk = true;
    }
  }
  const valid: ForeignKey[] = [];
  const seen = new Set<string>();
  for (const fk of fks) {
    const t = tables.get(key(fk.table));
    const ref = tables.get(key(fk.refTable));
    if (!t) continue;
    for (const c of fk.columns) {
      const col = t.columns.find((x) => key(x.name) === key(c));
      if (col) col.fk = true;
    }
    if (!ref) {
      warnings.push(`${fk.table} references unknown table ${fk.refTable}.`);
      continue;
    }
    const sig = `${key(t.name)}|${fk.columns.map(key).join(',')}|${key(ref.name)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    valid.push({ ...fk, table: t.name, refTable: ref.name });
  }
  return { tables: [...tables.values()], foreignKeys: valid, warnings };
}

export function entityText(name: string, rows: Array<{ keys: string; name: string; type: string }>): string {
  return [name, rows.map((r) => `${r.keys ? r.keys + ' ' : ''}${r.name}${r.type ? '  ' + r.type : ''}`).join('\n')].join('\n--\n');
}

export function importSql(sql: string): ImportResult {
  const { tables, foreignKeys, warnings } = parseSql(sql);
  if (!tables.length) throw new Error('No CREATE TABLE statements found.');
  const nodes: SpecNode[] = tables.map((t) => ({
    id: key(t.name),
    kind: 'erd.entity',
    text: entityText(
      t.name,
      t.columns.map((c) => ({ keys: [c.pk ? 'PK' : '', c.fk ? 'FK' : ''].filter(Boolean).join(','), name: c.name, type: c.type })),
    ),
  }));
  const edges: SpecEdge[] = foreignKeys.map((fk) => ({ from: key(fk.table), to: key(fk.refTable), startArrow: 'erMany', endArrow: 'erOnlyOne' }));
  const out = layoutSpec({ type: 'erd', direction: 'LR', nodes, edges });
  return { pages: [{ name: 'SQL', doc: makeDoc(out.elements) }], warnings };
}

export const importer: Importer = {
  id: 'sql',
  label: 'SQL…',
  description: 'CREATE TABLE statements (MySQL, PostgreSQL, SQL Server, SQLite) become ER tables with crow\'s-foot relations.',
  extensions: ['sql', 'ddl'],
  acceptsText: true,
  example: `CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  total NUMERIC(10, 2)
);

CREATE TABLE order_items (
  order_id INT,
  sku VARCHAR(32),
  qty INT,
  PRIMARY KEY (order_id, sku),
  FOREIGN KEY (order_id) REFERENCES orders (id)
);`,
  detect: (content) => typeof content === 'string' && /\bcreate\s+table\b/i.test(content.slice(0, 20000)),
  run: async (content) => importSql(toText(content)),
};
