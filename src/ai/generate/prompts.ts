/**
 * System prompts and tool definitions for diagram generation / editing.
 */
import type { ChatTool, JsonSchema } from '../providers/types';
import { ARROW_HEADS, DIAGRAM_TYPES, DIRECTIONS, EDGE_ANIMATIONS, NODE_ANIMATIONS, ROUTINGS } from './spec';
import type { IconProviderInfo } from './icons';

const styleSchema: JsonSchema = {
  type: 'object',
  description: 'Optional visual emphasis. Colors are #rrggbb. Usually omit: conventions are applied automatically.',
  properties: {
    fill: { type: 'string' },
    stroke: { type: 'string' },
    textColor: { type: 'string' },
    dashed: { type: 'boolean' },
    bold: { type: 'boolean' },
  },
};

const edgeAnimationSchema: JsonSchema = {
  type: 'object',
  description: 'Motion along the edge: "flow" = marching dashes (requests, calls), "dots" = tokens traveling (data, events, messages), "pulse" = glowing line. kind "none" removes it.',
  properties: {
    kind: { type: 'string', enum: [...EDGE_ANIMATIONS, 'none'] },
    speed: { type: 'number', description: '1 = normal, 0.5 slower, 2 faster.' },
    reverse: { type: 'boolean', description: 'Travel from target to source (responses).' },
  },
  required: ['kind'],
};

const nodeAnimationSchema: JsonSchema = {
  type: 'object',
  description: 'Draw attention to this node: "pulse", "glow" or "bounce" (e.g. the failing or the key service). kind "none" removes it.',
  properties: {
    kind: { type: 'string', enum: [...NODE_ANIMATIONS, 'none'] },
    speed: { type: 'number' },
  },
  required: ['kind'],
};

const stepSchema: JsonSchema = { type: 'integer', minimum: 0, description: 'Build step (1, 2, 3…) at which it appears when the diagram plays step by step; 0 removes it.' };

const nodeSchema: JsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Short unique slug, e.g. "api", "orders_db".' },
    kind: { type: 'string', description: 'Shape kind from the catalog in the instructions.' },
    text: { type: 'string', description: 'Label. For C4 / class / entity nodes: just the name.' },
    icon: { type: 'string', description: 'For kind "icon": the exact `icon` value returned by search_icons.' },
    parent: { type: 'string', description: 'Id of the container / boundary node this node is inside.' },
    technology: { type: 'string', description: 'C4: technology, e.g. "Spring Boot".' },
    description: { type: 'string', description: 'C4: one-sentence responsibility.' },
    attributes: { type: 'array', items: { type: 'string' }, description: 'UML class attributes or ERD columns.' },
    methods: { type: 'array', items: { type: 'string' }, description: 'UML class operations.' },
    external: { type: 'boolean', description: 'C4: external person/system (drawn grey).' },
    style: styleSchema,
    animation: nodeAnimationSchema,
    step: stepSchema,
  },
  required: ['id', 'kind', 'text'],
};

const edgeSchema: JsonSchema = {
  type: 'object',
  properties: {
    from: { type: 'string', description: 'Source node id.' },
    to: { type: 'string', description: 'Target node id.' },
    label: { type: 'string' },
    routing: { type: 'string', enum: ROUTINGS },
    startArrow: { type: 'string', enum: ARROW_HEADS },
    endArrow: { type: 'string', enum: ARROW_HEADS },
    dashed: { type: 'boolean' },
    animation: edgeAnimationSchema,
    step: stepSchema,
  },
  required: ['from', 'to'],
};

const diagramSchema: JsonSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: DIAGRAM_TYPES },
    direction: { type: 'string', enum: DIRECTIONS, description: 'Main flow direction (TB = top→bottom, LR = left→right).' },
    title: { type: 'string' },
    nodes: { type: 'array', items: nodeSchema },
    edges: { type: 'array', items: edgeSchema },
    build: { type: 'boolean', description: 'Reveal the diagram step by step following the flow (steps are numbered automatically; explicit `step` values win).' },
  },
  required: ['type', 'nodes', 'edges'],
};

export const SEARCH_ICONS_TOOL: ChatTool = {
  name: 'search_icons',
  description:
    'Search the installed vendor icon packs (AWS, Azure, GCP, OCI, Kubernetes…) for a service icon. Returns the best matches with the `icon` value to put on a node of kind "icon". Call once per service; parallel calls are fine.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Service name, e.g. "EC2", "Application Load Balancer", "Cosmos DB".' },
      provider: { type: 'string', description: 'Optional icon pack id to search within, e.g. "aws".' },
    },
    required: ['query'],
  },
};

