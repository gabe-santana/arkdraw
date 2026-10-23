import type { DiagramSpec } from '@/ai/generate/spec';
import { Builder, MUTED, TONES, specPage } from '../kit';
import type { Template } from '../types';

const shop: DiagramSpec = {
  type: 'erd',
  direction: 'LR',
  nodes: [
    { id: 'customers', kind: 'erd.entity', text: 'customers', attributes: ['PK  id  uuid', 'email  text', 'name  text', 'created_at  timestamptz'] },
    { id: 'addresses', kind: 'erd.entity', text: 'addresses', attributes: ['PK  id  uuid', 'FK  customer_id  uuid', 'line1  text', 'city  text', 'country  char(2)'] },
    { id: 'orders', kind: 'erd.entity', text: 'orders', attributes: ['PK  id  uuid', 'FK  customer_id  uuid', 'FK  address_id  uuid', 'status  order_status', 'total_cents  int'] },
    { id: 'items', kind: 'erd.entity', text: 'order_items', attributes: ['PK  id  uuid', 'FK  order_id  uuid', 'FK  product_id  uuid', 'quantity  int', 'price_cents  int'] },
    { id: 'products', kind: 'erd.entity', text: 'products', attributes: ['PK  id  uuid', 'FK  category_id  uuid', 'sku  text', 'title  text', 'price_cents  int'] },
    { id: 'categories', kind: 'erd.entity', text: 'categories', attributes: ['PK  id  uuid', 'FK  parent_id  uuid', 'name  text'] },
    { id: 'payments', kind: 'erd.entity', text: 'payments', attributes: ['PK  id  uuid', 'FK  order_id  uuid', 'provider  text', 'amount_cents  int', 'paid_at  timestamptz'] },
  ],
  edges: [
    { from: 'customers', to: 'addresses', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'customers', to: 'orders', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'addresses', to: 'orders', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'orders', to: 'items', startArrow: 'erOnlyOne', endArrow: 'erOneMany' },
    { from: 'products', to: 'items', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'categories', to: 'products', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'orders', to: 'payments', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
  ],
};

const saas: DiagramSpec = {
  type: 'erd',
  direction: 'TB',
  nodes: [
    { id: 'tenants', kind: 'erd.entity', text: 'organizations', attributes: ['PK  id  uuid', 'name  text', 'plan  plan_tier', 'created_at  timestamptz'] },
    { id: 'users', kind: 'erd.entity', text: 'users', attributes: ['PK  id  uuid', 'email  citext', 'name  text', 'avatar_url  text'] },
    { id: 'members', kind: 'erd.entity', text: 'memberships', attributes: ['PK  id  uuid', 'FK  org_id  uuid', 'FK  user_id  uuid', 'role  member_role'] },
    { id: 'projects', kind: 'erd.entity', text: 'projects', attributes: ['PK  id  uuid', 'FK  org_id  uuid', 'name  text', 'archived  bool'] },
    { id: 'docs', kind: 'erd.entity', text: 'documents', attributes: ['PK  id  uuid', 'FK  project_id  uuid', 'FK  author_id  uuid', 'title  text', 'body  jsonb'] },
    { id: 'subs', kind: 'erd.entity', text: 'subscriptions', attributes: ['PK  id  uuid', 'FK  org_id  uuid', 'stripe_id  text', 'status  text', 'renews_at  date'] },
    { id: 'audit', kind: 'erd.entity', text: 'audit_log', attributes: ['PK  id  bigint', 'FK  org_id  uuid', 'FK  actor_id  uuid', 'action  text', 'at  timestamptz'] },
  ],
  edges: [
    { from: 'tenants', to: 'members', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'users', to: 'members', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'tenants', to: 'projects', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'tenants', to: 'subs', startArrow: 'erOnlyOne', endArrow: 'erZeroOne' },
    { from: 'projects', to: 'docs', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'users', to: 'docs', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
    { from: 'tenants', to: 'audit', startArrow: 'erOnlyOne', endArrow: 'erZeroMany' },
  ],
};

function tablePage(title: string, subtitle: string, cells: string[][], colW: number[], tone: keyof typeof TONES, note: string) {
  const b = new Builder();
  const w = colW.reduce((a, c) => a + c, 0);
  b.title(title, 0, 0, w, subtitle);
  const rows = cells.map((_, i) => (i === 0 ? 44 : 38));
  const t = TONES[tone];
  b.shape(
    'table',
    { x: 0, y: 92, w, h: rows.reduce((a, c) => a + c, 0) },
    { fill: '#ffffff', stroke: t.stroke, textColor: '#0f172a', fontSize: 13, radius: 8, strokeWidth: 1 },
    '',
    { table: { cols: colW, rows, cells, header: true } },
  );
  b.text(note, { x: 0, y: 92 + rows.reduce((a, c) => a + c, 0) + 12, w, h: 22 }, { fontSize: 12, textColor: MUTED, textAlign: 'left' });
  return [b.page(title)];
}

export const TABLE_TEMPLATES: Template[] = [
  {
    id: 'erd-ecommerce',
    name: 'E-commerce database',
    category: 'Tables & ERD',
    description: 'Entity-relationship diagram with customers, orders, products, categories and payments in crow’s-foot notation.',
    keywords: ['erd', 'database', 'schema', 'sql', 'tables', 'crows foot', 'ecommerce', 'postgres'],
    build: () => specPage('E-commerce ERD', 'E-commerce schema', 'Entity-relationship diagram (crow’s foot notation)', shop),
  },
  {
    id: 'erd-saas',
    name: 'Multi-tenant SaaS schema',
    category: 'Tables & ERD',
    description: 'Organizations, users, memberships, projects, documents, subscriptions and an audit log.',
    keywords: ['erd', 'database', 'saas', 'multi tenant', 'schema', 'sql'],
    build: () => specPage('SaaS ERD', 'Multi-tenant SaaS schema', 'Organizations own everything; users join through memberships', saas),
  },
  {
    id: 'table-comparison',
    name: 'Pricing comparison table',
    category: 'Tables & ERD',
    description: 'Feature comparison across three plans, ready to edit cell by cell.',
    keywords: ['table', 'comparison', 'pricing', 'features', 'plans', 'matrix'],
    build: () =>
      tablePage(
        'Plan comparison',
        'Feature matrix for the pricing page',
        [
          ['Feature', 'Free', 'Pro', 'Enterprise'],
          ['Price / user / month', '$0', '$12', 'Custom'],
          ['Diagrams', 'Unlimited', 'Unlimited', 'Unlimited'],
          ['Templates', '40+', '40+', 'Custom library'],
          ['Cloud sync', '—', '✓', '✓'],
          ['Version history', '7 days', '1 year', 'Unlimited'],
          ['SSO / SAML', '—', '—', '✓'],
          ['Support', 'Community', 'Email', 'Dedicated'],
        ],
        [220, 150, 150, 170],
        'indigo',
        'Tip: double-click a cell to edit it.',
      ),
  },
  {
    id: 'table-raci',
    name: 'RACI matrix',
    category: 'Tables & ERD',
    description: 'Responsible, accountable, consulted and informed roles for each deliverable.',
    keywords: ['raci', 'matrix', 'roles', 'responsibility', 'project management', 'table'],
    build: () =>
      tablePage(
        'RACI matrix',
        'Website relaunch — who does what',
        [
          ['Deliverable', 'Product', 'Design', 'Engineering', 'Marketing', 'Legal'],
          ['Requirements', 'A', 'C', 'C', 'C', 'I'],
          ['Visual design', 'C', 'R/A', 'C', 'C', 'I'],
          ['Implementation', 'C', 'C', 'R/A', 'I', 'I'],
          ['Content & copy', 'C', 'C', 'I', 'R/A', 'C'],
          ['Privacy review', 'I', 'I', 'C', 'I', 'R/A'],
          ['Launch', 'A', 'I', 'R', 'R', 'I'],
        ],
        [180, 110, 110, 120, 110, 100],
        'teal',
        'R = Responsible · A = Accountable · C = Consulted · I = Informed',
      ),
  },
];
