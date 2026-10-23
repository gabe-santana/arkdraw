/**
 * Office / Microsoft 365 style: generic collaboration, identity, device and
 * compliance pictograms for productivity-suite architecture diagrams. Original
 * glyph tiles (no vendor logos); documents are generic page icons with a
 * coloured band.
 */
import type { ComponentType, ReactNode } from 'react';
import {
  Archive, BookUser, Building, CalendarDays, ClipboardCheck, ClipboardList, Clock, Cloud, Cog, FileLock, FileSearch, Folder,
  Globe, Hash, IdCard, Inbox, KeyRound, LayoutDashboard, Library, ListChecks, Lock, Mail, MessagesSquare, Monitor,
  MonitorSmartphone, Laptop, PenTool, PhoneCall, Plug, RefreshCw, ScrollText, Search, Server, Shield, ShieldCheck, Smartphone,
  SquareKanban, SquarePlay, Tablet, Tag, User, UserCog, Users, Video, Waypoints, Workflow, type LucideProps,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import type { LibraryItem, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Label, TONE, f, ink, item, paper, roundRectD, shape } from './_kit2';
import { tileShape } from './_badgeTile';
import { strokeAttrs } from '../kit';

type Icon = ComponentType<LucideProps>;
type Tone = keyof typeof TONE;

/** [name, label, glyph, badge, tone, mxGraph stencil, keywords] */
const TILES: Array<[string, string, Icon, Icon | null, Tone, string, string]> = [
  // Identity & people
  ['user', 'User', User, null, 'blue', 'mxgraph.office.users.user', 'person account member employee'],
  ['users', 'Users', Users, null, 'blue', 'mxgraph.office.users.users', 'people team members accounts'],
  ['admin', 'Administrator', User, ShieldCheck, 'blue', 'mxgraph.office.users.administrator', 'admin global privileged role'],
  ['guest', 'Guest user', User, Globe, 'blue', 'mxgraph.office.users.external_user', 'external b2b partner guest'],
  ['distList', 'Distribution list', Users, Mail, 'blue', 'mxgraph.office.users.distribution_group', 'mailing list group email dl'],
  ['securityGroup', 'Security group', Users, Shield, 'blue', 'mxgraph.office.users.universal_security_group', 'permission group access'],
  ['tenant', 'Tenant', Building, null, 'indigo', 'mxgraph.office.clouds.cloud', 'organization org company directory'],
  ['directory', 'Directory (identity)', IdCard, Cloud, 'indigo', 'mxgraph.office.services.verification_service', 'entra azure ad identity idp sso'],
  ['conditionalAccess', 'Conditional access', Lock, Waypoints, 'indigo', 'mxgraph.office.security.lock_protected', 'policy zero trust access control'],
  ['mfa', 'MFA', Smartphone, KeyRound, 'indigo', 'mxgraph.office.security.token', 'multi factor 2fa authentication authenticator'],

  // Mail & calendar
  ['mailServer', 'Mail server', Server, Mail, 'blue', 'mxgraph.office.servers.exchange_server', 'exchange email smtp server'],
  ['mailbox', 'Mailbox', Inbox, null, 'blue', 'mxgraph.office.concepts.mailbox', 'email inbox exchange outlook'],
  ['sharedMailbox', 'Shared mailbox', Mail, Users, 'blue', 'mxgraph.office.concepts.mailbox_shared', 'team inbox shared email'],
  ['calendar', 'Calendar', CalendarDays, null, 'blue', 'mxgraph.office.concepts.calendar', 'schedule appointment events'],
  ['contacts', 'Contacts', BookUser, null, 'blue', 'mxgraph.office.concepts.address_book', 'address book people directory'],

  // Collaboration
  ['site', 'Team site', Globe, Users, 'teal', 'mxgraph.office.sites.team_site', 'sharepoint intranet portal site'],
  ['docLibrary', 'Document library', Library, null, 'teal', 'mxgraph.office.concepts.document_library', 'sharepoint files library'],
  ['list', 'List', ListChecks, null, 'teal', 'mxgraph.office.concepts.list_library', 'sharepoint list table items'],
  ['chat', 'Chat', MessagesSquare, null, 'violet', 'mxgraph.office.communications.im', 'teams messaging instant message conversation'],
  ['channel', 'Team channel', Hash, Users, 'violet', 'mxgraph.office.communications.im_workload', 'teams channel workspace'],
  ['meeting', 'Meeting', Video, null, 'violet', 'mxgraph.office.concepts.meeting', 'video call conference online meeting'],
  ['phone', 'Phone system', PhoneCall, null, 'violet', 'mxgraph.office.devices.phone_digital', 'voip telephony calling pbx'],
  ['drive', 'Cloud storage', Cloud, Folder, 'blue', 'mxgraph.office.clouds.cloud_storage', 'onedrive personal files sync storage'],
  ['whiteboard', 'Whiteboard', PenTool, null, 'violet', 'mxgraph.office.concepts.whiteboard', 'canvas sketch collaborate'],
  ['video', 'Video portal', SquarePlay, null, 'violet', 'mxgraph.office.concepts.video_play', 'stream video media'],
  ['flow', 'Automation flow', Workflow, null, 'indigo', 'mxgraph.office.concepts.workflow', 'power automate workflow automation'],
  ['forms', 'Forms', ClipboardList, null, 'teal', 'mxgraph.office.concepts.form', 'survey quiz questionnaire'],
  ['planner', 'Planner', SquareKanban, null, 'teal', 'mxgraph.office.concepts.tasks', 'tasks kanban board plan'],

  // Devices & endpoints
  ['desktop', 'Desktop', Monitor, null, 'slate', 'mxgraph.office.devices.workstation', 'pc computer workstation'],
  ['laptop', 'Laptop', Laptop, null, 'slate', 'mxgraph.office.devices.laptop', 'notebook computer'],
  ['tablet', 'Tablet', Tablet, null, 'slate', 'mxgraph.office.devices.tablet_ipad', 'ipad tablet device'],
  ['mobile', 'Mobile phone', Smartphone, null, 'slate', 'mxgraph.office.devices.cell_phone_generic', 'smartphone cell iphone android'],
  ['endpoint', 'Managed device', MonitorSmartphone, Cog, 'slate', 'mxgraph.office.devices.device_update_service', 'intune mdm endpoint management'],

  // Security & compliance
  ['security', 'Security center', ShieldCheck, null, 'teal', 'mxgraph.office.security.security_access_portal', 'defender protection threat'],
  ['compliance', 'Compliance', ClipboardCheck, ShieldCheck, 'teal', 'mxgraph.office.security.compliance', 'purview governance regulation'],
  ['retention', 'Retention', Archive, Clock, 'teal', 'mxgraph.office.concepts.archive', 'records archive retention policy hold'],
  ['dlp', 'Data loss prevention', FileLock, null, 'teal', 'mxgraph.office.security.secure_messaging', 'dlp sensitive data policy'],
  ['ediscovery', 'eDiscovery', FileSearch, null, 'teal', 'mxgraph.office.concepts.search', 'legal hold search investigation'],
  ['label', 'Sensitivity label', Tag, Lock, 'teal', 'mxgraph.office.security.information_rights_management', 'information protection classification aip'],
  ['audit', 'Audit log', ScrollText, Search, 'teal', 'mxgraph.office.concepts.audit_log', 'log activity audit trail'],

  // Admin & hybrid
  ['adminCenter', 'Admin center', LayoutDashboard, Cog, 'indigo', 'mxgraph.office.services.admin', 'portal console management settings'],
  ['connector', 'Connector', Plug, null, 'indigo', 'mxgraph.office.concepts.connector', 'integration api plugin'],
  ['gateway', 'Data gateway', Server, Plug, 'indigo', 'mxgraph.office.servers.network', 'on premises gateway bridge'],
  ['server', 'On-premises server', Server, null, 'slate', 'mxgraph.office.servers.server_generic', 'on prem datacenter server'],
  ['hybridSync', 'Directory sync', Server, RefreshCw, 'indigo', 'mxgraph.office.servers.directory_server', 'connect sync hybrid identity'],
  ['userAccount', 'Service account', UserCog, null, 'blue', 'mxgraph.office.users.user_services', 'app identity service principal'],
];

// ---------------------------------------------------------------------------
// Document pages: page with a folded corner and a coloured band glyph
// ---------------------------------------------------------------------------

type DocMark = 'lines' | 'grid' | 'bars' | 'pdf' | 'rings' | 'image';

function docPage(mark: DocMark) {
  return function DocPage({ w, h, style }: ShapeRenderContext) {
    const c = ink(style);
    const px = w * 0.22;
    const pw = w * 0.64;
    const py = h * 0.06;
    const ph = h * 0.88;
    const fold = Math.min(pw, ph) * 0.28;
    const page = `M${f(px)},${f(py)} H${f(px + pw - fold)} L${f(px + pw)},${f(py + fold)} V${f(py + ph)} H${f(px)} Z`;
    const pageStyle: ElementStyle = { ...style, fill: paper(style) };
    // content lines on the page (right of the band)
    const lx0 = px + pw * 0.5;
    const lx1 = px + pw - pw * 0.12;
    let lines = '';
    for (let i = 0; i < 5; i++) {
      const y = py + ph * (0.3 + i * 0.13);
      lines += `M${f(lx0)},${f(y)} H${f(lx1)} `;
    }
    const bx = w * 0.08;
    const by = h * 0.32;
    const bw = w * 0.46;
    const bh = h * 0.4;
    const m = Math.min(bw, bh);
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const sw = Math.max(0.75, m * 0.08);
    let glyph: ReactNode = null;
    if (mark === 'lines') {
      glyph = (
        <path
          d={`M${f(cx - m * 0.3)},${f(cy - m * 0.22)} H${f(cx + m * 0.3)} M${f(cx - m * 0.3)},${f(cy)} H${f(cx + m * 0.3)} M${f(cx - m * 0.3)},${f(cy + m * 0.22)} H${f(cx + m * 0.12)}`}
          stroke="#fff"
          strokeWidth={f(sw)}
          strokeLinecap="round"
        />
      );
    } else if (mark === 'grid') {
      const g = m * 0.3;
      glyph = (
        <path
          d={`${roundRectD(cx - g, cy - g, g * 2, g * 2, 1)} M${f(cx)},${f(cy - g)} V${f(cy + g)} M${f(cx - g)},${f(cy)} H${f(cx + g)}`}
          fill="none"
          stroke="#fff"
          strokeWidth={f(sw)}
        />
      );
    } else if (mark === 'bars') {
      const b = m * 0.13;
      glyph = (
        <path
          d={`M${f(cx - m * 0.26)},${f(cy + m * 0.28)} v${f(-m * 0.28)} h${f(b)} v${f(m * 0.28)} Z M${f(cx - b / 2)},${f(cy + m * 0.28)} v${f(-m * 0.5)} h${f(b)} v${f(m * 0.5)} Z M${f(cx + m * 0.26 - b)},${f(cy + m * 0.28)} v${f(-m * 0.4)} h${f(b)} v${f(m * 0.4)} Z`}
          fill="#fff"
        />
      );
    } else if (mark === 'pdf') {
      glyph = <Label x={cx} y={cy} text="PDF" s={style} size={Math.max(4, m * 0.36)} bold color="#ffffff" />;
    } else if (mark === 'rings') {
      let d = '';
      for (let i = 0; i < 3; i++) {
        const y = cy - m * 0.25 + i * m * 0.25;
        d += `M${f(cx - m * 0.28)},${f(y)} h${f(m * 0.18)} `;
      }
      glyph = (
        <>
          <path d={d} stroke="#fff" strokeWidth={f(sw)} strokeLinecap="round" />
          <rect x={f(cx - m * 0.02)} y={f(cy - m * 0.34)} width={f(m * 0.32)} height={f(m * 0.68)} rx={f(m * 0.04)} fill="none" stroke="#fff" strokeWidth={f(sw)} />
        </>
      );
    } else {
      glyph = (
        <>
          <circle cx={f(cx + m * 0.14)} cy={f(cy - m * 0.14)} r={f(m * 0.1)} fill="#fff" />
          <path d={`M${f(cx - m * 0.32)},${f(cy + m * 0.28)} L${f(cx - m * 0.08)},${f(cy - m * 0.04)} L${f(cx + m * 0.08)},${f(cy + m * 0.14)} L${f(cx + m * 0.18)},${f(cy + m * 0.04)} L${f(cx + m * 0.32)},${f(cy + m * 0.28)} Z`} fill="#fff" />
        </>
      );
    }
    return (
      <>
        <path d={page} fill={pageStyle.fill} {...strokeAttrs(pageStyle)} />
        <path d={`M${f(px + pw - fold)},${f(py)} V${f(py + fold)} H${f(px + pw)}`} fill="none" {...strokeAttrs(pageStyle)} />
        <path d={lines} stroke={c} strokeOpacity={0.35} strokeWidth={f(Math.max(0.75, h * 0.025))} strokeLinecap="round" />
        <path d={roundRectD(bx, by, bw, bh, Math.min(4, m * 0.14))} fill={c} />
        {glyph}
      </>
    );
  };
}

/** [name, label, mark, tone, keywords] */
const DOCS: Array<[string, string, DocMark, Tone, string]> = [
  ['doc', 'Document', 'lines', 'blue', 'word processing docx text file'],
  ['sheet', 'Spreadsheet', 'grid', 'green', 'excel xlsx workbook table csv'],
  ['slides', 'Presentation', 'bars', 'orange', 'powerpoint pptx deck slides'],
  ['pdf', 'PDF', 'pdf', 'red', 'pdf acrobat portable document'],
  ['notebook', 'Notebook', 'rings', 'violet', 'onenote notes notebook'],
  ['image', 'Image file', 'image', 'teal', 'picture photo png jpg'],
];

const shapes: ShapeDef[] = [
  ...TILES.map(([name, label, Icon, Badge, , stencil]) => tileShape(`office.${name}`, label, `shape=${stencil};`, Icon, Badge ?? undefined)),
  ...DOCS.map(([name, label, mark]) =>
    shape(`office.${name}`, label, 'shape=mxgraph.office.concepts.document;verticalLabelPosition=bottom;verticalAlign=top;html=1;', docPage(mark), {
      textPlacement: 'below',
      boxHit: true,
    }),
  ),
];

const tile = (tone: Tone): Partial<ElementStyle> => ({ ...TONE[tone], radius: 12, fontSize: 12 });

const items: LibraryItem[] = [
  ...TILES.map(([name, label, , , tone, , keywords]) =>
    item(`office.${name}`, label, 56, 56, { style: tile(tone), keywords: `office 365 m365 microsoft ${keywords}` }),
  ),
  ...DOCS.map(([name, label, , tone, keywords]) =>
    item(`office.${name}`, label, 48, 56, {
      style: { fill: '#ffffff', stroke: TONE[tone].stroke, strokeWidth: 1.25, fontSize: 12 },
      keywords: `office file document ${keywords}`,
    }),
  ),
];

const libraries: ShapeLibrary[] = [{ id: 'office', name: 'Office / Microsoft 365 style', items }];

export { shapes, libraries };
