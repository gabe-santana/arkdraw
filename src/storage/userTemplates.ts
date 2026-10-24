/**
 * Custom templates ("My templates" in File → New from template…): the current
 * diagram, page or selection saved into a local store (IndexedDB), with
 * rename / delete and import / export as `.arkdrawtemplate` files.
 */
import { create } from 'zustand';
import type { Doc, Page } from '@/model/types';
import { uid } from '@/lib/id';
import { cloneElements, newPage, useEditor } from '@/store/editor';
import { parsePages, serializePages } from '@/io/fileFormat';
import type { Template, TemplateCategory } from '@/templates/types';
import { idbAll, idbDelete, idbGet, idbPut } from './idb';
import { t } from '@/i18n';

export const USER_CATEGORY = 'My templates';
export const USER_TEMPLATE_PREFIX = 'user:';
export const TEMPLATE_EXTENSION = 'arkdrawtemplate';

export interface StoredTemplate {
  id: string;
  name: string;
  description: string;
  created: number;
  /** `.arkdraw` JSON. */
  data: string;
}

export const isUserTemplate = (t: { id: string }) => t.id.startsWith(USER_TEMPLATE_PREFIX);

/** Pages with fresh element ids (every template build must be independent). */
function freshPages(data: string): Page[] {
  return parsePages(data).map((p) => {
    const clones = cloneElements(p.doc.order.map((id) => p.doc.elements[id]), { x: 0, y: 0 });
    const doc: Doc = { elements: Object.fromEntries(clones.map((e) => [e.id, e])), order: clones.map((e) => e.id), ...(p.doc.layers ? { layers: p.doc.layers } : {}) };
    return { ...newPage(p.name, doc), settings: { ...p.settings }, ...(p.data ? { data: { ...p.data } } : {}) };
  });
}

export function toTemplate(st: StoredTemplate): Template {
  return {
    id: `${USER_TEMPLATE_PREFIX}${st.id}`,
    name: st.name,
    category: USER_CATEGORY as TemplateCategory,
    description: st.description || t('storage.templateDescription'),
    keywords: ['my', 'custom', 'user', 'saved'],
    build: () => freshPages(st.data),
  };
}

interface State {
  stored: StoredTemplate[];
  templates: Template[];
  refresh: () => Promise<void>;
}

export const useUserTemplates = create<State>((set) => ({
  stored: [],
  templates: [],
  refresh: async () => {
    try {
      const stored = (await idbAll<StoredTemplate>('templates')).sort((a, b) => b.created - a.created);
      set({ stored, templates: stored.map(toTemplate) });
    } catch {
      set({ stored: [], templates: [] });
    }
  },
}));

const refresh = () => useUserTemplates.getState().refresh();
const storedId = (templateId: string) => templateId.slice(USER_TEMPLATE_PREFIX.length);

export type TemplateScope = 'diagram' | 'page' | 'selection';

/** Pages the scope captures from the editor. */
export function pagesForScope(scope: TemplateScope): Page[] {
  const s = useEditor.getState();
  if (scope === 'diagram') return s.allPages();
  const page = s.allPages().find((p) => p.id === s.activePageId)!;
  if (scope === 'page') return [page];
  const ids = new Set(s.selection);
  // Selected shapes plus connectors between them.
  for (const id of s.doc.order) {
    const el = s.doc.elements[id];
    if (el?.type === 'connector' && el.source.elementId && el.target.elementId && ids.has(el.source.elementId) && ids.has(el.target.elementId)) ids.add(id);
  }
  const order = s.doc.order.filter((id) => ids.has(id));
  return [{ ...page, doc: { ...s.doc, elements: Object.fromEntries(order.map((id) => [id, s.doc.elements[id]])), order } }];
}

export async function saveTemplate(name: string, description: string, pages: Page[]): Promise<StoredTemplate> {
  const st: StoredTemplate = { id: uid(), name: name.trim() || 'Untitled template', description: description.trim(), created: Date.now(), data: serializePages(pages) };
  await idbPut('templates', st);
  await refresh();
  return st;
}

export async function renameTemplate(templateId: string, name: string) {
  const st = await idbGet<StoredTemplate>('templates', storedId(templateId));
  if (!st || !name.trim()) return;
  await idbPut('templates', { ...st, name: name.trim() });
  await refresh();
}

export async function deleteTemplate(templateId: string) {
  await idbDelete('templates', storedId(templateId));
  await refresh();
}

/** `.arkdrawtemplate` file contents. */
export async function templateFile(templateId: string): Promise<{ name: string; text: string } | null> {
  const st = await idbGet<StoredTemplate>('templates', storedId(templateId));
  if (!st) return null;
  const text = JSON.stringify({ format: 'arkdraw-template', version: 1, name: st.name, description: st.description, diagram: JSON.parse(st.data) }, null, 2) + '\n';
  return { name: `${st.name.replace(/[\\/:*?"<>|]+/g, '-')}.${TEMPLATE_EXTENSION}`, text };
}

/** Imports a `.arkdrawtemplate` (or a plain `.arkdraw` file, named after the file). */
export async function importTemplateFile(text: string, fileName: string): Promise<StoredTemplate> {
  const data = JSON.parse(text) as { format?: string; name?: string; description?: string; diagram?: unknown };
  if (data?.format === 'arkdraw-template' && data.diagram) {
    const json = JSON.stringify(data.diagram);
    return saveTemplate(data.name ?? fileName.replace(/\.[^.]+$/, ''), data.description ?? '', parsePages(json));
  }
  return saveTemplate(fileName.replace(/\.[^.]+$/, ''), '', parsePages(text));
}
