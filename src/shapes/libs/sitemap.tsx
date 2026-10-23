/**
 * Sitemap: page cards with a dog-eared corner, a glyph in the top area and
 * the page name in the text box below it.
 */
import type { ComponentType } from 'react';
import {
  ClipboardList, ExternalLink, FileText, Folder, House, Images, LayoutDashboard, LogIn, Mail, Newspaper, Search, Settings,
  ShoppingCart, TriangleAlert, User, Video, File,
  type LucideProps,
} from 'lucide-react';
import type { Rect } from '@/model/types';
import { Body } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Glyph, Tint, f, item, shape } from './_kit2';

const fold = (w: number, h: number) => Math.min(16, w * 0.16, h * 0.16);

function pagePath(w: number, h: number, radius: number) {
  const k = fold(w, h);
  const r = Math.max(0, Math.min(radius, w / 4, h / 4));
  return `M${f(r)},0 H${f(w - k)} L${f(w)},${f(k)} V${f(h - r)} Q${f(w)},${f(h)} ${f(w - r)},${f(h)} H${f(r)} Q0,${f(h)} 0,${f(h - r)} V${f(r)} Q0,0 ${f(r)},0 Z`;
}

function page(Icon: ComponentType<LucideProps>) {
  return function SitemapPage({ w, h, style }: ShapeRenderContext) {
    const k = fold(w, h);
    const g = Math.min(w * 0.4, h * 0.34);
    return (
      <>
        <Body d={pagePath(w, h, style.radius)} s={style} />
        <Tint d={`M${f(w - k)},0 V${f(k)} H${f(w)} Z`} s={style} k={0.14} />
        <path d={`M${f(w - k)},0 V${f(k)} H${f(w)}`} fill="none" stroke={style.stroke === 'none' ? 'none' : style.stroke} strokeWidth={style.strokeWidth} strokeLinejoin="round" />
        <Glyph Icon={Icon} cx={w / 2} cy={h * 0.34} size={g} s={style} sw={1.75} />
      </>
    );
  };
}

const textBox = (w: number, h: number): Rect => ({ x: 6, y: h * 0.58, w: Math.max(1, w - 12), h: Math.max(1, h * 0.4 - 4) });

const PAGES: Array<[string, string, ComponentType<LucideProps>, string, string]> = [
  ['page', 'Page', File, 'page', 'web page generic'],
  ['home', 'Home', House, 'home', 'index landing start'],
  ['folder', 'Section', Folder, 'folder', 'folder category group'],
  ['login', 'Login', LogIn, 'log_in', 'sign in auth account'],
  ['search', 'Search', Search, 'search', 'find results'],
  ['document', 'Document', FileText, 'document', 'article text pdf'],
  ['form', 'Form', ClipboardList, 'form', 'survey input signup'],
  ['cart', 'Checkout', ShoppingCart, 'shopping_cart', 'cart shop store ecommerce'],
  ['video', 'Video', Video, 'video', 'media movie player'],
  ['gallery', 'Gallery', Images, 'gallery', 'images photos'],
  ['blog', 'Blog', Newspaper, 'blog', 'news posts articles'],
  ['contact', 'Contact', Mail, 'contact_us', 'email support about'],
  ['profile', 'Profile', User, 'profile', 'account user'],
  ['dashboard', 'Dashboard', LayoutDashboard, 'dashboard', 'admin overview'],
  ['settings', 'Settings', Settings, 'settings', 'preferences config'],
  ['error', 'Error / 404', TriangleAlert, 'error', 'not found 404 500'],
  ['external', 'External link', ExternalLink, 'external_link', 'outbound url'],
];

export const shapes: ShapeDef[] = PAGES.map(([id, label, Icon, stencil]) =>
  shape(
    `sitemap.${id}`,
    label,
    `shape=mxgraph.sitemap.${stencil};verticalLabelPosition=middle;verticalAlign=bottom;whiteSpace=wrap;`,
    page(Icon),
    { rounded: true, textBox },
  ),
);

const pageStyle = { fill: '#ffffff', stroke: '#475569', radius: 6, fontSize: 13, textColor: '#0f172a' };

export const libraries: ShapeLibrary[] = [
  {
    id: 'sitemap',
    name: 'Sitemap',
    items: PAGES.map(([id, label, , , keywords]) =>
      item(`sitemap.${id}`, label, 110, 96, {
        text: label === 'Error / 404' ? '404' : label,
        style:
          id === 'home'
            ? { ...pageStyle, fill: '#dbeafe', stroke: '#2563eb' }
            : id === 'error'
              ? { ...pageStyle, fill: '#fee2e2', stroke: '#dc2626' }
              : id === 'external'
                ? { ...pageStyle, strokeStyle: 'dashed' }
                : pageStyle,
        keywords: `sitemap website ${keywords}`,
      }),
    ),
  },
];
