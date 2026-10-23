import type { ElementStyle, ShapeElement } from '@/model/types';
import { Builder, INK, MUTED, TONES, grid, presetStyle } from '../kit';
import type { Template } from '../types';

const P = (kind: string, label?: string, extra: Partial<ElementStyle> = {}) => ({ ...presetStyle(kind, label), ...extra });

// ---------------------------------------------------------------------------
// Web
// ---------------------------------------------------------------------------

function landingPage() {
  const b = new Builder();
  const W = 1120;
  const br = b.shape('mock.browser', { x: 0, y: 0, w: W, h: 860 }, P('mock.browser'), 'https://acme.design');
  const c = { container: br };
  const pad = 48;
  b.shape('mock.navbar', { x: 24, y: 50, w: W - 48, h: 56 }, P('mock.navbar', undefined, { fontSize: 16 }), 'Acme', c);
  // Hero
  b.text('Design faster.\nShip with confidence.', { x: pad, y: 150, w: 520, h: 120 }, { fontSize: 40, bold: true, textAlign: 'left', verticalAlign: 'top' }, c);
  b.text('Acme turns rough ideas into production-ready interfaces in minutes — with your team, in real time.', { x: pad, y: 282, w: 470, h: 52 }, { fontSize: 16, textColor: MUTED, textAlign: 'left', verticalAlign: 'top' }, c);
  b.shape('mock.button', { x: pad, y: 356, w: 160, h: 46 }, P('mock.button', 'Button', { fontSize: 15 }), 'Start for free', c);
  b.shape('mock.button', { x: pad + 176, y: 356, w: 150, h: 46 }, P('mock.button', 'Secondary button', { fontSize: 15 }), 'Book a demo', c);
  b.shape('mock.image', { x: 600, y: 140, w: W - 600 - pad, h: 280 }, P('mock.image', undefined, { radius: 16, fill: '#e0e7ff', stroke: '#c7d2fe' }), '', c);
  // Logos strip
  b.text('Trusted by teams at', { x: pad, y: 446, w: W - pad * 2, h: 22 }, { fontSize: 12, textColor: MUTED, bold: true }, c);
  grid(5, 5, { w: 150, h: 26 }, { x: (W - pad * 2 - 750) / 4, y: 0 }, { x: pad, y: 476 }).forEach((r, i) =>
    b.text(['Northwind', 'Globex', 'Initech', 'Umbrella', 'Hooli'][i], r, { fontSize: 17, bold: true, textColor: '#94a3b8' }, c),
  );
  // Features
  const cw = (W - pad * 2 - 2 * 24) / 3;
  const feats = ['Real-time collaboration', 'Design systems', 'Developer handoff'];
  grid(3, 3, { w: cw, h: 240 }, { x: 24, y: 0 }, { x: pad, y: 530 }).forEach((r, i) => b.shape('mock.card', r, P('mock.card', undefined, { fontSize: 15 }), feats[i], c));
  // Footer
  b.shape('rectangle', { x: 0, y: 800, w: W, h: 60 }, { fill: '#f8fafc', stroke: '#e2e8f0', radius: 0, fontSize: 12, textColor: MUTED }, '© 2026 Acme Inc. · Privacy · Terms · Contact', c);
  return [b.page('Landing page')];
}

