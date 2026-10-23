/**
 * Salesforce style (CRM): object tiles in a Lightning-like idiom — a coloured
 * rounded square with a white pictogram and the label below — plus an object
 * data-model card and an org boundary. Generic glyphs only; no vendor logos.
 */
import type { ComponentType } from 'react';
import {
  BadgeCheck, Barcode, BookOpenText, Braces, Briefcase, Building2, CalendarClock, CalendarDays, ClipboardList, ContactRound, Crown,
  Database, FileChartColumn, Gauge, Globe, Handshake, LayoutDashboard, ListOrdered, Mail, Map as MapIcon, Megaphone, MessagesSquare,
  Package, Plug, RadioTower, Receipt, ScrollText, Shapes, ShieldCheck, Signature, SquareCheck, Store, Tags, TrendingUp, User,
  UserPlus, Users, Workflow, Wrench, Zap, BookOpen, type LucideProps,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { lineHeight, wrapText } from '@/lib/text';
import { RoundRect, fillOf, rr, strokeAttrs, topRounded } from '../kit';
import { TextLines } from '../TextLines';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Glyph, Line, Tint, f, ink, item, shape } from './_kit2';

/** Coloured tile + white glyph; falls back to ink glyph when unfilled. */
function crmTile(Icon: ComponentType<LucideProps>) {
  return function CrmTile({ w, h, style }: ShapeRenderContext) {
    const size = Math.min(w, h) * 0.58;
    return (
      <>
        <RoundRect w={w} h={h} s={style} r={Math.min(style.radius, w * 0.25, h * 0.25)} />
        <Glyph Icon={Icon} cx={w / 2} cy={h / 2} size={size} s={style} color={style.fill === 'none' ? ink(style) : '#ffffff'} sw={2} />
      </>
    );
  };
}

/** [name, label, icon, colour, keywords] */
const OBJECTS: Array<[string, string, ComponentType<LucideProps>, string, string]> = [
  ['account', 'Account', Building2, '#5867e8', 'company organization customer business'],
  ['contact', 'Contact', ContactRound, '#a094ed', 'person customer people'],
  ['lead', 'Lead', UserPlus, '#f88962', 'prospect sales marketing'],
  ['opportunity', 'Opportunity', Crown, '#fcb95b', 'deal pipeline sales'],
  ['case', 'Case', Briefcase, '#f2cf5b', 'support ticket service incident'],
  ['campaign', 'Campaign', Megaphone, '#f49756', 'marketing promotion'],
  ['product', 'Product', Package, '#b781d3', 'item sku catalog'],
  ['pricebook', 'Price book', BookOpen, '#ae8de1', 'pricing price list'],
  ['quote', 'Quote', ScrollText, '#88c651', 'proposal estimate cpq'],
  ['order', 'Order', ClipboardList, '#769ed9', 'purchase sales order'],
  ['contract', 'Contract', Signature, '#6ec06e', 'agreement signature legal'],
  ['asset', 'Asset', Barcode, '#317a92', 'installed product equipment'],
  ['task', 'Task', SquareCheck, '#4bc076', 'activity todo follow up'],
  ['event', 'Event', CalendarDays, '#eb7092', 'activity meeting calendar'],
  ['user', 'User', User, '#34becd', 'person employee login'],
  ['queue', 'Queue', ListOrdered, '#54698d', 'routing assignment group'],
  ['report', 'Report', FileChartColumn, '#2ecbbe', 'analytics chart list'],
  ['dashboard', 'Dashboard', LayoutDashboard, '#ef6e64', 'analytics kpi metrics'],
  ['customObject', 'Custom object', Shapes, '#3c97dd', 'custom entity table schema'],
  ['recordType', 'Record type', Tags, '#7f8de1', 'layout picklist type'],
  ['flow', 'Flow', Workflow, '#0b827c', 'automation process builder workflow'],
  ['approval', 'Approval process', BadgeCheck, '#50cc7a', 'approve review workflow'],
  ['apex', 'Apex class', Braces, '#6b6fd8', 'code class developer'],
  ['trigger', 'Trigger', Zap, '#f8b034', 'apex code before after insert'],
  ['platformEvent', 'Platform event', RadioTower, '#4ba5db', 'event bus streaming pubsub'],
  ['api', 'API / integration', Plug, '#2a739e', 'rest soap connector integration mulesoft'],
  ['site', 'Experience site', Globe, '#3ba755', 'community portal website'],
  ['knowledge', 'Knowledge article', BookOpenText, '#ec94ed', 'kb help article'],
  ['territory', 'Territory', MapIcon, '#5c7be0', 'region sales territory'],
  ['forecast', 'Forecast', TrendingUp, '#6b9ee2', 'sales forecast revenue'],
  ['emailTemplate', 'Email template', Mail, '#95aec5', 'email message template'],
  ['feed', 'Chatter feed', MessagesSquare, '#62b7ed', 'chatter collaboration social feed post'],
  ['package', 'Package / app', Store, '#0d9dda', 'appexchange managed package app marketplace'],
  ['partner', 'Partner', Handshake, '#7dc37d', 'partner reseller channel'],
  ['invoice', 'Invoice', Receipt, '#d4b753', 'billing payment'],
  ['workOrder', 'Work order', Wrench, '#50e3c2', 'field service maintenance'],
  ['appointment', 'Service appointment', CalendarClock, '#7e8be4', 'field service schedule visit'],
  ['entitlement', 'Entitlement', ShieldCheck, '#b75d5d', 'sla service support contract'],
  ['segment', 'Segment', Users, '#d1648f', 'audience group marketing'],
  ['dataStore', 'Data store', Database, '#1fcaa0', 'data cloud warehouse records'],
  ['metric', 'Metric', Gauge, '#e3a33a', 'kpi score measure'],
];