export const SUBMIT_DIAGRAM_TOOL: ChatTool = {
  name: 'submit_diagram',
  description:
    'Submit the complete diagram. Layout, sizing and colors are computed automatically — give structure only (no coordinates). Returns validation errors to fix, if any.',
  parameters: diagramSchema,
};

export const SUBMIT_EDITS_TOOL: ChatTool = {
  name: 'submit_edits',
  description:
    'Apply incremental edits to the current diagram. Existing shapes keep their positions; new shapes are placed automatically next to what they connect to (or inside their parent container).',
  parameters: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One short sentence describing the change.' },
      ops: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: ['add_node', 'update_node', 'remove_node', 'add_edge', 'update_edge', 'remove_edge', 'animate_edges', 'set_build'] },
            id: { type: 'string', description: 'Existing node/edge id (update_*, remove_*).' },
            node: { ...nodeSchema, description: 'add_node: the new node (new unique id; `parent` may be an existing container id).' },
            edge: { ...edgeSchema, description: 'add_edge: endpoints are existing or newly added node ids.' },
            text: { type: 'string', description: 'update_node: new label.' },
            kind: { type: 'string', description: 'update_node: new shape kind.' },
            icon: { type: 'string' },
            parent: { type: 'string', description: 'update_node: move into this container ("" to take it out).' },
            technology: { type: 'string' },
            description: { type: 'string' },
            attributes: { type: 'array', items: { type: 'string' } },
            methods: { type: 'array', items: { type: 'string' } },
            style: styleSchema,
            label: { type: 'string', description: 'update_edge: new label.' },
            startArrow: { type: 'string', enum: ARROW_HEADS },
            endArrow: { type: 'string', enum: ARROW_HEADS },
            dashed: { type: 'boolean' },
            routing: { type: 'string', enum: ROUTINGS },
            animation: {
              type: 'object',
              description: 'update_node / update_edge / animate_edges: the animation to set (edge kinds flow, dots, pulse; node kinds pulse, glow, bounce; "none" removes it).',
              properties: { kind: { type: 'string' }, speed: { type: 'number' }, reverse: { type: 'boolean' } },
              required: ['kind'],
            },
            step: stepSchema,
            edges: { type: 'array', items: { type: 'string' }, description: 'animate_edges: edge ids, or ["all"] for every edge.' },
            enabled: { type: 'boolean', description: 'set_build: true numbers build steps along the flow, false removes them.' },
          },
          required: ['op'],
        },
      },
    },
    required: ['ops'],
  },
};

const CATALOG = `Shape kinds:
- General: rectangle, ellipse, diamond, hexagon, parallelogram, trapezoid, cylinder (database/storage), cloud, text (free label), sticky, container (titled group box).
- Flowchart: flow.terminator (start/end), rectangle (process step), diamond (decision; label outgoing edges "Yes"/"No"), parallelogram (input/output), flow.document, flow.predefined (subprocess), flow.manualInput, flow.manualOperation, flow.delay, flow.internalStorage, flow.offPage, cylinder.
- UML: uml.class (text = class name; attributes like "- id: UUID", methods like "+ save(): void"; prefix «interface» in text for interfaces), uml.actor, uml.package, uml.component, uml.note, uml.node, uml.lifeline, uml.frame, uml.initial, uml.final.
- ERD: erd.entity (text = table name; attributes = columns like "id: uuid PK", "author_id: uuid FK", "title: text"), erd.weakEntity, erd.multivalued.
- C4: c4.person, c4.system, c4.container, c4.component, c4.database, c4.queue, c4.browser, c4.boundary (group: children set parent to it; text = e.g. "Online Store" and technology = boundary type like "Software System" or "Container"). For c4 elements text is only the name; put technology and description in their own fields; external:true for external people/systems. C4 colors are applied automatically.
- Network: net.server, net.database, net.router, net.switch, net.firewall, net.cloud, net.internet, net.loadBalancer, net.storage, net.container, net.cpu, net.desktop, net.laptop, net.mobile, net.user, net.wifi, net.security, net.lock, net.mail, net.printer.
- Vendor icons: kind "icon" + icon (exact value from search_icons). Group them with container nodes named for their scope ("AWS Cloud", "Region us-east-1", "VPC 10.0.0.0/16", "Availability Zone A", "Public subnet", "Private subnet", "Resource group", "Kubernetes cluster"); provider-style colors and the official group logo (VPC, VNet, subnet, resource group, subscription, account, region, cloud) are applied from the container's text, so do not search icons for containers.

Edges: from/to node ids, optional short label ("HTTPS", "reads/writes", "1. login"). Arrow heads: ${ARROW_HEADS.join(', ')}.
- UML: inheritance endArrow triangleOpen; realization triangleOpen + dashed; composition startArrow diamond + endArrow none; aggregation startArrow diamondOpen; dependency endArrow arrow + dashed; association endArrow arrow or none.
- ERD: crow's-foot at both ends, e.g. one-to-many = startArrow erOnlyOne, endArrow erZeroMany (or erOneMany); edge from the "one" side to the "many" side.
- Sequence (type "sequence"): nodes are participants (uml.lifeline) in left-to-right order, edges are messages in chronological order; replies dashed:true.

Animation (the app plays it on the canvas and exports it as GIF): use it whenever the user asks for animation, motion, movement, flow, "show the request/data flowing", live, step by step, build-up or emphasis.
- Edge animation: "flow" (marching dashes) for requests and calls along the main path; "dots" (traveling tokens) for data, events, queues and streams; "pulse" for a heartbeat/health link. reverse:true for responses. "Animate it" = flow on the main request path, dots on data/event edges.
- Node animation: "pulse", "glow" or "bounce" to highlight a component ("the failing service", "the bottleneck").
- Step by step: build:true reveals the diagram following the flow; set node/edge step (1, 2, 3…) for a custom order (e.g. numbered request steps). Edges never appear before their ends.`;

