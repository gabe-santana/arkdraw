/**
 * Citrix style (VDI): virtual apps & desktops infrastructure drawn as
 * original glyph tiles — dark slate for servers, teal for access tier,
 * blue-grey for data and light tiles for endpoints. No vendor logos.
 */
import {
  AppWindow, Boxes, Cloud, Computer, Database, Disc3, FolderOpen, Gauge, Globe, IdCard, KeyRound, Laptop, Layers, LayoutGrid,
  Monitor, MonitorCog, Plug, Server, Settings2, ShieldCheck, Split, Store, TabletSmartphone, User, UserCog, UsersRound, Video,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import type { ShapeDef, ShapeLibrary } from '../types';
import { item, shape } from './_kit2';
import { type Art, Boundary, THIN_CLIENT, boundaryText, glyphTile, type TileOpts } from './_infra';

const TEAL = '#14b8a6';
const SLATE = '#1e293b';

type Tier = 'server' | 'access' | 'data' | 'client';
const TIER: Record<Tier, Partial<ElementStyle>> = {
  server: { fill: SLATE, stroke: '#0f172a', textColor: '#0f172a' },
  access: { fill: '#0f766e', stroke: '#115e59', textColor: '#0f172a' },
  data: { fill: '#475569', stroke: '#334155', textColor: '#0f172a' },
  client: { fill: '#f0fdfa', stroke: '#0f766e', textColor: '#0f172a' },
};
const BADGE: Record<Tier, string> = { server: TEAL, access: SLATE, data: TEAL, client: SLATE };

/** [name, label, glyph, tier, badge, draw.io stencil, keywords] */
const TILES: Array<[string, string, Art, Tier, Art | undefined, string, string]> = [
  ['deliveryController', 'Delivery Controller', Server, 'server', Settings2, 'delivery_controller', 'ddc broker xendesktop site brokering'],
  ['storefront', 'StoreFront', Store, 'access', undefined, 'storefront_services', 'store app store portal web interface'],
  ['gateway', 'Gateway', ShieldCheck, 'access', Globe, 'netscaler_gateway', 'access gateway remote access ssl vpn netscaler adc dmz'],
  ['adc', 'ADC / Load balancer', Split, 'access', undefined, 'netscaler_vpx', 'netscaler application delivery controller load balancer'],
  ['licenseServer', 'License Server', Server, 'server', KeyRound, 'license_server', 'licensing licenses'],
  ['director', 'Director', Gauge, 'server', undefined, 'director', 'monitoring helpdesk troubleshooting'],
  ['studio', 'Studio / Console', MonitorCog, 'server', undefined, 'studio', 'management console web studio admin'],
  ['vdaServer', 'VDA server (apps)', Server, 'server', AppWindow, 'xenapp_server', 'virtual delivery agent multi-session rds hosted apps xenapp'],
  ['vdiDesktop', 'VDI desktop', Monitor, 'access', User, 'desktop', 'virtual desktop single-session vda'],
  ['publishedApp', 'Published application', AppWindow, 'access', undefined, 'xenapp_web', 'hosted app virtual app seamless'],
  ['workspaceApp', 'Workspace app', LayoutGrid, 'client', undefined, 'receiver', 'receiver client workspace app launcher'],
  ['thinClient', 'Thin client', THIN_CLIENT, 'client', undefined, 'thin_client', 'endpoint terminal zero client'],
  ['laptop', 'Laptop', Laptop, 'client', undefined, 'laptop_1', 'endpoint notebook byod'],
  ['pc', 'Desktop PC', Computer, 'client', undefined, 'desktop_web', 'endpoint workstation computer'],
  ['mobile', 'Mobile device', TabletSmartphone, 'client', undefined, 'tablet_1', 'phone tablet smartphone byod'],
  ['user', 'User', User, 'client', undefined, 'users', 'person end user'],
  ['provisioningServer', 'Provisioning Server', Server, 'server', Disc3, 'provisioning_server', 'pvs vdisk streaming image'],
  ['machineCatalog', 'Machine catalog', Layers, 'data', undefined, 'xenapp_services', 'mcs catalog machines image'],
  ['deliveryGroup', 'Delivery group', UsersRound, 'access', Monitor, 'xendesktop_server', 'assignment users desktops'],
  ['siteDatabase', 'Site database', Database, 'data', undefined, 'database_server', 'sql server site db configuration logging monitoring'],
  ['hypervisor', 'Hypervisor host', Server, 'server', Boxes, 'xenserver', 'hypervisor host vsphere hyper-v xenserver virtualization'],
  ['profileShare', 'Profile share', FolderOpen, 'data', UserCog, 'file_server', 'profile management upm fslogix file share smb'],
  ['cloudConnector', 'Cloud Connector', Cloud, 'server', Plug, 'cloud', 'connector citrix cloud daas'],
  ['fas', 'Federated Authentication', IdCard, 'server', KeyRound, 'certificate', 'fas saml sso certificate smart card'],
  ['sessionRecording', 'Session recording', Video, 'server', undefined, 'web_server', 'recording audit compliance'],
  ['wem', 'Workspace Environment Mgmt', UserCog, 'server', undefined, 'policy_server', 'wem environment management policies user settings'],
];

const tileShapes: ShapeDef[] = TILES.map(([name, label, art, tier, badge, stencil]) => {
  const opts: TileOpts = { badge, badgeColor: badge ? BADGE[tier] : undefined };
  return shape(
    `citrix.${name}`,
    label,
    `shape=mxgraph.citrix.${stencil};verticalLabelPosition=bottom;verticalAlign=top;html=1;`,
    glyphTile(art, opts),
    { rounded: true, textPlacement: 'below', boxHit: true },
  );
});

const shapes: ShapeDef[] = [
  ...tileShapes,
  shape(
    'citrix.zone',
    'Site / zone',
    'rounded=1;arcSize=4;dashed=1;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;container=1;html=1;',
    (ctx) => <Boundary {...ctx} glyph={Cloud} />,
    { rounded: true, container: true, textBox: boundaryText(true) },
  ),
];

const zone: Partial<ElementStyle> = {
  fill: '#f8fafc',
  stroke: '#0f766e',
  strokeStyle: 'dashed',
  radius: 10,
  textColor: '#134e4a',
  bold: true,
  fontSize: 12,
  textAlign: 'left',
  verticalAlign: 'middle',
};

const libraries: ShapeLibrary[] = [
  {
    id: 'citrix',
    name: 'Citrix style (VDI)',
    items: [
      ...TILES.map(([name, label, , tier, , , keywords]) =>
        item(`citrix.${name}`, label, 60, 60, {
          text: label,
          style: { ...TIER[tier], radius: 12, fontSize: 12 },
          keywords: `citrix vdi virtual apps desktops ${keywords}`,
        }),
      ),
      item('citrix.zone', 'Site / zone', 360, 220, { text: 'Site / Zone', style: zone, keywords: 'citrix site zone resource location boundary group container' }),
    ],
  },
];

export { shapes, libraries };
