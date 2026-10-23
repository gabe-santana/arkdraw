import type { DiagramSpec } from '@/ai/generate/spec';
import { Builder, INK, MUTED, specPage } from '../kit';
import type { Template } from '../types';

const office: DiagramSpec = {
  type: 'network',
  direction: 'TB',
  nodes: [
    { id: 'inet', kind: 'net.internet', text: 'Internet' },
    { id: 'fw', kind: 'net.firewall', text: 'Firewall' },
    { id: 'rtr', kind: 'net.router', text: 'Edge router' },
    { id: 'core', kind: 'net.switch', text: 'Core switch' },
    { id: 'srv', kind: 'container', text: 'Server room' },
    { id: 'file', kind: 'net.storage', text: 'File server', parent: 'srv' },
    { id: 'app', kind: 'net.server', text: 'App server', parent: 'srv' },
    { id: 'db', kind: 'net.database', text: 'Database', parent: 'srv' },
    { id: 'f1', kind: 'container', text: 'Floor 1 — Sales' },
    { id: 'sw1', kind: 'net.switch', text: 'Access switch', parent: 'f1' },
    { id: 'pc1', kind: 'net.desktop', text: 'Workstations', parent: 'f1' },
    { id: 'pr1', kind: 'net.printer', text: 'Printer', parent: 'f1' },
    { id: 'f2', kind: 'container', text: 'Floor 2 — Engineering' },
    { id: 'sw2', kind: 'net.switch', text: 'Access switch', parent: 'f2' },
    { id: 'lap', kind: 'net.laptop', text: 'Laptops', parent: 'f2' },
    { id: 'ap', kind: 'net.wifi', text: 'Wi-Fi AP', parent: 'f2' },
    { id: 'mob', kind: 'net.mobile', text: 'Mobiles', parent: 'f2' },
  ],
  edges: [
    { from: 'inet', to: 'fw' },
    { from: 'fw', to: 'rtr' },
    { from: 'rtr', to: 'core' },
    { from: 'core', to: 'file' },
    { from: 'core', to: 'app' },
    { from: 'core', to: 'db' },
    { from: 'core', to: 'sw1' },
    { from: 'core', to: 'sw2' },
    { from: 'sw1', to: 'pc1' },
    { from: 'sw1', to: 'pr1' },
    { from: 'sw2', to: 'lap' },
    { from: 'sw2', to: 'ap' },
    { from: 'ap', to: 'mob', dashed: true },
  ],
};

const dmz: DiagramSpec = {
  type: 'network',
  direction: 'LR',
  nodes: [
    { id: 'users', kind: 'net.user', text: 'Remote users' },
    { id: 'inet', kind: 'net.internet', text: 'Internet' },
    { id: 'fw1', kind: 'net.firewall', text: 'Perimeter firewall' },
    { id: 'dmz', kind: 'container', text: 'DMZ' },
    { id: 'lb', kind: 'net.loadBalancer', text: 'Load balancer', parent: 'dmz' },
    { id: 'web', kind: 'net.server', text: 'Web servers', parent: 'dmz' },
    { id: 'mail', kind: 'net.mail', text: 'Mail relay', parent: 'dmz' },
    { id: 'vpn', kind: 'net.lock', text: 'VPN gateway', parent: 'dmz' },
    { id: 'fw2', kind: 'net.firewall', text: 'Internal firewall' },
    { id: 'lan', kind: 'container', text: 'Internal LAN (corporate)' },
    { id: 'app', kind: 'net.server', text: 'App servers', parent: 'lan' },
    { id: 'db', kind: 'net.database', text: 'Databases', parent: 'lan' },
    { id: 'ad', kind: 'net.security', text: 'Directory', parent: 'lan' },
    { id: 'ws', kind: 'net.desktop', text: 'Staff PCs', parent: 'lan' },
  ],
  edges: [
    { from: 'users', to: 'inet' },
    { from: 'inet', to: 'fw1' },
    { from: 'fw1', to: 'lb' },
    { from: 'fw1', to: 'mail' },
    { from: 'fw1', to: 'vpn' },
    { from: 'lb', to: 'web' },
    { from: 'web', to: 'fw2' },
    { from: 'vpn', to: 'fw2' },
    { from: 'fw2', to: 'app' },
    { from: 'app', to: 'db' },
    { from: 'fw2', to: 'ad' },
    { from: 'fw2', to: 'ws' },
  ],
};