const RULES = `Rules:
- Never draw diagrams in prose or code blocks; always use the tools.
- Ids are short unique slugs. No coordinates or sizes: layout is automatic. Containment is expressed only with \`parent\`.
- Labels are concise (a few words); details go in C4 description or class/entity rows.
- direction: TB for flowcharts, C4, class diagrams; LR for pipelines, data flows and cloud architectures.
- Include what the user asked for, at a sensible level of detail (typically 5–30 nodes). Don't add filler.
- Only set style for meaningful emphasis; conventions already give each kind its colors.
- If the request is ambiguous, make reasonable assumptions instead of asking.
- After the tool accepts your submission, answer with at most one short sentence.`;

function iconSection(providers: IconProviderInfo[]): string {
  if (!providers.length)
    return 'Icon packs: none installed. For cloud architectures use container groups with net.* / cylinder / rectangle shapes instead of vendor icons, and do not call search_icons.';
  const list = providers.map((p) => `${p.id} (${p.name}${p.count ? `, ${p.count} icons` : ''})`).join('; ');
  return `Icon packs installed: ${list}.
For cloud architecture requests, call search_icons for every service you will draw (in parallel when possible) and use the returned icon values verbatim; never invent icon paths. If nothing fits, use a net.* or generic shape.`;
}

export function generateSystemPrompt(providers: IconProviderInfo[]): string {
  return `You are the diagram assistant of ArkDraw, a desktop diagramming app. You turn the user's request into a clean, well-structured diagram by calling submit_diagram with a structured spec.

Workflow:
1. Decide the diagram type (${DIAGRAM_TYPES.join(', ')}).
2. Look up vendor icons with search_icons when the diagram shows cloud services.
3. Call submit_diagram once with the complete spec. If it returns errors, fix them and call it again.

${CATALOG}

${iconSection(providers)}

${RULES}`;
}

export function editSystemPrompt(providers: IconProviderInfo[]): string {
  return `You are the diagram assistant of ArkDraw, a desktop diagramming app. The user is working on a diagram and asks you for something: usually a change to it, sometimes a brand-new diagram. The current diagram is sent with the request as JSON (nodes with id, kind, text, icon, parent and box [x, y, w, h]; edges with id, from, to, label).

Workflow:
1. Work out the smallest set of changes that fulfils the request. Nodes/edges marked "selected": true are the user's current selection — "this", "these" and "the selected…" refer to them.
2. Look up vendor icons with search_icons if you add cloud services.
3. Call submit_edits with operations that reference existing ids exactly; new nodes need new unique ids. Removing a node also removes its edges. To animate many edges at once use one animate_edges op (edges: "all" or a list); to play the diagram step by step use set_build (enabled true / false); animation "none" or step 0 removes them.
4. Call submit_diagram with a complete spec instead when the user asks for a new or separate diagram (something unrelated to the current one), or to redo, restructure or re-layout the whole diagram (or the change touches most of it). The user doesn't choose a mode: decide from the request.
If a tool returns errors, fix them and call it again.

${CATALOG}

${iconSection(providers)}

${RULES}`;
}

export function editUserMessage(prompt: string, serializedDoc: string): string {
  return `Current diagram:\n<diagram>\n${serializedDoc}\n</diagram>\n\nRequest: ${prompt}`;
}
