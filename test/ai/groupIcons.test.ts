import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dominantCloud, groupIcon, resolveSpec } from '@/ai/generate/resolve';
import { validateSpec } from '@/ai/generate/spec';
import { getShapeDef } from '@/shapes/registry';

describe('group logos', () => {
  it('picks the official icon for the label and the diagram cloud', () => {
    expect(groupIcon('Virtual Network (VNet)', 'azure')).toBe('azure/networking/virtual-networks.svg');
    expect(groupIcon('VPC', 'aws')).toBe('aws/groups/virtual-private-cloud-vpc.svg');
    expect(groupIcon('Public Subnet', 'aws')).toBe('aws/groups/public-subnet.svg');
    expect(groupIcon('Private Subnet', 'azure')).toBe('azure/networking/subnet.svg');
    expect(groupIcon('Spoke - Prod RG', 'azure')).toBe('azure/general/resource-groups.svg');
    expect(groupIcon('Azure Cloud')).toBe('azure/other/azure-a.svg');
    expect(groupIcon('AWS Account', 'aws')).toBe('aws/groups/aws-account.svg');
    expect(groupIcon('Payments team')).toBeUndefined();
  });

  it('detects the cloud most icons come from', () => {
    expect(dominantCloud([{ icon: 'azure/a.svg' }, { icon: 'azure/b.svg' }, { icon: 'aws/c.svg' }, {}])).toBe('azure');
    expect(dominantCloud([{ icon: 'logos/icons/github.svg' }])).toBeUndefined();
  });

  it('turns generic containers into groups with the logo beside the title', () => {
    const v = validateSpec({
      type: 'cloud',
      nodes: [
        { id: 'vnet', kind: 'container', text: 'Virtual Network' },
        { id: 'vm', kind: 'icon', text: 'VM', icon: 'azure/compute/virtual-machine.svg', parent: 'vnet' },
      ],
      edges: [],
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const vnet = resolveSpec(v.spec).find((n) => n.id === 'vnet')!;
    expect(vnet.kind).toBe('group');
    expect(vnet.icon).toBe('azure/networking/virtual-networks.svg');
    const box = getShapeDef('group').textBox!(300, 200, { iconSize: 24 });
    expect(box.x).toBeGreaterThan(24);
  });

  it('only names icons that exist in the installed packs', () => {
    const root = join(process.cwd(), 'public/icons');
    if (!existsSync(join(root, 'azure'))) return; // packs not fetched
    const labels = ['Public Subnet', 'Private Subnet', 'VNet', 'VPC', 'Resource Group', 'Subscription', 'Management Group', 'Region', 'AWS Account', 'AWS Cloud', 'Azure', 'Google Cloud', 'Project', 'Compartment', 'Namespace', 'EKS cluster', 'On-premises', 'Auto Scaling group'];
    for (const cloud of ['aws', 'azure', 'gcp', 'oci', undefined]) {
      for (const label of labels) {
        const icon = groupIcon(label, cloud);
        if (icon) expect(existsSync(join(root, icon)), `${label} (${cloud}) → ${icon}`).toBe(true);
      }
    }
  });
});
