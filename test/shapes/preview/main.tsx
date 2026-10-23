/**
 * Dev-only contact sheet of every shape library:
 *   npx vite --port 5299  →  http://localhost:5299/test/shapes/preview/index.html
 * Params: `?lib=bpmn,arrows` filters libraries; `?full` renders items at their
 * natural size with preset text (instead of thumbnails); `?size=38` sets the tile size.
 */
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { LIBRARIES } from '@/shapes/libraries';
import { ShapePreview } from '@/panels/ShapePreview';
import { ShapeBody, SvgDefs } from '@/canvas/ElementBodies';
import { DEFAULT_STYLE } from '@/model/defaults';
import type { LibraryItem } from '@/shapes/types';

const params = new URLSearchParams(location.search);
const only = params.get('lib')?.split(',');
const size = Number(params.get('size') ?? 64);
const full = params.has('full');
const scale = Number(params.get('scale') ?? 1);
const libs = LIBRARIES.filter((l) => !only || only.includes(l.id));

function Full({ item }: { item: LibraryItem }) {
  const pad = 70;
  return (
    <svg width={item.w + pad * 2} height={item.h + pad} viewBox={`${-pad} ${-10} ${item.w + pad * 2} ${item.h + pad}`}>
      <SvgDefs />
      <ShapeBody
        el={{ id: 'p', type: 'shape', kind: item.kind, x: 0, y: 0, w: item.w, h: item.h, text: item.text ?? item.label, style: { ...DEFAULT_STYLE, ...item.style }, groupIds: [] }}
      />
    </svg>
  );
}

function Sheet() {
  return (
    <div style={{ padding: 16, background: '#fff', color: '#0f172a', fontFamily: 'Inter, sans-serif', height: `${100 / scale}vh`, overflow: 'auto', zoom: scale }}>
      {libs.map((lib) => (
        <section key={lib.id} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 6px' }}>
            {lib.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({lib.items.length})</span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: full ? 12 : 6, alignItems: 'flex-end' }}>
            {lib.items.map((item, i) => (
              <figure key={i} style={{ margin: 0, width: full ? undefined : size + 26, textAlign: 'center' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 4, display: 'inline-block' }}>
                  {full ? <Full item={item} /> : <ShapePreview item={item} size={size} />}
                </div>
                <figcaption style={{ fontSize: 9, color: '#64748b', lineHeight: 1.1, marginTop: 2, overflow: 'hidden', maxHeight: 20 }}>{item.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Sheet />);
