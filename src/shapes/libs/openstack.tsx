/**
 * OpenStack: one labelled tile per service ("Nova" / "Compute") with an
 * original glyph, colour-coded by area, plus deployment nodes, a project
 * boundary, network bars and small resource icons. No OpenStack logo.
 */
import {
  Activity, AppWindow, BellRing, Blocks, Box, Boxes, ChartLine, Container, Cpu, Database, DatabaseZap, Disc3, EthernetPort, Flame,
  FolderKanban, FolderOpen, Globe, Gpu, HardDrive, HeartPulse, Key, KeyRound, LayoutDashboard, LayoutGrid, Mails, MapPin, Monitor,
  Network, Package, Router, Server, ServerCog, ShieldCheck, Split, Store, Vault, Workflow,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import { RoundRect, topRounded } from '../kit';
import type { ShapeDef, ShapeLibrary, ShapeRenderContext } from '../types';
import { TONE, f, ink, item, shape } from './_kit2';
import { type Art, ArtGlyph, Boundary, NameCaption, boundaryText, glyphTile } from './_infra';

type Area = 'compute' | 'network' | 'storage' | 'security' | 'orchestration' | 'ui' | 'telemetry' | 'data' | 'containers' | 'messaging';
const AREA: Record<Area, { fill: string; stroke: string }> = {
  compute: TONE.red,
  network: TONE.blue,
  storage: TONE.amber,
  security: TONE.violet,
  orchestration: TONE.green,
  ui: TONE.slate,
  telemetry: TONE.teal,
  data: TONE.indigo,
  containers: TONE.fuchsia,
  messaging: TONE.pink,
};

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

/** Service tile: accent bar, glyph on top, bold service name + function caption below. */
function serviceTile(art: Art) {
  return function ServiceTile({ w, h, style, text }: ShapeRenderContext) {
    const r = Math.min(style.radius, w * 0.2, h * 0.2);
    const bar = Math.min(5, h * 0.06);
    const hasText = text.trim().length > 0;
    const gy = hasText ? h * 0.3 : h / 2;
    const size = hasText ? Math.min(w * 0.4, h * 0.34) : Math.min(w, h) * 0.56;
    const top = hasText ? h * 0.52 : h;
    return (
      <>
        <RoundRect w={w} h={h} s={style} r={r} />
        {bar > 0.5 && <path d={topRounded(w, bar, Math.min(r, bar))} fill={ink(style)} stroke="none" />}
        <ArtGlyph art={art} cx={w / 2} cy={gy + bar / 2} size={size} color={ink(style)} />
        {hasText && <NameCaption box={{ x: 6, y: top, w: Math.max(1, w - 12), h: Math.max(1, h - top - 6) }} text={text} style={{ ...style, verticalAlign: 'top' }} />}
      </>
    );
  };
}

/** Deployment node: server glyph block on the left, name + role on the right. */
function nodeTile(art: Art) {
  return function NodeTile({ w, h, style, text }: ShapeRenderContext) {
    const side = Math.min(h, w * 0.4);
    const r = Math.min(style.radius, w / 2, h / 2);
    const g = side * 0.5;
    return (
      <>
        <RoundRect w={w} h={h} s={style} r={r} />
        <path
          d={`M${f(Math.min(r, side / 2))},0 H${f(side)} V${f(h)} H${f(Math.min(r, side / 2))} Q0,${f(h)} 0,${f(h - Math.min(r, side / 2))} V${f(Math.min(r, side / 2))} Q0,0 ${f(Math.min(r, side / 2))},0 Z`}
          fill={ink(style)}
          stroke="none"
        />
        <ArtGlyph art={art} cx={side / 2} cy={h / 2} size={g} color="#ffffff" />
        <NameCaption box={{ x: side + 10, y: 4, w: Math.max(1, w - side - 16), h: Math.max(1, h - 8) }} text={text} style={style} align="start" />
      </>
    );
  };
}

/** Network bar: a long rounded band (provider/tenant network or subnet). */
function NetworkBar({ w, h, style }: ShapeRenderContext) {
  const r = Math.min(h / 2, w / 2);
  const dots = Math.max(0, Math.min(8, Math.floor((w - 140) / 60)));
  const step = dots ? (w - 2 * r) / (dots + 1) : 0;
  return (
    <>
      <RoundRect w={w} h={h} s={style} r={r} />
      {Array.from({ length: dots }, (_, i) => (
        <circle key={i} cx={f(r + step * (i + 1))} cy={f(h)} r={f(Math.min(3, h * 0.15))} fill={ink(style)} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** [project, function, glyph, area, keywords] */
const SERVICES: Array<[string, string, Art, Area, string]> = [
  ['Nova', 'Compute', Cpu, 'compute', 'instances virtual machines hypervisor scheduler'],
  ['Neutron', 'Networking', Network, 'network', 'sdn networks subnets routers ports ovs ovn'],
  ['Swift', 'Object Storage', Boxes, 'storage', 'objects containers s3 blobs'],
  ['Cinder', 'Block Storage', HardDrive, 'storage', 'volumes disks lvm ceph'],
  ['Keystone', 'Identity', KeyRound, 'security', 'authentication auth tokens users projects domains'],
  ['Glance', 'Image service', Disc3, 'compute', 'images vm templates qcow2'],
  ['Heat', 'Orchestration', Flame, 'orchestration', 'templates stacks hot iac'],
  ['Horizon', 'Dashboard', LayoutDashboard, 'ui', 'web ui portal console'],
  ['Skyline', 'Modern dashboard', AppWindow, 'ui', 'web ui portal console'],
  ['Ceilometer', 'Telemetry', Activity, 'telemetry', 'metering metrics data collection'],
  ['Aodh', 'Alarming', BellRing, 'telemetry', 'alarms alerts thresholds'],
  ['Gnocchi', 'Time-series metrics', ChartLine, 'telemetry', 'metrics database time series'],
  ['Barbican', 'Key manager', Vault, 'security', 'secrets keys certificates kms'],
  ['Designate', 'DNS', Globe, 'network', 'dns zones records'],
  ['Octavia', 'Load balancer', Split, 'network', 'lbaas load balancing amphora'],
  ['Ironic', 'Bare metal', Server, 'compute', 'bare metal provisioning physical servers'],
  ['Magnum', 'Container orchestration', Container, 'containers', 'kubernetes k8s coe clusters'],
  ['Zun', 'Containers', Box, 'containers', 'containers service'],
  ['Manila', 'Shared file systems', FolderOpen, 'storage', 'nfs cifs shares file storage'],
  ['Trove', 'Database', Database, 'data', 'dbaas mysql postgresql'],
  ['Sahara', 'Data processing', DatabaseZap, 'data', 'hadoop spark big data'],
  ['Zaqar', 'Messaging', Mails, 'messaging', 'queues messages notifications'],
  ['Mistral', 'Workflow', Workflow, 'orchestration', 'workflow tasks automation'],
  ['Murano', 'Application catalog', Store, 'orchestration', 'app catalog marketplace'],
  ['Senlin', 'Clustering', Blocks, 'orchestration', 'clusters autoscaling'],
  ['Placement', 'Placement', LayoutGrid, 'compute', 'resource providers inventory scheduling'],
  ['Cyborg', 'Accelerators', Gpu, 'compute', 'gpu fpga accelerator'],
  ['Masakari', 'Instance HA', HeartPulse, 'compute', 'high availability recovery'],
];

/** [kind suffix, label, glyph, area, default text, keywords] */
const NODES: Array<[string, string, Art, Area, string, string]> = [
  ['controllerNode', 'Controller node', ServerCog, 'ui', 'Controller node\nKeystone · Glance · Nova API · Neutron server', 'control plane api'],
  ['computeNode', 'Compute node', Cpu, 'compute', 'Compute node\nnova-compute · hypervisor', 'hypervisor kvm'],
  ['networkNode', 'Network node', Router, 'network', 'Network node\nL3 agent · DHCP · metadata', 'l3 agent dhcp'],
  ['storageNode', 'Storage node', HardDrive, 'storage', 'Storage node\ncinder-volume · swift', 'block object storage'],
];

/** [kind suffix, label, glyph, area, keywords] */
const RESOURCES: Array<[string, string, Art, Area, string]> = [
  ['instance', 'Instance', Monitor, 'compute', 'vm server virtual machine'],
  ['image', 'Image', Disc3, 'compute', 'glance image snapshot'],
  ['volume', 'Volume', HardDrive, 'storage', 'cinder disk block'],
  ['objectContainer', 'Object container', Package, 'storage', 'swift bucket objects'],
  ['router', 'Router', Router, 'network', 'neutron l3 gateway'],
  ['floatingIp', 'Floating IP', MapPin, 'network', 'public ip address nat'],
  ['port', 'Port', EthernetPort, 'network', 'neutron port vif interface'],
  ['securityGroup', 'Security group', ShieldCheck, 'security', 'firewall rules ingress egress'],
  ['keypair', 'Key pair', Key, 'security', 'ssh key'],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

// ---------------------------------------------------------------------------
// Shapes & library
// ---------------------------------------------------------------------------

const shapes: ShapeDef[] = [
  ...SERVICES.map(([name, fn, art]) =>
    shape(`openstack.${slug(name)}`, `${name} (${fn})`, `shape=mxgraph.openstack.${slug(name)};rounded=1;whiteSpace=wrap;html=1;`, serviceTile(art), {
      rounded: true,
      textPlacement: 'custom',
    }),
  ),
  ...NODES.map(([name, label, art]) =>
    shape(`openstack.${name}`, label, `shape=mxgraph.openstack.${name};rounded=1;whiteSpace=wrap;html=1;`, nodeTile(art), {
      rounded: true,
      textPlacement: 'custom',
    }),
  ),
  ...RESOURCES.map(([name, label, art]) =>
    shape(
      `openstack.${name}`,
      label,
      `shape=mxgraph.openstack.${name};ellipse;verticalLabelPosition=bottom;verticalAlign=top;html=1;`,
      glyphTile(art, { round: true, scale: 0.52 }),
      { textPlacement: 'below', perimeter: 'ellipse', boxHit: true },
    ),
  ),
  shape('openstack.network', 'Network bar', 'rounded=1;arcSize=50;whiteSpace=wrap;html=1;shape=mxgraph.openstack.network;', NetworkBar, {
    textBox: (w, h) => ({ x: Math.min(h, w / 2), y: 0, w: Math.max(1, w - Math.min(h, w / 2) * 2), h }),
  }),
  shape(
    'openstack.project',
    'Project / tenant',
    'rounded=1;arcSize=4;dashed=1;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;container=1;html=1;',
    (ctx) => <Boundary {...ctx} glyph={FolderKanban} />,
    { rounded: true, container: true, textBox: boundaryText(true) },
  ),
];

const tone = (a: Area, extra: Partial<ElementStyle> = {}): Partial<ElementStyle> => ({ ...AREA[a], textColor: '#0f172a', ...extra });

const libraries: ShapeLibrary[] = [
  {
    id: 'openstack',
    name: 'OpenStack',
    items: [
      ...SERVICES.map(([name, fn, , area, keywords]) =>
        item(`openstack.${slug(name)}`, `${name} (${fn})`, 120, 104, {
          text: `${name}\n${fn}`,
          style: tone(area, { radius: 10, fontSize: 13, strokeWidth: 1.5 }),
          keywords: `openstack ${name.toLowerCase()} ${fn.toLowerCase()} ${area} ${keywords}`,
        }),
      ),
      ...NODES.map(([name, label, , area, text, keywords]) =>
        item(`openstack.${name}`, label, 220, 64, {
          text,
          style: tone(area, { radius: 8, fontSize: 12, strokeWidth: 1.5 }),
          keywords: `openstack node host server deployment ${keywords}`,
        }),
      ),
      ...RESOURCES.map(([name, label, , area, keywords]) =>
        item(`openstack.${name}`, label, 48, 48, {
          text: label,
          style: tone(area, { fontSize: 12 }),
          keywords: `openstack resource ${keywords}`,
        }),
      ),
      item('openstack.network', 'Network', 420, 26, {
        text: 'private-net  10.0.0.0/24',
        style: { fill: AREA.network.stroke, stroke: AREA.network.stroke, textColor: '#ffffff', bold: true, fontSize: 12 },
        keywords: 'openstack neutron network subnet tenant private provider vlan vxlan',
      }),
      item('openstack.network', 'External network', 420, 26, {
        text: 'public  203.0.113.0/24',
        style: { fill: TONE.slate.stroke, stroke: TONE.slate.stroke, textColor: '#ffffff', bold: true, fontSize: 12 },
        keywords: 'openstack neutron external provider public network floating ip',
      }),
      item('openstack.project', 'Project / tenant', 380, 240, {
        text: 'Project: demo',
        style: {
          fill: '#f8fafc', stroke: '#64748b', strokeStyle: 'dashed', radius: 10, textColor: '#334155', bold: true, fontSize: 12,
          textAlign: 'left', verticalAlign: 'middle',
        },
        keywords: 'openstack project tenant domain boundary group container',
      }),
    ],
  },
];

export { shapes, libraries };
