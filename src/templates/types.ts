import type { Page } from '@/model/types';

export const CATEGORIES = [
  'Basic',
  'Flowcharts',
  'Software',
  'Cloud',
  'Network',
  'Business',
  'Tables & ERD',
  'Mind maps',
  'Org charts',
  'Wireframes',
  'Engineering',
  'Maps',
  'Agile',
  'Charts & Infographics',
  'Education & Other',
] as const;

export type TemplateCategory = (typeof CATEGORIES)[number];

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  keywords: string[];
  /** Builds fresh pages (new ids every call). */
  build(): Page[];
}
