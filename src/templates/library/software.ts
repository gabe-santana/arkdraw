import type { DiagramSpec } from '@/ai/generate/spec';
import { Builder, specPage, TONES, soft } from '../kit';
import type { Template } from '../types';

// ---------------------------------------------------------------------------
// UML
// ---------------------------------------------------------------------------

const classes: DiagramSpec = {
  type: 'class',
  direction: 'TB',
  nodes: [
    { id: 'entity', kind: 'uml.class', text: '«abstract»\nEntity', attributes: ['# id: UUID', '# createdAt: Date'], methods: ['+ equals(o: Entity): bool'] },
    { id: 'customer', kind: 'uml.class', text: 'Customer', attributes: ['- name: string', '- email: Email', '- tier: Tier'], methods: ['+ placeOrder(cart: Cart): Order', '+ upgrade(): void'] },
    { id: 'order', kind: 'uml.class', text: 'Order', attributes: ['- status: OrderStatus', '- total: Money'], methods: ['+ addLine(p: Product, qty: int)', '+ submit(): void', '+ cancel(): void'] },
    { id: 'line', kind: 'uml.class', text: 'OrderLine', attributes: ['- quantity: int', '- price: Money'], methods: ['+ subtotal(): Money'] },
    { id: 'product', kind: 'uml.class', text: 'Product', attributes: ['- sku: string', '- title: string', '- price: Money'] },
    { id: 'payment', kind: 'uml.class', text: '«interface»\nPaymentMethod', methods: ['+ authorize(m: Money): bool', '+ capture(): void'] },
    { id: 'card', kind: 'uml.class', text: 'CreditCard', attributes: ['- last4: string', '- expiry: Date'] },
    { id: 'paypal', kind: 'uml.class', text: 'PayPal', attributes: ['- account: Email'] },
  ],
  edges: [
    { from: 'customer', to: 'entity', endArrow: 'triangleOpen' },
    { from: 'order', to: 'entity', endArrow: 'triangleOpen' },
    { from: 'customer', to: 'order', label: '1  places  *', endArrow: 'arrow' },
    { from: 'order', to: 'line', startArrow: 'diamond', endArrow: 'none', label: '1..*' },
    { from: 'line', to: 'product', endArrow: 'arrow', label: '1' },
    { from: 'order', to: 'payment', endArrow: 'arrow', label: 'paid with' },
    { from: 'card', to: 'payment', endArrow: 'triangleOpen', dashed: true },
    { from: 'paypal', to: 'payment', endArrow: 'triangleOpen', dashed: true },
  ],
};

const sequence: DiagramSpec = {
  type: 'sequence',
  nodes: [
    { id: 'user', kind: 'uml.lifeline', text: ':User' },
    { id: 'web', kind: 'uml.lifeline', text: ':Web App', style: { fill: '#ccfbf1', stroke: '#0d9488' } },
    { id: 'api', kind: 'uml.lifeline', text: ':Checkout API', style: { fill: '#dbeafe', stroke: '#2563eb' } },
    { id: 'pay', kind: 'uml.lifeline', text: ':Payment Gateway', style: { fill: '#fef3c7', stroke: '#d97706' } },
    { id: 'db', kind: 'uml.lifeline', text: ':Orders DB', style: { fill: '#ede9fe', stroke: '#7c3aed' } },
  ],
  edges: [
    { from: 'user', to: 'web', label: 'Click “Pay now”' },
    { from: 'web', to: 'api', label: 'POST /checkout' },
    { from: 'api', to: 'db', label: 'Create order (pending)' },
    { from: 'db', to: 'api', label: 'orderId', dashed: true },
    { from: 'api', to: 'pay', label: 'Authorize amount' },
    { from: 'pay', to: 'api', label: 'Authorized', dashed: true },
    { from: 'api', to: 'db', label: 'Mark order paid' },
    { from: 'api', to: 'web', label: '201 Created', dashed: true },
    { from: 'web', to: 'user', label: 'Show confirmation', dashed: true },
  ],
};

