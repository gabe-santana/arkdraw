/**
 * mxGraph's CSV import (Arrange > Insert > Advanced > CSV).
 *
 * Lines starting with `##` are comments, `# key: value` lines configure the
 * import (a trailing `\` continues a directive on the next `#` line), and the
 * rest is CSV whose first row holds the column names. Supported directives:
 *
 *   label, labelname + labels   label template with %column% placeholders (HTML → text)
 *   style, stylename + styles   (placeholders allowed), mapped to ArkDraw
 *   vars                        JSON of extra %placeholders% for styles
 *   parentstyle                 style for rows that have children
 *   identity, parent            id column / parent-id column → nested containers
 *   namespace                   accepted (ids are regenerated anyway)
 *   connect                     JSON {from, to, invert, label, style, fromlabel, tolabel,
 *                               sourcelabel, targetlabel, placeholders}; repeatable
 *   width, height               number, `auto` or `@column`
 *   padding                     added to auto sizes
 *   left, top                   position columns (used with layout none)
 *   ignore                      columns not stored as element data
 *   link                        column used as the element link
 *   collapsed                   containers start collapsed
 *   nodespacing, levelspacing   layout spacing (edgespacing is accepted, not used)
 *   layout                      auto | none | verticaltree | horizontaltree | verticalflow |
 *                               horizontalflow | orgchart | organic | circle (JSON layouts →
 *                               auto, with a warning)
 *
 * Other columns are kept as element data (`data`), a `tooltip` column as the tooltip.
 */
import type { DiagramElement, ElementStyle, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import type { DiagramSpec, Direction, SpecEdge, SpecNode } from '@/ai/generate/spec';
import type { ImportResult, Importer } from './types';
import { connectShapes, htmlToPlain, layoutSpec, makeDoc, mapDrawioStyle, toText } from './_shared';

export interface ConnectDef {
  from: string;
  to: string;
  invert?: boolean;
  label?: string;
  style?: string;
  fromlabel?: string;
  tolabel?: string;
  sourcelabel?: string;
  targetlabel?: string;
  placeholders?: 'source' | 'target';
}

export interface CsvConfig {
  [key: string]: unknown;
  connect: ConnectDef[];
}

/** RFC 4180-ish CSV: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsvRows(text: string, sep = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const pushRow = () => {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== '') rows.push(row);
    row = [];
    field = '';
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') quoted = false;
      else field += c;
      i++;
      continue;
    }
    if (c === '"' && field.trim() === '') {
      quoted = true;
      field = '';
    } else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n') pushRow();
    else if (c !== '\r') field += c;
    i++;
  }
  if (field !== '' || row.length) pushRow();
  return rows;
}

/** Splits the text into directives and the CSV body. */
export function parseCsvConfig(text: string): { config: CsvConfig; csv: string; warnings: string[] } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const config: CsvConfig = { connect: [] };
  const warnings: string[] = [];
  let i = 0;
  for (; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim()) continue;
    if (line[0] !== '#') break;
    if (line.startsWith('##')) continue;
    while (line.endsWith('\\') && i + 1 < lines.length && lines[i + 1][0] === '#') {
      line = line.slice(0, -1) + lines[i + 1].slice(1).trim();
      i++;
    }
    const body = line.slice(1).trim();
    const colon = body.indexOf(':');
    if (colon < 0) continue;
    const key = body.slice(0, colon).trim().toLowerCase();
    const value = body.slice(colon + 1).trim();
    if (key === 'connect') {
      try {
        const def = JSON.parse(value) as ConnectDef;
        if (def && def.from && def.to) config.connect.push(def);
      } catch {
        warnings.push(`Ignored invalid connect JSON: ${value.slice(0, 60)}`);
      }
    } else if (key === 'styles' || key === 'labels' || key === 'vars') {
      if (value && value !== '-') {
        try {
          config[key] = JSON.parse(value);
        } catch {
          warnings.push(`Ignored invalid ${key} JSON.`);
        }
      }
    } else config[key] = value;
  }
  return { config, csv: lines.slice(i).join('\n'), warnings };
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' && v !== '-' ? v : undefined);

function fill(template: string, row: Record<string, string>, vars: Record<string, string> = {}): string {
  return template.replace(/%([^%\s;]+)%/g, (all, k: string) => (k in row ? row[k] : k in vars ? vars[k] : all));
}

const LAYOUTS: Record<string, Direction> = {
  auto: 'TB', verticaltree: 'TB', verticalflow: 'TB', orgchart: 'TB', organic: 'TB',
  horizontaltree: 'LR', horizontalflow: 'LR',
};

const RESERVED = new Set(['id', 'tooltip', 'placeholder', 'placeholders', 'link', 'label']);

