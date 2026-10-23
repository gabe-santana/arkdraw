/**
 * Active Directory: forest / tree / domain triangles, OU and site containers,
 * trust and site-link markers, plus glyph tiles for directory objects and
 * infrastructure roles (DC, GC, FSMO, DNS, AD CS, federation, sync).
 */
import type { ComponentType } from 'react';
import {
  Award, Box, Cloud, Contact, Crown, Eye, Folder, FolderTree, Globe, Handshake, IdCard, KeyRound, Link, Lock, Mail, MapPin,
  Monitor, Network, Printer, RefreshCw, ScrollText, Search, Server, Settings, Share2, Shield, User, UserCog, Users,
  type LucideProps,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { Body, RoundRect, fillOf, strokeAttrs } from '../kit';import type { LibraryItem, ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { Glyph, Ink, Line, TONE, Tint, clamp, f, fracBox, item, paper, pathOf, roundedPolyD, shape, solid } from './_kit2';
import { tileShape } from './_badgeTile';

type Icon = ComponentType<LucideProps>;
type Tone = keyof typeof TONE;

/** [name, label, glyph, badge, tone, draw.io stencil, keywords] */
const TILES: Array<[string, string, Icon, Icon | null, Tone, string, string]> = [
  ['dc', 'Domain controller', Server, KeyRound, 'blue', 'domain_controller', 'dc ntds ldap kerberos authentication server'],
  ['rodc', 'Read-only DC', Server, Eye, 'blue', 'domain_controller', 'rodc read only branch office'],
  ['gc', 'Global catalog', Server, Search, 'blue', 'global_catalog_server', 'gc global catalog forest search'],
  ['fsmo', 'FSMO role holder', Server, Crown, 'blue', 'domain_controller', 'operations master pdc emulator rid schema naming infrastructure'],
  ['dns', 'DNS server', Server, Globe, 'blue', 'dns_server', 'dns name resolution zone'],
  ['ca', 'Certificate authority', Server, Award, 'indigo', 'certificate_authority', 'ad cs pki certificates adcs'],
  ['adfs', 'Federation server', Handshake, KeyRound, 'indigo', 'federation_service', 'ad fs adfs saml sso claims'],
  ['cloudDir', 'Cloud directory', Cloud, IdCard, 'indigo', 'azure_active_directory', 'entra azure ad cloud identity'],
  ['sync', 'Sync server', Server, RefreshCw, 'indigo', 'sync_server', 'entra connect directory sync hybrid'],
  ['memberServer', 'Member server', Server, null, 'slate', 'server', 'server member domain joined'],
  ['user', 'User', User, null, 'teal', 'user', 'account person user object'],
  ['computer', 'Computer', Monitor, null, 'teal', 'computer', 'workstation pc computer object'],
  ['group', 'Group', Users, null, 'teal', 'group', 'group users membership'],
  ['secGroup', 'Security group', Users, Shield, 'teal', 'security_group', 'security group permissions acl'],
  ['distGroup', 'Distribution group', Users, Mail, 'teal', 'distribution_group', 'mail distribution list'],
  ['serviceAccount', 'Service account', UserCog, null, 'teal', 'user_service', 'service account svc'],
  ['gmsa', 'Managed service account', UserCog, KeyRound, 'teal', 'user_service', 'gmsa msa group managed service account'],
  ['contact', 'Contact', Contact, null, 'teal', 'contact', 'external contact mail address'],
  ['printer', 'Printer', Printer, null, 'slate', 'printer', 'printer print queue'],
  ['sharedFolder', 'Shared folder', Folder, Share2, 'slate', 'shared_folder', 'file share smb unc'],
  ['ouIcon', 'Organizational unit', FolderTree, null, 'amber', 'organizational_unit', 'ou organizational unit folder'],
  ['container', 'Container', Box, null, 'slate', 'container', 'cn container users computers builtin'],
  ['gpo', 'Group Policy', ScrollText, Settings, 'amber', 'group_policy', 'gpo group policy object settings'],
  ['subnet', 'Subnet', Network, null, 'green', 'subnet', 'ip subnet network range'],
];

// ---------------------------------------------------------------------------
// Custom shapes
// ---------------------------------------------------------------------------

const tri = (x: number, y: number, w: number, h: number, r: number) =>
  roundedPolyD(
    [
      [x + w / 2, y],
      [x + w, y + h],
      [x, y + h],
    ],
    r,
  );

function Domain({ w, h, style }: ShapeRenderContext) {
  const r = clamp(style.radius * 0.6, 0, Math.min(w, h) * 0.12);
  return (
    <>
      <Body d={tri(0, 0, w, h, r)} s={style} />
      <Tint d={tri(w * 0.3, h * 0.08, w * 0.4, h * 0.36, r * 0.5)} s={style} k={0.1} />
    </>
  );
}

function Forest({ w, h, style }: ShapeRenderContext) {
  const r = clamp(Math.min(w, h) * 0.04, 0, 4);
  const tw = w * 0.56;
  const th = h * 0.62;
  const left = tri(0, h * 0.12, tw, th, r);
  const right = tri(w - tw, h * 0.12, tw, th, r);
  return (
    <>
      <Body d={left} s={style} />
      <Tint d={left} s={style} k={0.14} />
      <Body d={right} s={style} />
      <Tint d={right} s={style} k={0.14} />
      <Body d={tri((w - tw) / 2, h - th, tw, th, r)} s={style} />
    </>
  );
}

function Tree({ w, h, style }: ShapeRenderContext) {
  const r = clamp(Math.min(w, h) * 0.04, 0, 4);
  const tw = w * 0.42;
  const th = h * 0.4;
  const childY = h - th;
  return (
    <>
      <Line s={style} k={0.8} d={`M${f(w / 2)},${f(th)} L${f(tw / 2)},${f(childY + th * 0.2)} M${f(w / 2)},${f(th)} L${f(w - tw / 2)},${f(childY + th * 0.2)}`} />
      <Body d={tri((w - tw) / 2, 0, tw, th, r)} s={style} />
      <Body d={tri(0, childY, tw, th, r)} s={style} />
      <Body d={tri(w - tw, childY, tw, th, r)} s={style} />
    </>
  );
}

const ouTab = (w: number, h: number) => ({ tw: Math.min(w * 0.4, 110), th: clamp(h * 0.12, 4, 16) });

function OrgUnit({ w, h, style }: ShapeRenderContext) {
  const { tw, th } = ouTab(w, h);
  const r = clamp(style.radius, 0, Math.min(w, h - th) / 3);
  const k = Math.min(th, tw * 0.25);
  const tab = pathOf([
    [0, th],
    [0, 0],
    [tw - k, 0],
    [tw, th],
  ]);
  return (
    <>
      <path d={`${tab}`} fill={fillOf(style)} {...strokeAttrs(style)} />
      <Tint d={tab} s={style} k={0.18} />
      <RoundRect y={th} w={w} h={Math.max(0, h - th)} s={style} r={r} />
      <Glyph Icon={FolderTree} cx={th * 0.5 + 6} cy={th + 13} size={Math.min(14, (h - th) * 0.5)} s={style} />
    </>
  );
}

function Site({ w, h, style }: ShapeRenderContext) {
  return (
    <>
      <RoundRect w={w} h={h} s={style} />
      <Glyph Icon={MapPin} cx={15} cy={14} size={Math.min(15, h * 0.5, w * 0.3)} s={style} />
    </>
  );
}

/** Horizontal link marker: line with arrowheads and a centre badge. */
function linkMarker(Icon: Icon, start: boolean, end: boolean) {
  return function LinkMarker({ w, h, style }: ShapeRenderContext) {
    const cy = h / 2;
    const st = solid(style);
    const a = clamp(h * 0.22, 3, 9);
    const br = clamp(Math.min(h * 0.4, w * 0.2), 2, 16);
    const head = (x: number, dir: 1 | -1) =>
      pathOf([
        [x, cy],
        [x - dir * a * 1.4, cy - a * 0.8],
        [x - dir * a * 1.4, cy + a * 0.8],
      ]);
    return (
      <>
        <Line s={style} d={`M${f(start ? a : 0)},${f(cy)} H${f(w - (end ? a : 0))}`} />
        {end && <Ink d={head(w, 1)} s={st} />}
        {start && <Ink d={head(0, -1)} s={st} />}
        <circle cx={f(w / 2)} cy={f(cy)} r={f(br)} fill={paper(style)} {...strokeAttrs(st)} />
        <Glyph Icon={Icon} cx={w / 2} cy={cy} size={br * 1.15} s={style} sw={1.5} />
      </>
    );
  };
}

const shapes: ShapeDef[] = [
  ...TILES.map(([name, label, Icon, Badge, , stencil]) =>
    tileShape(`ad.${name}`, label, `shape=mxgraph.active_directory.${stencil};`, Icon, Badge ?? undefined),
  ),
  shape('ad.domain', 'Domain', 'shape=mxgraph.active_directory.domain;whiteSpace=wrap;html=1;', Domain, {
    textBox: (w, h) => fracBox(w, h, 0.17, 0.5, 0.83, 0.96),
  }),
  shape('ad.forest', 'Forest', 'shape=mxgraph.active_directory.forest;verticalLabelPosition=bottom;verticalAlign=top;html=1;', Forest, {
    textPlacement: 'below',
    boxHit: true,
  }),
  shape('ad.tree', 'Domain tree', 'shape=mxgraph.active_directory.tree;verticalLabelPosition=bottom;verticalAlign=top;html=1;', Tree, {
    textPlacement: 'below',
    boxHit: true,
  }),
  shape('ad.ou', 'OU container', 'shape=folder;tabWidth=110;tabHeight=16;tabPosition=left;container=1;html=1;align=left;verticalAlign=top;spacingLeft=26;spacingTop=16;', OrgUnit, {
    container: true,
    rounded: true,
    textBox: (w, h) => {
      const { th } = ouTab(w, h);
      return { x: 26, y: th + 2, w: Math.max(1, w - 34), h: Math.max(1, Math.min(22, h - th - 2)) };
    },
  }),
  shape('ad.site', 'Site', 'rounded=1;dashed=1;container=1;html=1;align=left;verticalAlign=top;spacingLeft=24;', Site, {
    container: true,
    rounded: true,
    textBox: (w, h) => ({ x: 26, y: 3, w: Math.max(1, w - 34), h: Math.max(1, Math.min(22, h - 3)) }),
  }),
  shape('ad.trust', 'One-way trust', 'shape=mxgraph.active_directory.trust;verticalLabelPosition=bottom;verticalAlign=top;html=1;', linkMarker(KeyRound, false, true), {
    textPlacement: 'below',
    boxHit: true,
  }),
  shape('ad.trust2', 'Two-way trust', 'shape=mxgraph.active_directory.two_way_trust;verticalLabelPosition=bottom;verticalAlign=top;html=1;', linkMarker(KeyRound, true, true), {
    textPlacement: 'below',
    boxHit: true,
  }),
  shape('ad.siteLink', 'Site link', 'shape=mxgraph.active_directory.site_link;verticalLabelPosition=bottom;verticalAlign=top;html=1;', linkMarker(Link, false, false), {
    textPlacement: 'below',
    boxHit: true,
  }),
  shape('ad.lockedOu', 'Protected OU', 'shape=mxgraph.active_directory.organizational_unit;verticalLabelPosition=bottom;verticalAlign=top;html=1;', (ctx) => {
    const m = Math.min(ctx.w, ctx.h);
    return (
      <>
        <OrgUnit {...ctx} />
        <Glyph Icon={Lock} cx={ctx.w / 2} cy={ctx.h * 0.6} size={m * 0.36} s={ctx.style} />
      </>
    );
  }, { textPlacement: 'below', rounded: true }),
];

const tile = (tone: Tone): Partial<ElementStyle> => ({ ...TONE[tone], radius: 12, fontSize: 12 });
const kw = (k: string) => `active directory ad ds windows ${k}`;

const items: LibraryItem[] = [
  item('ad.forest', 'Forest', 64, 56, { style: { ...TONE.blue, fontSize: 12 }, text: 'corp.example', keywords: kw('forest root schema') }),
  item('ad.tree', 'Domain tree', 64, 56, { style: { ...TONE.blue, fontSize: 12 }, keywords: kw('tree parent child domains') }),
  item('ad.domain', 'Domain', 150, 104, { text: 'corp.example', style: { ...TONE.blue, fontSize: 12, radius: 6 }, keywords: kw('domain namespace dns') }),
  item('ad.ou', 'OU container', 260, 160, {
    text: 'OU=Sales',
    style: { ...TONE.amber, radius: 6, fontSize: 12, bold: true, textAlign: 'left' },
    keywords: kw('ou organizational unit container folder'),
  }),
  item('ad.site', 'Site', 320, 200, {
    text: 'Site: London',
    style: { fill: 'none', stroke: TONE.green.stroke, strokeStyle: 'dashed', radius: 12, fontSize: 12, bold: true, textAlign: 'left', textColor: '#166534' },
    keywords: kw('site location replication boundary'),
  }),
  ...TILES.map(([name, label, , , tone, , keywords]) => item(`ad.${name}`, label, 56, 56, { style: tile(tone), keywords: kw(keywords) })),
  item('ad.lockedOu', 'Protected OU', 56, 48, { style: { ...TONE.amber, radius: 4, fontSize: 12 }, keywords: kw('protected tier 0 admin ou locked') }),
  item('ad.trust', 'One-way trust', 120, 28, { style: { ...TONE.slate, fontSize: 12 }, keywords: kw('trust one way external forest trust relationship') }),
  item('ad.trust2', 'Two-way trust', 120, 28, { style: { ...TONE.slate, fontSize: 12 }, keywords: kw('trust two way transitive forest trust') }),
  item('ad.siteLink', 'Site link', 120, 28, { style: { ...TONE.green, fontSize: 12 }, keywords: kw('site link replication wan cost') }),
];

const libraries: ShapeLibrary[] = [{ id: 'ad', name: 'Active Directory', items }];

export { shapes, libraries };