const states: DiagramSpec = {
  type: 'generic',
  direction: 'LR',
  nodes: [
    { id: 'init', kind: 'uml.initial', text: '' },
    { id: 'draft', kind: 'rectangle', text: 'Draft', style: { fill: '#f1f5f9', stroke: '#64748b' } },
    { id: 'review', kind: 'rectangle', text: 'In review', style: { fill: '#dbeafe', stroke: '#2563eb' } },
    { id: 'changes', kind: 'rectangle', text: 'Changes requested', style: { fill: '#fef3c7', stroke: '#d97706' } },
    { id: 'approved', kind: 'rectangle', text: 'Approved', style: { fill: '#dcfce7', stroke: '#16a34a' } },
    { id: 'published', kind: 'rectangle', text: 'Published', style: { fill: '#ede9fe', stroke: '#7c3aed' } },
    { id: 'archived', kind: 'rectangle', text: 'Archived', style: { fill: '#f1f5f9', stroke: '#64748b' } },
    { id: 'final', kind: 'uml.final', text: '' },
  ],
  edges: [
    { from: 'init', to: 'draft' },
    { from: 'draft', to: 'review', label: 'submit' },
    { from: 'review', to: 'changes', label: 'request changes' },
    { from: 'changes', to: 'review', label: 'resubmit' },
    { from: 'review', to: 'approved', label: 'approve' },
    { from: 'approved', to: 'published', label: 'publish [date reached]' },
    { from: 'published', to: 'archived', label: 'archive' },
    { from: 'archived', to: 'final' },
  ],
};

function useCasePage() {
  const b = new Builder();
  b.title('Online store — use cases', 0, 0, 640, 'UML use case diagram');
  const actorStyle = { fill: '#ffffff', stroke: '#334155', fontSize: 13 };
  const sys = b.shape('container', { x: 200, y: 90, w: 420, h: 560 }, { fill: '#f8fafc', stroke: '#94a3b8', bold: true, fontSize: 14, textAlign: 'left', textColor: '#334155', radius: 14 }, 'Online Store');
  const cases = ['Browse catalog', 'Search products', 'Add to cart', 'Check out', 'Track order', 'Manage inventory', 'Process refunds'];
  const tone = [TONES.indigo, TONES.indigo, TONES.indigo, TONES.blue, TONES.indigo, TONES.teal, TONES.teal];
  const uc = cases.map((c, i) =>
    b.shape('ellipse', { x: 295, y: 150 + i * 70, w: 230, h: 52 }, soft(tone[i], { fontSize: 13 }), c, { container: sys }),
  );
  const customer = b.shape('uml.actor', { x: 70, y: 220, w: 40, h: 76 }, actorStyle, 'Customer');
  const admin = b.shape('uml.actor', { x: 70, y: 500, w: 40, h: 76 }, actorStyle, 'Store admin');
  const payment = b.shape('uml.actor', { x: 720, y: 330, w: 40, h: 76 }, actorStyle, 'Payment\nprovider');
  for (const i of [0, 1, 2, 3, 4]) b.edge(customer, uc[i], { routing: 'straight', endArrow: 'none', stroke: '#64748b' });
  for (const i of [5, 6]) b.edge(admin, uc[i], { routing: 'straight', endArrow: 'none', stroke: '#64748b' });
  b.edge(uc[3], payment, { routing: 'straight', endArrow: 'none', stroke: '#64748b' });
  b.edge(uc[6], payment, { routing: 'straight', endArrow: 'none', stroke: '#64748b' });
  return [b.page('Use cases')];
}

// ---------------------------------------------------------------------------
// C4
// ---------------------------------------------------------------------------

const c4Context: DiagramSpec = {
  type: 'c4',
  direction: 'TB',
  nodes: [
    { id: 'customer', kind: 'c4.person', text: 'Personal Banking Customer', description: 'A customer of the bank, with personal bank accounts.' },
    { id: 'ibs', kind: 'c4.system', text: 'Internet Banking System', description: 'Allows customers to view information about their accounts and make payments.' },
    { id: 'mainframe', kind: 'c4.system', text: 'Mainframe Banking System', description: 'Stores core banking information about customers, accounts and transactions.', external: true },
    { id: 'email', kind: 'c4.system', text: 'E-mail System', description: 'The internal Microsoft Exchange e-mail system.', external: true },
  ],
  edges: [
    { from: 'customer', to: 'ibs', label: 'Views account balances and makes payments using' },
    { from: 'ibs', to: 'mainframe', label: 'Gets account information from, makes payments using' },
    { from: 'ibs', to: 'email', label: 'Sends e-mail using' },
    { from: 'email', to: 'customer', label: 'Sends e-mails to' },
  ],
};