function dashboardPage() {
  const b = new Builder();
  const W = 1180;
  const H = 780;
  const br = b.shape('mock.browser', { x: 0, y: 0, w: W, h: H }, P('mock.browser'), 'https://app.acme.io/dashboard');
  const c = { container: br };
  b.shape('lane.list', { x: 16, y: 50, w: 200, h: H - 66 }, { fill: '#f8fafc', stroke: '#e2e8f0', radius: 10, fontSize: 14, textColor: '#334155' }, 'Acme Admin\nOverview\nOrders\nCustomers\nProducts\nReports\nSettings', c);
  const x0 = 240;
  b.text('Overview', { x: x0, y: 54, w: 300, h: 36 }, { fontSize: 24, bold: true, textAlign: 'left' }, c);
  b.shape('mock.search', { x: W - 16 - 260 - 56, y: 56, w: 240, h: 36 }, P('mock.search'), 'Search…', c);
  b.shape('mock.avatar', { x: W - 16 - 44, y: 52, w: 44, h: 44 }, P('mock.avatar'), '', c);
  const stats = [
    ['$48.2k\nRevenue · +12%', TONES.indigo],
    ['1,284\nOrders · +4%', TONES.teal],
    ['312\nNew customers', TONES.amber],
    ['2.4%\nRefund rate', TONES.rose],
  ] as const;
  const sw = (W - x0 - 16 - 3 * 16) / 4;
  grid(4, 4, { w: sw, h: 100 }, { x: 16, y: 0 }, { x: x0, y: 110 }).forEach((r, i) =>
    b.shape('info.stat', r, P('info.stat', undefined, { stroke: stats[i][1].stroke, fontSize: 13 }), stats[i][0], c),
  );
  // Bar chart card
  const cardW = (W - x0 - 16 - 16) * 0.58;
  const chart = b.shape('lane.card', { x: x0, y: 230, w: cardW, h: 270 }, { fill: '#ffffff', stroke: '#4f46e5', radius: 10, bold: true, fontSize: 14, textAlign: 'left', textColor: INK }, 'Revenue by month', c);
  const vals = [42, 55, 48, 66, 72, 61, 80, 92, 85, 98];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const bw = (cardW - 48) / vals.length;
  vals.forEach((v, i) => {
    const h = v * 1.6;
    b.shape('rectangle', { x: x0 + 24 + i * bw + 6, y: 230 + 230 - h, w: bw - 12, h }, { fill: i === vals.length - 1 ? '#4f46e5' : '#c7d2fe', stroke: 'none', radius: 3 }, '', { container: chart });
    b.text(months[i], { x: x0 + 24 + i * bw, y: 230 + 236, w: bw, h: 20 }, { fontSize: 11, textColor: MUTED }, { container: chart });
  });
  // Activity card
  const ax = x0 + cardW + 16;
  const aw = W - 16 - ax;
  const act = b.shape('lane.card', { x: ax, y: 230, w: aw, h: 270 }, { fill: '#ffffff', stroke: '#0d9488', radius: 10, bold: true, fontSize: 14, textAlign: 'left', textColor: INK }, 'Recent activity', c);
  ['Order #1042 shipped', 'New customer: Globex', 'Refund issued #1031', 'Stock low: Widget Pro'].forEach((t, i) => {
    b.shape('mock.avatar', { x: ax + 16, y: 286 + i * 52, w: 32, h: 32 }, P('mock.avatar'), '', { container: act });
    b.text(t, { x: ax + 58, y: 286 + i * 52, w: aw - 74, h: 32 }, { fontSize: 13, textAlign: 'left' }, { container: act });
  });
  b.shape('mock.table', { x: x0, y: 520, w: W - x0 - 16, h: H - 520 - 16 }, P('mock.table'), 'Latest orders', c);
  return [b.page('Dashboard')];
}

// ---------------------------------------------------------------------------
// Mobile
// ---------------------------------------------------------------------------

const PHONE = { w: 360, h: 740 };

