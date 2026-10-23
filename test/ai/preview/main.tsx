/**
 * Dev-only harness to look at the AI panel without the editor:
 *   npx vite --port 5199  →  http://localhost:5199/test/ai/preview/index.html
 * Add `?mock` to script a fake Anthropic conversation (no key/network needed).
 */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { AiPanel, type AiHostApi } from '@/ai';
import { saveKey } from '@/ai/transport';
import { getShapeDef, textBoxOf } from '@/shapes/registry';
import { TextBlock } from '@/shapes/TextLines';
import { isConnector, isShape, type DiagramElement, type Doc } from '@/model/types';
import { wrapText } from '@/lib/text';
import { TextLines } from '@/shapes/TextLines';

const params = new URLSearchParams(location.search);
if (params.has('dark')) document.documentElement.classList.add('dark');

if (params.has('mock')) {
  void saveKey('anthropic', 'sk-ant-mock');
  const realFetch = window.fetch.bind(window);
  let step = 0;
  const icon = (f: string) => `aws/${f}`;
  const script = () => [
    {
      content: [
        { type: 'text', text: '' },
        { type: 'tool_use', id: 't1', name: 'search_icons', input: { query: 'Application Load Balancer', provider: 'aws' } },
        { type: 'tool_use', id: 't2', name: 'search_icons', input: { query: 'EC2', provider: 'aws' } },
        { type: 'tool_use', id: 't3', name: 'search_icons', input: { query: 'RDS', provider: 'aws' } },
        { type: 'tool_use', id: 't4', name: 'search_icons', input: { query: 'S3', provider: 'aws' } },
      ],
      stop_reason: 'tool_use',
    },
    {
      content: [
        { type: 'text', text: 'A classic three-tier layout across two availability zones.' },
        {
          type: 'tool_use',
          id: 't5',
          name: 'submit_diagram',
          input: {
            type: 'cloud',
            direction: 'LR',
            title: 'AWS 3-tier web app',
            nodes: [
              { id: 'users', kind: 'net.user', text: 'Users' },
              { id: 'cloud', kind: 'container', text: 'AWS Cloud' },
              { id: 'region', kind: 'container', text: 'Region us-east-1', parent: 'cloud' },
              { id: 'vpc', kind: 'container', text: 'VPC 10.0.0.0/16', parent: 'region' },
              { id: 'pub', kind: 'container', text: 'Public subnet', parent: 'vpc' },
              { id: 'app', kind: 'container', text: 'Private subnet (app)', parent: 'vpc' },
              { id: 'data', kind: 'container', text: 'Private subnet (data)', parent: 'vpc' },
              { id: 'alb', kind: 'icon', text: 'Application Load Balancer', icon: icon('networking-content-delivery/elastic-load-balancing-application-load-balancer.svg'), parent: 'pub' },
              { id: 'web1', kind: 'icon', text: 'App server A', icon: icon('compute/amazon-ec2.svg'), parent: 'app' },
              { id: 'web2', kind: 'icon', text: 'App server B', icon: icon('compute/amazon-ec2.svg'), parent: 'app' },
              { id: 'db', kind: 'icon', text: 'RDS PostgreSQL', icon: icon('databases/amazon-rds.svg'), parent: 'data' },
              { id: 's3', kind: 'icon', text: 'Static assets', icon: icon('storage/amazon-simple-storage-service.svg'), parent: 'region' },
            ],
            edges: [
              { from: 'users', to: 'alb', label: 'HTTPS' },
              { from: 'alb', to: 'web1' },
              { from: 'alb', to: 'web2' },
              { from: 'web1', to: 'db', label: 'SQL' },
              { from: 'web2', to: 'db', label: 'SQL' },
              { from: 'web1', to: 's3' },
            ],
          },
        },
      ],
      stop_reason: 'tool_use',
    },
  ];
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('https://api.anthropic.com/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'claude-opus-5-5' }, { id: 'claude-sonnet-5-5' }] }));
    if (url.startsWith('https://api.anthropic.com/v1/messages')) {
      await new Promise((r) => setTimeout(r, 900));
      const turns = script();
      const body = turns[Math.min(step, turns.length - 1)];
      step = (step + 1) % turns.length;
      return new Response(JSON.stringify(body));
    }
    return realFetch(input, init);
  };
}

function MiniCanvas({ doc }: { doc: Doc }) {
  const els = doc.order.map((id) => doc.elements[id]);
  const shapes = els.filter(isShape);
  if (!shapes.length) return <div className="grid h-full place-items-center text-muted">Canvas is empty</div>;
  const minX = Math.min(...shapes.map((s) => s.x)) - 40;
  const minY = Math.min(...shapes.map((s) => s.y)) - 40;
  const maxX = Math.max(...shapes.map((s) => s.x + s.w)) + 40;
  const maxY = Math.max(...shapes.map((s) => s.y + s.h)) + 60;
  const byId = new Map(shapes.map((s) => [s.id, s]));
  return (
    <svg className="diagram-adapt h-full w-full" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}>
      {els.map((el: DiagramElement) => {
        if (isConnector(el)) {
          const a = el.source.elementId ? byId.get(el.source.elementId) : undefined;
          const b = el.target.elementId ? byId.get(el.target.elementId) : undefined;
          const p1 = a ? { x: a.x + a.w / 2, y: a.y + a.h / 2 } : el.source;
          const p2 = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : el.target;
          return (
            <g key={el.id}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#64748b" strokeDasharray={el.style.strokeStyle === 'dashed' ? '6 4' : undefined} />
              {el.text && (
                <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 4} fontSize={11} textAnchor="middle" fill="#334155">
                  {el.text}
                </text>
              )}
            </g>
          );
        }
        const def = getShapeDef(el.kind);
        const placement = def.textPlacement ?? 'inside';
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`}>
            {def.render({ w: el.w, h: el.h, style: el.style, text: el.text, icon: el.icon })}
            {placement === 'inside' && <TextBlock box={textBoxOf(def, el.w, el.h)} text={el.text} style={el.style} />}
            {placement === 'below' && el.text && (
              <TextLines lines={wrapText(el.text, 150, el.style)} x={el.w / 2} y={el.h + 4} anchor="middle" style={el.style} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function App() {
  const [doc, setDoc] = useState<Doc>({ elements: {}, order: [] });
  const host: AiHostApi = useMemo(
    () => ({
      getDoc: () => doc,
      getSelection: () => [],
      insertElements: (els) =>
        setDoc((d) => ({ elements: { ...d.elements, ...Object.fromEntries(els.map((e) => [e.id, e])) }, order: [...d.order, ...els.map((e) => e.id)] })),
      replaceDoc: (els) => setDoc({ elements: Object.fromEntries(els.map((e) => [e.id, e])), order: els.map((e) => e.id) }),
      getViewportCenter: () => ({ x: 0, y: 0 }),
    }),
    [doc],
  );
  return (
    <div className="flex h-full gap-3 bg-app p-3">
      <div className="flex-1 overflow-hidden rounded-xl bg-canvas shadow-panel">
        <MiniCanvas doc={doc} />
      </div>
      <div className="w-[380px] overflow-hidden rounded-xl shadow-panel">
        <AiPanel host={host} onClose={() => {}} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
