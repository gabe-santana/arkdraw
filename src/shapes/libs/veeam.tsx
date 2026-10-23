/**
 * Veeam style (Backup): backup & replication infrastructure as original glyph
 * tiles — green for backup infrastructure servers, grey for storage targets,
 * outlined tiles for jobs and restore objects. No vendor logos.
 */
import {
  ArrowLeftRight, Bell, Box, Boxes, Building2, CalendarClock, CassetteTape, Cloud, CloudUpload, Copy, Database, FlaskConical, Folder,
  FolderOpen, Gauge, Globe, HardDrive, LayoutDashboard, Layers, Lock, Monitor, Repeat, Rocket, Server, Settings2, ShieldCheck, Terminal,
  Waypoints,
} from 'lucide-react';
import type { ElementStyle } from '@/model/types';
import type { ShapeDef, ShapeLibrary } from '../types';
import { item, shape } from './_kit2';
import { type Art, BUCKET, Boundary, RESTORE_POINT, TAPE_LIBRARY, boundaryText, glyphTile } from './_infra';

const GREEN = '#16a34a';
const GREY = '#4b5563';

type Role = 'infra' | 'storage' | 'job' | 'source';
const ROLE: Record<Role, Partial<ElementStyle>> = {
  infra: { fill: GREEN, stroke: '#15803d', textColor: '#0f172a' },
  storage: { fill: GREY, stroke: '#374151', textColor: '#0f172a' },
  job: { fill: '#f0fdf4', stroke: GREEN, textColor: '#0f172a' },
  source: { fill: '#f3f4f6', stroke: GREY, textColor: '#0f172a' },
};
const BADGE: Record<Role, string> = { infra: '#374151', storage: GREEN, job: '#374151', source: GREEN };

/** [name, label, glyph, role, badge, mxGraph stencil, keywords] */
const TILES: Array<[string, string, Art, Role, Art | undefined, string, string]> = [
  ['backupServer', 'Backup server', Server, 'infra', Settings2, 'veeam_backup_and_replication_server', 'vbr management server console configuration'],
  ['proxy', 'Backup proxy', Server, 'infra', ArrowLeftRight, 'proxy', 'data mover transport vmware hyper-v'],
  ['mountServer', 'Mount server', Server, 'infra', FolderOpen, 'mount_server', 'file level restore flr instant recovery'],
  ['gatewayServer', 'Gateway server', Server, 'infra', Waypoints, 'gateway_server', 'repository gateway smb nfs dedup appliance'],
  ['tapeServer', 'Tape server', Server, 'infra', CassetteTape, 'tape_server', 'tape proxy lto'],
  ['wanAccelerator', 'WAN accelerator', Server, 'infra', Rocket, 'wan_accelerator', 'wan optimization offsite copy bandwidth'],
  ['guestProxy', 'Guest interaction proxy', Server, 'infra', Terminal, 'guest_interaction_proxy', 'application aware processing indexing gip'],
  ['enterpriseManager', 'Enterprise Manager', LayoutDashboard, 'infra', Globe, 'veeam_backup_enterprise_manager', 'web console self service portal'],
  ['monitoring', 'Monitoring (ONE)', Gauge, 'infra', Bell, 'veeam_one_server', 'veeam one reporting alerts monitoring'],
  ['repository', 'Backup repository', Database, 'storage', undefined, 'backup_repository', 'storage target disk repo'],
  ['sobr', 'Scale-out repository', Database, 'storage', Layers, 'scale_out_backup_repository', 'sobr performance capacity archive tier extents'],
  ['objectStorage', 'Object storage', BUCKET, 'storage', Cloud, 'object_storage', 's3 bucket blob immutable capacity tier'],
  ['hardenedRepo', 'Hardened repository', Database, 'storage', Lock, 'hardened_repository', 'immutable linux xfs ransomware protection'],
  ['tapeLibrary', 'Tape library', TAPE_LIBRARY, 'storage', undefined, 'tape_library', 'autoloader lto changer media'],
  ['tape', 'Tape cartridge', CassetteTape, 'storage', undefined, 'tape', 'tape drive media lto cartridge'],
  ['cloudConnect', 'Cloud Connect provider', CloudUpload, 'infra', Building2, 'cloud_connect', 'service provider offsite dr cloud repository'],
  ['nasShare', 'NAS / file share', HardDrive, 'source', Folder, 'nas', 'file share smb nfs unstructured data'],
  ['hypervisor', 'Hypervisor host', Server, 'source', Boxes, 'esxi_host', 'vsphere esxi hyper-v host virtualization'],
  ['vm', 'Virtual machine', Box, 'source', undefined, 'vm', 'vm guest workload'],
  ['agent', 'Backup agent', Monitor, 'source', ShieldCheck, 'agent', 'physical machine windows linux endpoint agent'],
  ['backupJob', 'Backup job', CalendarClock, 'job', Database, 'backup_job', 'job schedule policy'],
  ['replicationJob', 'Replication job', Repeat, 'job', Server, 'replication_job', 'replica dr failover cdp'],
  ['backupCopy', 'Backup copy job', Copy, 'job', undefined, 'backup_copy_job', '3-2-1 offsite copy secondary'],
  ['restorePoint', 'Restore point', RESTORE_POINT, 'job', undefined, 'restore_point', 'snapshot point in time recovery rpo'],
  ['virtualLab', 'SureBackup / virtual lab', FlaskConical, 'job', ShieldCheck, 'virtual_lab', 'surebackup verification test recovery sandbox'],
];

const shapes: ShapeDef[] = [
  ...TILES.map(([name, label, art, role, badge, stencil]) =>
    shape(
      `veeam.${name}`,
      label,
      `shape=mxgraph.veeam2.${stencil};verticalLabelPosition=bottom;verticalAlign=top;html=1;`,
      glyphTile(art, { badge, badgeColor: BADGE[role] }),
      { rounded: true, textPlacement: 'below', boxHit: true },
    ),
  ),
  shape(
    'veeam.site',
    'Site / location',
    'rounded=1;arcSize=4;dashed=1;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;container=1;html=1;',
    (ctx) => <Boundary {...ctx} glyph={Building2} />,
    { rounded: true, container: true, textBox: boundaryText(true) },
  ),
];

const site: Partial<ElementStyle> = {
  fill: '#f9fafb',
  stroke: GREEN,
  strokeStyle: 'dashed',
  radius: 10,
  textColor: '#14532d',
  bold: true,
  fontSize: 12,
  textAlign: 'left',
  verticalAlign: 'middle',
};

const libraries: ShapeLibrary[] = [
  {
    id: 'veeam',
    name: 'Veeam style (Backup)',
    items: [
      ...TILES.map(([name, label, , role, , , keywords]) =>
        item(`veeam.${name}`, label, 60, 60, {
          text: label,
          style: { ...ROLE[role], radius: 12, fontSize: 12 },
          keywords: `veeam backup recovery ${keywords}`,
        }),
      ),
      item('veeam.agent', 'Agent (Linux)', 60, 60, {
        text: 'Agent (Linux)',
        style: { ...ROLE.source, radius: 12, fontSize: 12 },
        keywords: 'veeam backup agent linux physical server',
      }),
      item('veeam.site', 'Site / location', 360, 220, {
        text: 'Primary site',
        style: site,
        keywords: 'veeam site datacenter location dr offsite boundary group container',
      }),
    ],
  },
];

export { shapes, libraries };