function iosApp() {
  const b = new Builder();
  b.title('Mobile app — iOS', 0, 0, 900, 'Sign-in and home screens');
  const y0 = 90;
  const bz = 16; // bezel
  // Screen 1: sign in
  const p1 = b.shape('ios.iphone', { x: 0, y: y0, ...PHONE }, P('ios.iphone'), '');
  const c1 = { container: p1 };
  const sx = bz + 24;
  const sw = PHONE.w - 2 * (bz + 24);
  b.shape('ios.statusBar', { x: bz + 6, y: y0 + bz + 8, w: PHONE.w - 2 * bz - 12, h: 34 }, P('ios.statusBar'), '', c1);
  b.shape('info.iconLaunch', { x: PHONE.w / 2 - 36, y: y0 + 120, w: 72, h: 72 }, P('info.iconLaunch'), '', c1);
  b.text('Welcome back', { x: sx, y: y0 + 214, w: sw, h: 40 }, { fontSize: 26, bold: true }, c1);
  b.text('Sign in to continue', { x: sx, y: y0 + 254, w: sw, h: 24 }, { fontSize: 15, textColor: MUTED }, c1);
  b.shape('mock.input', { x: sx, y: y0 + 310, w: sw, h: 46 }, P('mock.input', undefined, { radius: 12, fontSize: 15 }), 'Email', c1);
  b.shape('mock.input', { x: sx, y: y0 + 368, w: sw, h: 46 }, P('mock.input', undefined, { radius: 12, fontSize: 15 }), 'Password', c1);
  b.text('Forgot password?', { x: sx, y: y0 + 422, w: sw, h: 22 }, { fontSize: 13, textColor: '#007aff', textAlign: 'right' }, c1);
  const signIn = b.shape('mock.button', { x: sx, y: y0 + 466, w: sw, h: 50 }, P('mock.button', 'Action button'), 'Sign in', c1);
  b.text('New here? Create an account', { x: sx, y: y0 + 640, w: sw, h: 22 }, { fontSize: 13, textColor: MUTED }, c1);
  // Screen 2: home
  const x2 = 520;
  const p2 = b.shape('ios.iphone', { x: x2, y: y0, ...PHONE }, P('ios.iphone'), '');
  const c2 = { container: p2 };
  const ix = x2 + bz;
  const iw = PHONE.w - 2 * bz;
  b.shape('ios.statusBar', { x: ix + 6, y: y0 + bz + 8, w: iw - 12, h: 34 }, P('ios.statusBar'), '', c2);
  b.shape('ios.navBar', { x: ix, y: y0 + 70, w: iw, h: 44 }, P('ios.navBar', undefined, { fill: '#ffffff' }), 'Discover', c2);
  b.shape('ios.searchBar', { x: ix + 16, y: y0 + 124, w: iw - 32, h: 36 }, P('ios.searchBar'), 'Search places', c2);
  b.shape('ios.segmented', { x: ix + 16, y: y0 + 172, w: iw - 32, h: 32 }, P('ios.segmented'), 'Nearby|Popular|Saved', c2);
  b.shape('mock.image', { x: ix + 16, y: y0 + 218, w: iw - 32, h: 150 }, P('mock.image', undefined, { radius: 14, fill: '#dbeafe', stroke: '#bfdbfe' }), '', c2);
  b.shape('ios.listGroup', { x: ix + 16, y: y0 + 384, w: iw - 32, h: 176 }, P('ios.listGroup'), 'Coffee Lab\nCity Museum\nRiverside Park\nNight Market', c2);
  b.shape('ios.tabBar', { x: ix + 14, y: y0 + 616, w: iw - 28, h: 56 }, P('ios.tabBar'), '', c2);
  b.edge(signIn, p2, { text: 'on success', dashed: true, stroke: '#007aff', fromSide: 'right', toSide: 'left', labelT: 0.62 });
  return [b.page('iOS screens')];
}

