/**
 * Template gallery catalog. Every template builds its pages lazily (fresh ids
 * per call) from code: auto-layout specs, layout algorithms or computed grids.
 */
import { newPage } from '@/store/editor';
import type { Template } from './types';
import { templateCategory, templateDescription, templateName } from '@/i18n/catalog';
import { BASIC_TEMPLATES } from './library/basic';
import { FLOWCHART_TEMPLATES } from './library/flowcharts';
import { SOFTWARE_TEMPLATES } from './library/software';
import { CLOUD_TEMPLATES } from './library/cloud';
import { NETWORK_TEMPLATES } from './library/network';
import { BUSINESS_TEMPLATES } from './library/business';
import { TABLE_TEMPLATES } from './library/tables';
import { MINDMAP_TEMPLATES } from './library/mindmaps';
import { ORG_TEMPLATES } from './library/org';
import { WIREFRAME_TEMPLATES } from './library/wireframes';
import { ENGINEERING_TEMPLATES } from './library/engineering';
import { MAP_TEMPLATES } from './library/maps';
import { AGILE_TEMPLATES } from './library/agile';
import { CHART_TEMPLATES } from './library/charts';
import { EDUCATION_TEMPLATES } from './library/education';

export const BLANK_TEMPLATE: Template = {
  id: 'blank',
  name: 'Blank diagram',
  category: 'Basic',
  description: 'An empty canvas. Start from scratch.',
  keywords: ['blank', 'empty', 'new', 'scratch'],
  build: () => [newPage('Page 1')],
};

export const TEMPLATES: Template[] = [
  BLANK_TEMPLATE,
  ...BASIC_TEMPLATES,
  ...FLOWCHART_TEMPLATES,
  ...SOFTWARE_TEMPLATES,
  ...CLOUD_TEMPLATES,
  ...NETWORK_TEMPLATES,
  ...BUSINESS_TEMPLATES,
  ...TABLE_TEMPLATES,
  ...MINDMAP_TEMPLATES,
  ...ORG_TEMPLATES,
  ...WIREFRAME_TEMPLATES,
  ...ENGINEERING_TEMPLATES,
  ...MAP_TEMPLATES,
  ...AGILE_TEMPLATES,
  ...CHART_TEMPLATES,
  ...EDUCATION_TEMPLATES,
];

export { CATEGORIES, type Template, type TemplateCategory } from './types';

/**
 * Case-insensitive search over name, category, description and keywords —
 * in English and in the UI language.
 */
export function searchTemplates(list: Template[], query: string): Template[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((t) => {
    const hay = `${t.name} ${t.category} ${t.description} ${t.keywords.join(' ')} ${templateName(t)} ${templateCategory(t.category)} ${templateDescription(t)}`.toLowerCase();
    return terms.every((term) => hay.includes(term));
  });
}
