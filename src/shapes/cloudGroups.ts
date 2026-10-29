/**
 * Cloud and network groups (AWS cloud, VPC, Azure subscription, VNet,
 * subnets…): their shared style, their official logo from the installed icon
 * packs, and the catalog offered in the library. Shared by the AI diagram
 * builder and the shapes panel. Icon paths point into `public/icons`, which
 * is downloaded by `npm run icons:fetch`, never committed.
 */
import type { ElementStyle, ShapeElement, Vec } from '@/model/types';
import { createShape } from '@/model/defaults';

/** Logo size in a group's top-left corner. */
export const GROUP_ICON_SIZE = 24;

/**
 * One look for every group (cloud, subscription, VPC, subnet, resource group…):
 * a solid outline and a bold title in the same color, no fill, so nested groups
 * read as one system. The official logo and the label tell them apart.
 */
const GROUP_COLOR = '#232F3E';

/** Style of a group box; the same for every label. */
export function groupStyle(_label: string): Partial<ElementStyle> {
  return { textAlign: 'left', verticalAlign: 'middle', bold: true, fontSize: 13, radius: 10, strokeWidth: 1.5, stroke: GROUP_COLOR, fill: 'none', strokeStyle: 'solid', textColor: GROUP_COLOR };
}

/**
 * Official group icons for cloud and network boundaries, matched on the label
 * and picked for the diagram's cloud (`*` = any).
 */
const GROUP_ICONS: Array<[RegExp, Record<string, string>]> = [
  [/public.*subnet|subnet.*public|\bdmz\b/i, { aws: 'aws/groups/public-subnet.svg', azure: 'azure/networking/subnet.svg', oci: 'oci/networking/virtual-cloud-network-vcn.svg', gcp: 'gcp/products/virtual-private-cloud.svg' }],
  [/subnet/i, { aws: 'aws/groups/private-subnet.svg', azure: 'azure/networking/subnet.svg', oci: 'oci/networking/virtual-cloud-network-vcn.svg', gcp: 'gcp/products/virtual-private-cloud.svg' }],
  [/\bvpc\b|\bvnet\b|virtual (private )?(cloud|network)|\bvcn\b/i, { aws: 'aws/groups/virtual-private-cloud-vpc.svg', azure: 'azure/networking/virtual-networks.svg', gcp: 'gcp/products/virtual-private-cloud.svg', oci: 'oci/networking/virtual-cloud-network-vcn.svg', '*': 'azure/networking/virtual-networks.svg' }],
  [/auto ?scaling/i, { '*': 'aws/groups/auto-scaling-group.svg' }],
  [/resource group|\brg\b/i, { '*': 'azure/general/resource-groups.svg' }],
  [/management group/i, { '*': 'azure/general/management-groups.svg' }],
  [/subscription/i, { '*': 'azure/general/subscriptions.svg' }],
  [/compartment/i, { '*': 'oci/identity-and-security/compartments.svg' }],
  [/\bproject\b/i, { '*': 'gcp/products/project.svg' }],
  [/namespace/i, { '*': 'kubernetes/resources/namespace.svg' }],
  [/\beks\b|\bgke\b|kubernetes|\bk8s\b|cluster/i, { aws: 'aws/containers/amazon-elastic-kubernetes-service.svg', gcp: 'gcp/core-products/gke.svg' }],
  [/region/i, { aws: 'aws/groups/region.svg', azure: 'azure/general/region-management.svg', oci: 'oci/migration/dedicated-region.svg' }],
  [/account/i, { aws: 'aws/groups/aws-account.svg' }],
  [/on-?prem|data ?cent(er|re)|corporate/i, { '*': 'aws/groups/corporate-data-center.svg' }],
  [/\baws\b|amazon web services/i, { '*': 'aws/groups/aws-cloud-logo.svg' }],
  [/azure/i, { '*': 'azure/other/azure-a.svg' }],
  [/google cloud|\bgcp\b/i, { '*': 'logos/icons/google.svg' }],
  [/oracle|\boci\b/i, { '*': 'oci/general/cloud.svg' }],
  [/cloud/i, { aws: 'aws/groups/aws-cloud-logo.svg', azure: 'azure/other/azure-a.svg', gcp: 'logos/icons/google.svg', oci: 'oci/general/cloud.svg' }],
];

/** The logo for a group label in a diagram built mostly on `cloud` (aws, azure, gcp, oci…). */
export function groupIcon(label: string, cloud?: string): string | undefined {
  for (const [re, icons] of GROUP_ICONS) {
    if (!re.test(label)) continue;
    const hit = (cloud && icons[cloud]) || icons['*'];
    if (hit) return hit;
  }
  return undefined;
}

/** The icon pack most of the diagram's icons come from. */
export function dominantCloud(nodes: Array<{ icon?: string }>): string | undefined {
  const counts = new Map<string, number>();
  for (const n of nodes) {
    const pack = n.icon?.split('/')[0];
    if (pack && pack !== 'logos') counts.set(pack, (counts.get(pack) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Groups offered at the top of each icon pack in the library. */
export const CLOUD_GROUPS: Record<string, string[]> = {
  aws: ['AWS Cloud', 'AWS Account', 'Region', 'VPC', 'Public subnet', 'Private subnet', 'Auto Scaling group', 'Corporate data center'],
  azure: ['Azure', 'Management group', 'Subscription', 'Resource group', 'Virtual network', 'Subnet', 'Region'],
  gcp: ['Google Cloud', 'Project', 'VPC network', 'Subnet', 'GKE cluster'],
  oci: ['Oracle Cloud', 'Compartment', 'Region', 'VCN', 'Subnet'],
  kubernetes: ['Namespace'],
};

/** A group box with its logo, ready to drop at `at` (its center). */
export function createGroup(label: string, cloud: string, at: Vec, size = { w: 360, h: 220 }): ShapeElement {
  const g = createShape('group', { x: at.x - size.w / 2, y: at.y - size.h / 2, ...size }, groupStyle(label), label);
  const icon = groupIcon(label, cloud);
  if (icon) {
    g.icon = icon;
    g.params = { ...g.params, iconSize: GROUP_ICON_SIZE };
  }
  return g;
}

/** A representative logo per icon pack, for the library section headers. */
export const PACK_LOGOS: Record<string, string> = {
  aws: 'aws/groups/aws-cloud-logo.svg',
  azure: 'azure/other/azure-a.svg',
  gcp: 'logos/icons/google.svg',
  oci: 'oci/general/cloud.svg',
  alibaba: 'alibaba/cloud-infrastructure/cloudbox.svg',
  ibm: 'ibm/networking/ibm-cloud-vpc.svg',
  kubernetes: 'kubernetes/infrastructure-components/control-plane.svg',
  logos: 'logos/icons/github.svg',
  material: 'material/images/palette.svg',
  fontawesome: 'fontawesome/other/font-awesome.svg',
  fluent: 'fluent/general/fluent.svg',
  'bootstrap-icons': 'bootstrap-icons/general/bootstrap-fill.svg',
};
