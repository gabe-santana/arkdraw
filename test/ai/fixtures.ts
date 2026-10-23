import type { DiagramSpec } from '@/ai/generate/spec';

export const awsSpec: DiagramSpec = {
  type: 'cloud',
  direction: 'LR',
  nodes: [
    { id: 'users', kind: 'net.user', text: 'Users' },
    { id: 'cloud', kind: 'container', text: 'AWS Cloud' },
    { id: 'region', kind: 'container', text: 'Region us-east-1', parent: 'cloud' },
    { id: 'vpc', kind: 'container', text: 'VPC', parent: 'region' },
    { id: 'pub', kind: 'container', text: 'Public subnet', parent: 'vpc' },
    { id: 'priv', kind: 'container', text: 'Private subnet', parent: 'vpc' },
    { id: 'alb', kind: 'icon', text: 'Application Load Balancer', icon: 'aws/networking/elb.svg', parent: 'pub' },
    { id: 'web1', kind: 'icon', text: 'Web server 1', icon: 'aws/compute/amazon-ec2.svg', parent: 'priv' },
    { id: 'web2', kind: 'icon', text: 'Web server 2', icon: 'aws/compute/amazon-ec2.svg', parent: 'priv' },
    { id: 'db', kind: 'icon', text: 'RDS PostgreSQL', icon: 'aws/database/amazon-rds.svg', parent: 'priv' },
    { id: 's3', kind: 'icon', text: 'Static assets', icon: 'aws/storage/amazon-s3.svg', parent: 'region' },
  ],
  edges: [
    { from: 'users', to: 'alb', label: 'HTTPS' },
    { from: 'alb', to: 'web1' },
    { from: 'alb', to: 'web2' },
    { from: 'web1', to: 'db' },
    { from: 'web2', to: 'db' },
    { from: 'web1', to: 's3' },
  ],
};

export const c4Spec: DiagramSpec = {
  type: 'c4',
  nodes: [
    { id: 'customer', kind: 'c4.person', text: 'Customer', description: 'Buys products online.' },
    { id: 'shop', kind: 'c4.boundary', text: 'E-commerce', technology: 'Software System' },
    { id: 'spa', kind: 'c4.container', text: 'Web App', technology: 'React', description: 'Storefront UI.', parent: 'shop' },
    { id: 'api', kind: 'c4.container', text: 'API', technology: 'Node.js', description: 'Orders and catalog.', parent: 'shop' },
    { id: 'db', kind: 'c4.database', text: 'Database', technology: 'PostgreSQL', parent: 'shop' },
    { id: 'pay', kind: 'c4.system', text: 'Payment Provider', external: true },
  ],
  edges: [
    { from: 'customer', to: 'spa', label: 'Uses' },
    { from: 'spa', to: 'api', label: 'JSON/HTTPS' },
    { from: 'api', to: 'db', label: 'SQL' },
    { from: 'api', to: 'pay', label: 'Charges cards' },
  ],
};

export const flowSpec: DiagramSpec = {
  type: 'flowchart',
  nodes: [
    { id: 'start', kind: 'flow.terminator', text: 'Start' },
    { id: 'login', kind: 'rectangle', text: 'Enter credentials' },
    { id: 'ok', kind: 'diamond', text: 'Valid?' },
    { id: 'home', kind: 'rectangle', text: 'Show dashboard' },
    { id: 'err', kind: 'rectangle', text: 'Show error' },
    { id: 'end', kind: 'flow.terminator', text: 'End' },
  ],
  edges: [
    { from: 'start', to: 'login' },
    { from: 'login', to: 'ok' },
    { from: 'ok', to: 'home', label: 'Yes' },
    { from: 'ok', to: 'err', label: 'No' },
    { from: 'err', to: 'login' },
    { from: 'home', to: 'end' },
  ],
};