/** Object data-model card: first line = object name, other lines = fields. */
function ObjectCard({ w, h, style, text }: ShapeRenderContext) {
  const [name = '', ...fields] = text.split('\n');
  const lh = lineHeight(style.fontSize);
  const hh = Math.min(Math.max(34, lh + 16), h * 0.4);
  const r = rr(w, h, style.radius);
  const a = Math.min(22, hh * 0.64);
  const c = ink(style);
  const rowH = lh + 6;
  const rows = Math.max(0, Math.floor((h - hh) / rowH));
  const shown = fields.slice(0, rows);
  const body: ElementStyle = { ...style, bold: false, fontSize: Math.max(9, style.fontSize - 1) };
  const nameLines = wrapText(name, Math.max(1, w - a - 30), { ...style, bold: true }).slice(0, 1);
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <path d={topRounded(w, hh, r)} fill={c} fillOpacity={0.08} stroke="none" />
      <Line d={`M0,${f(hh)} H${f(w)}`} s={style} k={0.5} />
      <rect x={10} y={f((hh - a) / 2)} width={f(a)} height={f(a)} rx={f(a * 0.2)} fill={c} />
      <Glyph Icon={Database} cx={10 + a / 2} cy={hh / 2} size={a * 0.6} s={style} color="#ffffff" sw={2} />
      <TextLines lines={nameLines} x={a + 18} y={hh / 2 - lh / 2} anchor="start" style={style} bold />
      {shown.map((line, i) => {
        const y = hh + i * rowH;
        const [fname = '', ftype = ''] = line.split(/\s{2,}|\t|:\s*/);
        return (
          <g key={i}>
            {i > 0 && <path d={`M10,${f(y)} H${f(w - 10)}`} stroke={c} strokeOpacity={0.15} strokeWidth={1} />}
            <TextLines lines={[fname.trim()]} x={12} y={y + 3} anchor="start" style={body} />
            {ftype && (
              <g opacity={0.6}>
                <TextLines lines={[ftype.trim()]} x={w - 12} y={y + 3} anchor="end" style={body} />
              </g>
            )}
          </g>
        );
      })}
    </>
  );
}

const shapes: ShapeDef[] = [
  ...OBJECTS.map(([name, label, Icon]) =>
    shape(`crm.${name}`, label, 'rounded=1;whiteSpace=wrap;html=1;verticalLabelPosition=bottom;verticalAlign=top;fontColor=#000000;', crmTile(Icon), {
      rounded: true,
      textPlacement: 'below',
    }),
  ),
  shape('crm.objectCard', 'Object card', 'swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=34;rounded=1;html=1;', ObjectCard, {
    rounded: true,
    textPlacement: 'custom',
  }),
  shape(
    'crm.org',
    'Org',
    'swimlane;startSize=36;rounded=1;arcSize=4;html=1;align=left;spacingLeft=40;container=1;collapsible=0;dashed=1;',
    ({ w, h, style }) => {
      const hh = Math.min(36, h * 0.4);
      const r = rr(w, h, style.radius);
      const a = Math.min(22, hh * 0.64);
      return (
        <>
          <rect x={0} y={0} width={w} height={h} rx={r} fill={fillOf(style)} {...strokeAttrs(style)} />
          <Tint d={topRounded(w, hh, r)} s={style} k={0.08} />
          <rect x={10} y={f((hh - a) / 2)} width={f(a)} height={f(a)} rx={f(a * 0.2)} fill={ink(style)} />
          <Glyph Icon={Building2} cx={10 + a / 2} cy={hh / 2} size={a * 0.62} s={style} color="#ffffff" />
        </>
      );
    },
    { rounded: true, container: true, textBox: (w, h) => ({ x: 18 + Math.min(22, Math.min(36, h * 0.4) * 0.64), y: 2, w: Math.max(1, w - 50), h: Math.max(1, Math.min(36, h * 0.4) - 4) }) },
  ),
];

const libraries: ShapeLibrary[] = [
  {
    id: 'crm',
    name: 'Salesforce style (CRM)',
    items: [
      ...OBJECTS.map(([name, label, , color, keywords]) =>
        item(`crm.${name}`, label, 48, 48, {
          text: label,
          style: { fill: color, stroke: 'none', radius: 8, fontSize: 12, textColor: '#1e293b' },
          keywords: `salesforce crm object ${keywords}`,
        }),
      ),
      item('crm.objectCard', 'Object card', 220, 150, {
        text: 'Account\nName  Text(255)\nIndustry  Picklist\nAnnualRevenue  Currency\nOwnerId  Lookup(User)',
        style: { fill: '#ffffff', stroke: '#5867e8', strokeWidth: 1, radius: 6, fontSize: 13, textColor: '#1e293b' },
        keywords: 'salesforce crm object schema data model entity fields erd sobject',
      }),
      item('crm.org', 'Org', 380, 260, {
        text: 'Production org',
        style: { fill: '#f8fafc', stroke: '#0d9dda', strokeStyle: 'dashed', strokeWidth: 1.5, radius: 10, fontSize: 13, bold: true, textColor: '#0f172a', textAlign: 'left' },
        keywords: 'salesforce org instance tenant environment sandbox boundary container',
      }),
    ],
  },
];

export { shapes, libraries };