function androidApp() {
  const b = new Builder();
  b.title('Mobile app — Android', 0, 0, 900, 'Material 3 list and detail screens');
  const y0 = 90;
  const bz = 15;
  const iw = PHONE.w - 2 * bz;
  const screen = (x: number, title: string, fill: (c: { container: ShapeElement }, ix: number) => void) => {
    const p = b.shape('android.phone', { x, y: y0, ...PHONE }, P('android.phone'), '');
    const c = { container: p };
    b.shape('android.statusBar', { x: x + bz, y: y0 + bz + 4, w: iw, h: 26 }, P('android.statusBar', undefined, { fill: '#ffffff' }), '', c);
    b.shape('android.appBar', { x: x + bz, y: y0 + bz + 32, w: iw, h: 56 }, P('android.appBar', undefined, { fill: '#ffffff' }), title, c);
    fill(c, x + bz);
    return p;
  };
  const list = screen(0, 'Inbox', (c, ix) => {
    const items = [
      ['Design review', 'New mockups are ready to check'],
      ['Trip to Lisbon', 'Your boarding pass is attached'],
    ];
    items.forEach(([t, s], i) => {
      const y = y0 + 122 + i * 222;
      b.shape('android.card', { x: ix + 14, y, w: iw - 28, h: 208 }, P('android.card', undefined, { fontSize: 15, shadow: false, stroke: '#e2e8f0' }), `${t}\n${s}`, c);
    });
    b.shape('android.fab', { x: ix + iw - 76, y: y0 + 566, w: 56, h: 56 }, P('android.fab'), '', c);
    b.shape('android.bottomNav', { x: ix, y: y0 + 632, w: iw, h: 72 }, P('android.bottomNav'), '', c);
  });
  const detail = screen(500, 'New message', (c, ix) => {
    b.shape('android.textField', { x: ix + 16, y: y0 + 130, w: iw - 32, h: 56 }, P('android.textField'), 'To\nteam@acme.io', c);
    b.shape('android.textField', { x: ix + 16, y: y0 + 200, w: iw - 32, h: 56 }, P('android.textField'), 'Subject\nWeekly sync', c);
    b.shape('mock.textarea', { x: ix + 16, y: y0 + 272, w: iw - 32, h: 180 }, P('mock.textarea', undefined, { radius: 4, stroke: '#64748b' }), 'Write your message…', c);
    b.shape('mock.button', { x: ix + iw - 16 - 120, y: y0 + 470, w: 120, h: 40 }, P('mock.button', 'Filled button'), 'Send', c);
    b.shape('mock.button', { x: ix + iw - 16 - 120 - 12 - 110, y: y0 + 470, w: 110, h: 40 }, P('mock.button', 'Outlined button'), 'Discard', c);
    b.shape('android.snackbar', { x: ix + 16, y: y0 + 640, w: iw - 32, h: 48 }, P('android.snackbar'), 'Draft saved', c);
  });
  b.edge(list, detail, { text: 'tap  +', dashed: true, stroke: '#2563eb' });
  return [b.page('Android screens')];
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

type Node = [kind: string, text: string, children?: Node[]];

function sitemapPage() {
  const b = new Builder();
  const add = (n: Node, parent?: ShapeElement) => {
    const [kind, text, kids = []] = n;
    const el = b.shape(kind, { x: 0, y: 0, w: 112, h: 98 }, P(kind), text);
    if (parent) b.edge(parent, el, { endArrow: 'none', stroke: '#94a3b8' });
    kids.forEach((k) => add(k, el));
  };
  add([
    'sitemap.home',
    'Home',
    [
      ['sitemap.folder', 'Products', [['sitemap.page', 'Features'], ['sitemap.page', 'Pricing'], ['sitemap.gallery', 'Showcase']]],
      ['sitemap.folder', 'Resources', [['sitemap.blog', 'Blog'], ['sitemap.document', 'Docs'], ['sitemap.video', 'Tutorials']]],
      ['sitemap.folder', 'Company', [['sitemap.page', 'About'], ['sitemap.contact', 'Contact']]],
      ['sitemap.login', 'Sign in', [['sitemap.dashboard', 'Dashboard'], ['sitemap.profile', 'Profile'], ['sitemap.settings', 'Settings']]],
      ['sitemap.cart', 'Checkout'],
    ],
  ]);
  b.layout('tree-vertical', { nodeSpacing: 22, levelSpacing: 60, origin: { x: 0, y: 90 } });
  b.title('Website sitemap', 0, 0, 600, 'Information architecture');
  return [b.page('Sitemap')];
}

export const WIREFRAME_TEMPLATES: Template[] = [
  {
    id: 'wireframe-landing',
    name: 'Landing page wireframe',
    category: 'Wireframes',
    description: 'Marketing website with navigation, hero, logo strip, feature cards and footer.',
    keywords: ['wireframe', 'mockup', 'website', 'landing page', 'web', 'ui', 'hero'],
    build: landingPage,
  },
  {
    id: 'wireframe-dashboard',
    name: 'Admin dashboard',
    category: 'Wireframes',
    description: 'Web app with sidebar, KPI cards, bar chart, activity feed and a data table.',
    keywords: ['wireframe', 'dashboard', 'admin', 'web app', 'analytics', 'ui', 'saas'],
    build: dashboardPage,
  },
  {
    id: 'wireframe-ios',
    name: 'iOS app screens',
    category: 'Wireframes',
    description: 'Two iPhone screens — sign in and home — linked by a navigation arrow.',
    keywords: ['wireframe', 'ios', 'iphone', 'mobile', 'app', 'mockup', 'login'],
    build: iosApp,
  },
  {
    id: 'wireframe-android',
    name: 'Android app screens',
    category: 'Wireframes',
    description: 'Material-style inbox list and compose screens on Android phones.',
    keywords: ['wireframe', 'android', 'material', 'mobile', 'app', 'mockup'],
    build: androidApp,
  },
  {
    id: 'sitemap',
    name: 'Website sitemap',
    category: 'Wireframes',
    description: 'Page hierarchy of a website using sitemap page icons.',
    keywords: ['sitemap', 'information architecture', 'website', 'pages', 'navigation', 'ia'],
    build: sitemapPage,
  },
];