type Gear = [kind: string, units: number, label: string];

/** Data-center racks: equipment is stacked from the top, one rack unit = 16px. */
function rackPage() {
  const b = new Builder();
  b.title('Data center — row A', 0, 0, 900, 'Rack elevation, 20U cabinets');
  const racks: Array<[string, Gear[]]> = [
    ['Rack A1 — Network', [['rack.patch', 1, 'Patch panel 1'], ['rack.switch', 1, 'Core switch 1'], ['rack.switch', 1, 'Core switch 2'], ['rack.cable', 1, ''], ['rack.patch', 1, 'Patch panel 2'], ['rack.switch', 1, 'ToR switch'], ['rack.blank', 1, ''], ['rack.server1', 1, 'Firewall'], ['rack.server1', 1, 'Firewall (HA)'], ['rack.blank', 7, ''], ['rack.kvm', 1, 'KVM'], ['rack.ups', 2, 'UPS 3kVA'], ['rack.pdu', 1, 'PDU']]],
    ['Rack A2 — Compute', [['rack.switch', 1, 'ToR switch'], ['rack.server2', 2, 'Hypervisor 01'], ['rack.server2', 2, 'Hypervisor 02'], ['rack.server2', 2, 'Hypervisor 03'], ['rack.server2', 2, 'Hypervisor 04'], ['rack.server1', 1, 'Bastion'], ['rack.blank', 7, ''], ['rack.ups', 2, 'UPS 3kVA'], ['rack.pdu', 1, 'PDU']]],
    ['Rack A3 — Storage', [['rack.switch', 1, 'Storage switch'], ['rack.storage', 2, 'SAN controller A'], ['rack.storage', 2, 'SAN controller B'], ['rack.unit', 4, 'Disk shelf 1'], ['rack.unit', 4, 'Disk shelf 2'], ['rack.server1', 1, 'Backup server'], ['rack.blank', 3, ''], ['rack.ups', 2, 'UPS 3kVA'], ['rack.pdu', 1, 'PDU']]],
  ];
  racks.forEach(([name, gear], i) => {
    const x = i * 280;
    const y = 96;
    const cab = b.shape('rack.cabinet', { x, y, w: 200, h: 352 }, {}, name);
    let u = 0;
    let used = 0;
    for (const [kind, n, label] of gear) {
      b.shape(kind, { x: x + 20, y: y + 20 + u * 16, w: 160, h: n * 16 }, {}, label, { container: cab });
      u += n;
      if (kind !== 'rack.blank') used += n;
    }
    b.text(`${used} / 20 U used`, { x, y: y + 360, w: 200, h: 22 }, { fontSize: 12, textColor: MUTED });
  });
  b.text('Front view', { x: 0, y: 500, w: 760, h: 24 }, { fontSize: 13, textColor: INK, bold: true, textAlign: 'left' });
  return [b.page('Racks')];
}

export const NETWORK_TEMPLATES: Template[] = [
  {
    id: 'network-office',
    name: 'Office network topology',
    category: 'Network',
    description: 'Internet edge, core switch, server room and per-floor access networks.',
    keywords: ['network', 'topology', 'lan', 'switch', 'router', 'firewall', 'office', 'it'],
    build: () => specPage('Office network', 'Office network topology', 'Two floors, a server room and a single internet edge', office),
  },
  {
    id: 'network-dmz',
    name: 'DMZ & segmentation',
    category: 'Network',
    description: 'Perimeter and internal firewalls with a DMZ for public services and a protected LAN.',
    keywords: ['network', 'security', 'dmz', 'firewall', 'vpn', 'segmentation', 'zero trust'],
    build: () => specPage('DMZ', 'Network segmentation with a DMZ', 'Public services isolated from the internal LAN', dmz),
  },
  {
    id: 'network-racks',
    name: 'Server rack elevation',
    category: 'Network',
    description: 'Three 20U cabinets with switches, servers, storage, UPS and PDUs.',
    keywords: ['rack', 'data center', 'server', 'cabinet', 'elevation', 'hardware', 'datacenter'],
    build: rackPage,
  },
];