export function importCsv(text: string): ImportResult {
  const { config, csv, warnings } = parseCsvConfig(text);
  const rows = parseCsvRows(csv);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
  const header = rows[0].map((h) => h.trim());
  const records: Array<Record<string, string>> = rows.slice(1).map((r) => Object.fromEntries(header.map((h, k) => [h, (r[k] ?? '').trim()])));

  const vars = (config.vars as Record<string, string>) ?? {};
  const identity = str(config.identity);
  const parentCol = str(config.parent);
  const ignore = new Set((str(config.ignore) ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  const linkCol = str(config.link);
  const layoutName = (str(config.layout) ?? 'auto').toLowerCase();
  const padding = Number(str(config.padding) ?? 0) || 0;
  const nodesep = Number(str(config.nodespacing) ?? 40) || 40;
  const ranksep = Number(str(config.levelspacing) ?? 100) || 100;
  const leftCol = str(config.left);
  const topCol = str(config.top);

  // ----- Nodes -------------------------------------------------------------
  const ids = records.map((r, k) => (identity && r[identity] ? r[identity] : `row${k}`));
  const idSet = new Set(ids);
  const parents = records.map((r) => (parentCol && r[parentCol] && idSet.has(r[parentCol]) ? r[parentCol] : undefined));
  if (parentCol && !identity) warnings.push('`parent` needs `identity`; ignored.');
  const hasChildren = new Set(parents.filter(Boolean) as string[]);

  const nodes: SpecNode[] = [];
  const sizes = new Map<string, { w?: number; h?: number }>();
  const styles = new Map<string, { style: Partial<ElementStyle>; container: boolean }>();
  let images = 0;
  records.forEach((r, k) => {
    const id = ids[k];
    let labelTpl = str(config.label) ?? `%${header[0]}%`;
    const labelName = str(config.labelname);
    const labels = config.labels as Record<string, string> | undefined;
    if (labelName && labels && labels[r[labelName]]) labelTpl = labels[r[labelName]];
    let styleTpl = str(config.style) ?? '';
    const styleName = str(config.stylename);
    const named = config.styles as Record<string, string> | undefined;
    if (styleName && named && named[r[styleName]] !== undefined) styleTpl = named[r[styleName]];
    const parentStyle = str(config.parentstyle);
    if (hasChildren.has(id) && parentStyle) styleTpl = parentStyle;
    const mapped = mapDrawioStyle(fill(styleTpl, r, vars));
    if (mapped.image && mapped.kind !== 'image' && mapped.kind !== 'icon') images++;
    const container = hasChildren.has(id) || mapped.container;
    nodes.push({ id, kind: container ? 'container' : mapped.kind, text: htmlToPlain(fill(labelTpl, r, vars)), ...(parents[k] && parents[k] !== id ? { parent: parents[k] } : {}) });
    styles.set(id, { style: mapped.style, container });
    const dim = (v: string | undefined) => {
      if (!v || v === 'auto') return undefined;
      const n = Number(v.startsWith('@') ? r[v.slice(1)] : v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const w = dim(str(config.width));
    const h = dim(str(config.height));
    if (w || h) sizes.set(id, { w, h });
  });
  if (images) warnings.push(`${images} image reference(s) in node styles were not imported.`);

  // ----- Edges -------------------------------------------------------------
  const edges: SpecEdge[] = [];
  const edgeStyles: Array<Partial<ElementStyle>> = [];
  for (const def of config.connect) {
    records.forEach((r, k) => {
      const value = r[def.from];
      if (!value) return;
      for (const ref of value.split(',').map((s) => s.trim()).filter(Boolean)) {
        records.forEach((t, j) => {
          if (t[def.to] !== ref) return;
          const [src, dst] = def.invert ? [j, k] : [k, j];
          const S = records[src];
          const T = records[dst];
          const label = [
            def.fromlabel ? S[def.fromlabel] ?? '' : '',
            def.sourcelabel ? fill(def.sourcelabel, S, vars) : '',
            def.label ?? '',
            def.tolabel ? T[def.tolabel] ?? '' : '',
            def.targetlabel ? fill(def.targetlabel, T, vars) : '',
          ].join('');
          const mapped = mapDrawioStyle(fill(def.style ?? '', def.placeholders === 'target' ? T : S, vars), true);
          edges.push({ from: ids[src], to: ids[dst], startArrow: mapped.startArrow, endArrow: mapped.endArrow, routing: mapped.routing, ...(label ? { label: htmlToPlain(label) } : {}) });
          edgeStyles.push(mapped.style);
        });
      }
    });
  }

  // ----- Layout ------------------------------------------------------------
  const absolute = layoutName === 'none' || (layoutName === 'auto' && !!leftCol && !!topCol);
  let direction = LAYOUTS[layoutName];
  if (!direction && layoutName !== 'circle' && layoutName !== 'none') {
    warnings.push(`Layout "${layoutName.slice(0, 40)}" is not supported; using a vertical tree.`);
    direction = 'TB';
  }
  if (layoutName === 'organic') warnings.push('Organic layout approximated with a layered layout.');
  const spec: DiagramSpec = { type: 'generic', direction: direction ?? 'TB', nodes, edges };
  const out = layoutSpec(spec, { sizes, padding, nodesep, ranksep });

  records.forEach((r, k) => {
    const s = out.shapes.get(ids[k]);
    if (!s) return;
    const st = styles.get(ids[k])!;
    s.style = { ...s.style, ...st.style, ...(st.container ? { textAlign: 'left' as const, bold: true } : {}) };
    if (linkCol && r[linkCol]) s.link = r[linkCol];
    if (r.tooltip) s.tooltip = r.tooltip;
    const data: Record<string, string> = {};
    for (const h of header) if (!ignore.has(h) && !RESERVED.has(h) && h !== linkCol && r[h] !== '') data[h] = r[h];
    if (Object.keys(data).length) s.data = data;
    if (st.container && str(config.collapsed) === 'true') s.collapsed = true;
  });
  out.connectors.forEach((c, i) => {
    c.style = { ...c.style, ...edgeStyles[i], fill: 'none' };
  });

  let elements: DiagramElement[] = out.elements;
  if (absolute || layoutName === 'circle') {
    const top = records.map((_, k) => out.shapes.get(ids[k])).filter((s): s is ShapeElement => !!s && !s.containerId);
    const moveTree = (s: ShapeElement, x: number, y: number) => {
      const dx = x - s.x;
      const dy = y - s.y;
      const all = elements.filter(isShape);
      const stack = [s];
      while (stack.length) {
        const cur = stack.pop()!;
        cur.x = Math.round(cur.x + dx);
        cur.y = Math.round(cur.y + dy);
        stack.push(...all.filter((c) => c.containerId === cur.id));
      }
    };
    if (layoutName === 'circle') {
      const maxDim = Math.max(...top.map((s) => Math.max(s.w, s.h)));
      const circumference = top.reduce((n, s) => n + Math.max(s.w, s.h) + nodesep, 0);
      const radius = Math.max(maxDim, circumference / (2 * Math.PI));
      top.forEach((s, k) => {
        const a = (2 * Math.PI * k) / top.length - Math.PI / 2;
        moveTree(s, radius + radius * Math.cos(a) - s.w / 2, radius + radius * Math.sin(a) - s.h / 2);
      });
    } else {
      let gridX = 0;
      records.forEach((r, k) => {
        const s = out.shapes.get(ids[k]);
        if (!s) return;
        const x = Number(leftCol ? r[leftCol] : NaN);
        const y = Number(topCol ? r[topCol] : NaN);
        const parent = s.containerId ? elements.find((e) => e.id === s.containerId) : undefined;
        const ox = isShape(parent) ? parent.x : 0;
        const oy = isShape(parent) ? parent.y : 0;
        if (Number.isFinite(x) && Number.isFinite(y)) moveTree(s, ox + x, oy + y);
        else if (!s.containerId) {
          moveTree(s, gridX, -s.h - 40);
          gridX += s.w + nodesep;
        }
      });
    }
    // Re-attach connectors to the moved shapes.
    const byId = new Map(elements.filter(isShape).map((s) => [s.id, s]));
    elements = elements.map((e) => {
      if (e.type !== 'connector') return e;
      const a = byId.get(e.source.elementId ?? '');
      const b = byId.get(e.target.elementId ?? '');
      if (!a || !b) return e;
      const fresh = connectShapes(a, b);
      return { ...e, source: fresh.source, target: fresh.target };
    });
  }
  return { pages: [{ name: 'CSV', doc: makeDoc(elements) }], warnings };
}

export const importer: Importer = {
  id: 'csv',
  label: 'CSV…',
  description: 'CSV with # directives (label, style, connect, layout, …) — great for org charts.',
  extensions: ['csv'],
  acceptsText: true,
  example: `## Org chart in CSV. ## = comment, # = directive.
# label: %name%<br><i style="color:gray;">%position%</i><br>%email%
# style: label;image=%image%;whiteSpace=wrap;html=1;rounded=1;fillColor=%fill%;strokeColor=%stroke%;
# namespace: csvimport-
# connect: {"from": "manager", "to": "name", "invert": true, "label": "manages", \\
#          "style": "curved=1;endArrow=blockThin;endFill=1;fontSize=11;"}
# connect: {"from": "refs", "to": "id", "style": "curved=1;fontSize=11;"}
# width: auto
# height: auto
# padding: -12
# ignore: id,image,fill,stroke,refs,manager
# link: url
# nodespacing: 40
# levelspacing: 100
# edgespacing: 40
# layout: auto
## ---- CSV below this line. First line are column names. ----
name,position,id,location,manager,email,fill,stroke,refs,url,image
Tessa Miller,CFO,emi,Office 1,,me@example.com,#dae8fc,#6c8ebf,,https://www.mxGraph,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-9-2-128.png
Edward Morrison,Brand Manager,emo,Office 2,Tessa Miller,em@example.com,#d5e8d4,#82b366,,https://www.mxGraph,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-10-3-128.png
Alison Donovan,System Admin,rdo,Office 3,Tessa Miller,rd@example.com,#d5e8d4,#82b366,"emo,tva",https://www.mxGraph,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-2-128.png
Evan Valet,HR Director,tva,Office 4,Tessa Miller,tva@example.com,#d5e8d4,#82b366,,https://www.mxGraph,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-3-128.png`,
  detect: (content) => typeof content === 'string' && /^#\s*(label|style|connect|layout)\s*:/m.test(content.slice(0, 10000)),
  run: async (content) => importCsv(toText(content)),
};