const c4Container: DiagramSpec = {
  type: 'c4',
  direction: 'TB',
  nodes: [
    { id: 'customer', kind: 'c4.person', text: 'Personal Banking Customer', description: 'A customer of the bank, with personal bank accounts.' },
    { id: 'b', kind: 'c4.boundary', text: 'Internet Banking System', technology: 'Software System' },
    { id: 'web', kind: 'c4.container', parent: 'b', text: 'Web Application', technology: 'Java, Spring MVC', description: 'Delivers the static content and the single-page app.' },
    { id: 'spa', kind: 'c4.browser', parent: 'b', text: 'Single-Page App', technology: 'TypeScript, React', description: 'Provides banking functionality via the browser.' },
    { id: 'mobile', kind: 'c4.container', parent: 'b', text: 'Mobile App', technology: 'Kotlin, Swift', description: 'Limited banking functionality on mobile devices.' },
    { id: 'api', kind: 'c4.container', parent: 'b', text: 'API Application', technology: 'Java, Spring Boot', description: 'Provides banking functionality via a JSON/HTTPS API.' },
    { id: 'db', kind: 'c4.database', parent: 'b', text: 'Database', technology: 'PostgreSQL', description: 'Stores user registration info, hashed credentials, access logs.' },
    { id: 'mainframe', kind: 'c4.system', text: 'Mainframe Banking System', description: 'Stores core banking information.', external: true },
    { id: 'email', kind: 'c4.system', text: 'E-mail System', description: 'The internal Microsoft Exchange system.', external: true },
  ],
  edges: [
    { from: 'customer', to: 'web', label: 'Visits [HTTPS]' },
    { from: 'customer', to: 'spa', label: 'Uses' },
    { from: 'customer', to: 'mobile', label: 'Uses' },
    { from: 'web', to: 'spa', label: 'Delivers' },
    { from: 'spa', to: 'api', label: 'API calls [JSON/HTTPS]' },
    { from: 'mobile', to: 'api', label: 'API calls [JSON/HTTPS]' },
    { from: 'api', to: 'db', label: 'Reads/writes [JDBC]' },
    { from: 'api', to: 'mainframe', label: 'Uses [XML/HTTPS]' },
    { from: 'api', to: 'email', label: 'Sends e-mail [SMTP]' },
  ],
};

const c4Component: DiagramSpec = {
  type: 'c4',
  direction: 'TB',
  nodes: [
    { id: 'spa', kind: 'c4.browser', text: 'Single-Page App', technology: 'TypeScript, React', description: 'Provides banking functionality via the browser.' },
    { id: 'mobile', kind: 'c4.container', text: 'Mobile App', technology: 'Kotlin, Swift', description: 'Banking on mobile devices.' },
    { id: 'b', kind: 'c4.boundary', text: 'API Application', technology: 'Container' },
    { id: 'signin', kind: 'c4.component', parent: 'b', text: 'Sign-In Controller', technology: 'Spring MVC Rest Controller', description: 'Allows users to sign in.' },
    { id: 'reset', kind: 'c4.component', parent: 'b', text: 'Reset Password Controller', technology: 'Spring MVC Rest Controller', description: 'Lets users reset their passwords.' },
    { id: 'accounts', kind: 'c4.component', parent: 'b', text: 'Accounts Summary Controller', technology: 'Spring MVC Rest Controller', description: 'Lists the customer’s accounts.' },
    { id: 'security', kind: 'c4.component', parent: 'b', text: 'Security Component', technology: 'Spring Bean', description: 'Sign in, password changes.' },
    { id: 'emailc', kind: 'c4.component', parent: 'b', text: 'E-mail Component', technology: 'Spring Bean', description: 'Sends e-mails to users.' },
    { id: 'facade', kind: 'c4.component', parent: 'b', text: 'Mainframe Facade', technology: 'Spring Bean', description: 'Facade onto the mainframe.' },
    { id: 'db', kind: 'c4.database', text: 'Database', technology: 'PostgreSQL', description: 'Credentials and access logs.' },
    { id: 'email', kind: 'c4.system', text: 'E-mail System', external: true, description: 'Microsoft Exchange.' },
    { id: 'mainframe', kind: 'c4.system', text: 'Mainframe Banking System', external: true, description: 'Core banking data.' },
  ],
  edges: [
    { from: 'spa', to: 'signin', label: 'API calls' },
    { from: 'spa', to: 'reset', label: 'API calls' },
    { from: 'mobile', to: 'accounts', label: 'API calls' },
    { from: 'signin', to: 'security', label: 'Uses' },
    { from: 'reset', to: 'security', label: 'Uses' },
    { from: 'reset', to: 'emailc', label: 'Uses' },
    { from: 'accounts', to: 'facade', label: 'Uses' },
    { from: 'security', to: 'db', label: 'Reads/writes' },
    { from: 'emailc', to: 'email', label: 'Sends e-mail' },
    { from: 'facade', to: 'mainframe', label: 'XML/HTTPS' },
  ],
};

