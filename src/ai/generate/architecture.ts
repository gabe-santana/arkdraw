/**
 * Architecture knowledge for the assistant: short, curated pattern guides it
 * looks up on demand (get_architecture_guide), and a review of the submitted
 * diagram that flags the common mistakes those guides warn about. The review
 * never blocks a diagram: the model gets one chance to fix or justify it.
 */
import type { ChatTool } from '../providers/types';
import type { DiagramSpec, SpecEdge, SpecNode } from './spec';

export const ARCHITECTURE_TOPICS = ['multi-region', 'observability', 'networking', 'data', 'security', 'event-driven'] as const;
export type ArchitectureTopic = (typeof ARCHITECTURE_TOPICS)[number];

const GUIDES: Record<ArchitectureTopic, string> = {
  'multi-region': `Multi-region (active-passive or active-active):
- Global entry sits OUTSIDE the regions: Azure Front Door or Traffic Manager; AWS Route 53 (with CloudFront or Global Accelerator); Google Cloud global external load balancer.
- Each region is a complete stamp (gateway, compute, cache, secrets, monitoring) and keeps serving when the other region is down. Never make one region depend on the other for a request.
- Links BETWEEN regions are only replication or failover, labelled as such: Azure SQL geo-replication / failover groups, Cosmos DB multi-region; Aurora Global Database, DynamoDB global tables; Cloud SQL cross-region replicas, Spanner multi-region. Caches geo-replicate (Azure Cache for Redis active geo-replication, ElastiCache Global Datastore) or stay regional.
- Container images: one registry with replication (ACR geo-replication, ECR cross-region replication, Artifact Registry multi-region), drawn outside the regions.
- Active-passive: the secondary only receives replication until failover. Active-active: both serve, so writes need a multi-region data store.`,
  observability: `Observability:
- Keep telemetry in the region that produces it: a Log Analytics workspace and Application Insights per region (Azure), CloudWatch in each region (AWS), Cloud Logging buckets per region (GCP). Monitoring then survives a regional outage and avoids cross-region traffic.
- For one view across regions, query or dashboard across the regional stores rather than shipping raw logs to another region.
- A single central workspace is a valid deliberate choice (compliance, cost): draw it outside the regions (a shared or management scope) and say so.
- Draw telemetry edges dashed, labelled "logs" / "metrics", so they read as secondary to the request path.`,
  networking: `Networking for web workloads:
- Public traffic enters only through the edge: WAF + gateway or load balancer (Application Gateway / Front Door, ALB / CloudFront, Cloud Load Balancing + Cloud Armor).
- Application tier and data live in private subnets; databases and caches are never reachable from the internet.
- Platform services are reached privately: Azure Private Endpoints, AWS PrivateLink / VPC endpoints, GCP Private Service Connect.
- Group by scope: cloud > region > VNet/VPC > subnet; put each service in the subnet it runs in.`,
  data: `Data:
- Writes go to the primary database; read replicas serve read-heavy paths; a cache sits in front (cache-aside), labelled "cache".
- Backups and point-in-time restore are part of the design; mention them when the user asks about resilience.
- Queues or event streams decouple slow work from the request path.`,
  security: `Security:
- Secrets live in a vault (Azure Key Vault, AWS Secrets Manager, Google Secret Manager), read by workloads with managed identities / IAM roles, not stored in config.
- A WAF protects public entry points; least-privilege access between services.
- Data is encrypted at rest and in transit; show TLS on public edges ("HTTPS").`,
  'event-driven': `Event-driven:
- Producers publish to a broker; consumers subscribe: Event Grid, Service Bus, Event Hubs (Azure); EventBridge, SNS, SQS, Kinesis (AWS); Pub/Sub (GCP).
- Each consumer has its own subscription or queue and a dead-letter queue; consumers are idempotent.
- Draw async edges dashed with "dots" animation, sync calls solid.`,
};

export const ARCHITECTURE_GUIDE_TOOL: ChatTool = {
  name: 'get_architecture_guide',
  description:
    'Get a short guide of proven patterns for a cloud architecture topic, with the matching Azure, AWS and Google Cloud services. Call it before designing cloud architectures, once per topic involved (parallel calls are fine).',
  parameters: {
    type: 'object',
    properties: { topic: { type: 'string', enum: [...ARCHITECTURE_TOPICS] } },
    required: ['topic'],
  },
};

export function architectureGuide(topic: unknown): string | null {
  return typeof topic === 'string' && topic in GUIDES ? GUIDES[topic as ArchitectureTopic] : null;
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

const REGION = /\b(region|região|regiao|región|région)\b|\b(us|eu|ap|sa|ca|me|af)-[a-z]+-\d\b|\b(east|west|north|south|central)[a-z]*\s?(us|europe|asia|brazil)\b/i;
const CROSS_REGION_OK = /replic|geo|failover|fail-over|sync|backup|restore|dr\b|disaster|route|routing|traffic|dns|images?|pull/i;
const DATA_STORE = /\b(sql|database|db|postgres|mysql|maria|cosmos|dynamo|aurora|rds|spanner|bigtable|firestore|mongo|redis|cache)\b/i;
const PUBLIC = /\b(user|users|client|browser|internet|public|mobile app|customer)\b/i;

const label = (n: SpecNode) => n.text || n.id;

/** The innermost container whose label names a region, for each node. */
function regionOf(spec: DiagramSpec): Map<string, SpecNode | undefined> {
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const out = new Map<string, SpecNode | undefined>();
  for (const n of spec.nodes) {
    let p = n.parent ? byId.get(n.parent) : undefined;
    const seen = new Set<string>();
    while (p && !seen.has(p.id) && !REGION.test(p.text ?? '')) {
      seen.add(p.id);
      p = p.parent ? byId.get(p.parent) : undefined;
    }
    out.set(n.id, p);
  }
  return out;
}

/**
 * Notes on likely architecture mistakes in a diagram, for the model to fix or
 * justify. Heuristic and conservative: it only names what the guides call out.
 */
export function reviewArchitecture(spec: DiagramSpec): string[] {
  const notes: string[] = [];
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const region = regionOf(spec);
  const crossing: SpecEdge[] = [];
  for (const e of spec.edges) {
    const a = region.get(e.from);
    const b = region.get(e.to);
    if (a && b && a.id !== b.id && !CROSS_REGION_OK.test(e.label ?? '')) crossing.push(e);
  }
  for (const e of crossing.slice(0, 6)) {
    const from = byId.get(e.from)!;
    const to = byId.get(e.to)!;
    notes.push(
      `"${label(from)}" (${label(region.get(e.from)!)}) → "${label(to)}" (${label(region.get(e.to)!)})${e.label ? ` labelled "${e.label}"` : ''} crosses regions. Links between regions should be replication or failover; a region should not depend on the other one to serve or observe itself.`,
    );
  }
  if (crossing.length > 6) notes.push(`…and ${crossing.length - 6} more links between regions.`);
  for (const e of spec.edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (from && to && PUBLIC.test(label(from)) && DATA_STORE.test(`${label(to)} ${to.icon ?? ''}`)) {
      notes.push(`"${label(from)}" → "${label(to)}" puts a data store on a public path. Databases and caches should only be reached by the application tier.`);
    }
  }
  return notes;
}

/** The tool result that asks the model to act on review notes. */
export const reviewMessage = (notes: string[]) =>
  `Diagram accepted, with architecture review notes:\n- ${notes.join('\n- ')}\nFix these by calling submit_diagram again, or, if they are deliberate, reply with one short sentence naming the choice and its alternative.`;