const C4_PAGES: Array<[string, string, string, DiagramSpec]> = [
  ['System context', 'System context — Internet Banking', 'C4 level 1: people and software systems', c4Context],
  ['Containers', 'Containers — Internet Banking', 'C4 level 2: applications and data stores', c4Container],
  ['Components', 'Components — API Application', 'C4 level 3: components inside a container', c4Component],
];

export const SOFTWARE_TEMPLATES: Template[] = [
  {
    id: 'uml-class',
    name: 'UML class diagram',
    category: 'Software',
    description: 'Domain model with inheritance, an interface, composition and associations.',
    keywords: ['uml', 'class', 'domain model', 'oop', 'inheritance', 'interface'],
    build: () => specPage('Class diagram', 'Order domain model', 'UML class diagram', classes),
  },
  {
    id: 'uml-sequence',
    name: 'UML sequence diagram',
    category: 'Software',
    description: 'Checkout request flowing through web app, API, payment gateway and database.',
    keywords: ['uml', 'sequence', 'lifeline', 'messages', 'interaction', 'api'],
    build: () => specPage('Sequence', 'Checkout sequence', 'UML sequence diagram', sequence),
  },
  {
    id: 'uml-use-case',
    name: 'UML use case diagram',
    category: 'Software',
    description: 'Actors and use cases of an online store inside a system boundary.',
    keywords: ['uml', 'use case', 'actor', 'requirements', 'system boundary'],
    build: useCasePage,
  },
  {
    id: 'uml-state',
    name: 'UML state machine',
    category: 'Software',
    description: 'Lifecycle of a document: draft, review, approval, publishing and archiving.',
    keywords: ['uml', 'state', 'state machine', 'lifecycle', 'workflow', 'transitions'],
    build: () => specPage('State machine', 'Article lifecycle', 'UML state machine', states),
  },
  {
    id: 'c4-context',
    name: 'C4 system context',
    category: 'Software',
    description: 'C4 level 1: the system in scope, its users and the systems it depends on.',
    keywords: ['c4', 'context', 'architecture', 'system', 'structurizr'],
    build: () => specPage(...C4_PAGES[0]),
  },
  {
    id: 'c4-container',
    name: 'C4 container diagram',
    category: 'Software',
    description: 'C4 level 2: web, mobile, API and database containers inside a system boundary.',
    keywords: ['c4', 'container', 'architecture', 'microservices', 'structurizr'],
    build: () => specPage(...C4_PAGES[1]),
  },
  {
    id: 'c4-component',
    name: 'C4 component diagram',
    category: 'Software',
    description: 'C4 level 3: controllers and components inside the API application.',
    keywords: ['c4', 'component', 'architecture', 'spring', 'structurizr'],
    build: () => specPage(...C4_PAGES[2]),
  },
  {
    id: 'c4-model',
    name: 'C4 model (3 levels)',
    category: 'Software',
    description: 'Context, container and component diagrams on three linked pages.',
    keywords: ['c4', 'architecture', 'multi page', 'context', 'container', 'component'],
    build: () => C4_PAGES.flatMap((p) => specPage(...p)),
  },
];
