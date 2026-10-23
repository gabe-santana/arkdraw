/**
 * Dev-only harness for the template gallery:
 *   http://localhost:1420/test/templates/preview/index.html            → contact sheet of every template
 *   …?t=aws-3-tier,kanban                                               → only these templates (full size)
 *   …?cat=Cloud                                                         → one category
 *   …?dialog                                                            → the TemplatesDialog itself
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { TEMPLATES } from '@/templates';
import { renderSvg, inlineIcons, exportSubset } from '@/io/export/svg';
import { useUi } from '@/store/ui';
import { useEditor } from '@/store/editor';
import { TemplatesDialog } from '@/chrome/TemplatesDialog';
import type { Page } from '@/model/types';

const params = new URLSearchParams(location.search);
const only = params.get('t')?.split(',');
const cat = params.get('cat');
const scale = Number(params.get('scale') ?? (only ? 1 : 0.35));

function PageImg({ page }: { page: Page }) {
  const [src, setSrc] = useState('');
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    let live = true;
    inlineIcons(exportSubset(page.doc)).then((resolve) => {
      const r = renderSvg(page.doc, { background: '#ffffff', padding: 24 }, resolve);
      if (live) {
        setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg)}`);
        setSize({ w: r.width, h: r.height });
      }
    });
    return () => {
      live = false;
    };
  }, [page]);
  return src ? <img src={src} width={size.w * scale} height={size.h * scale} style={{ border: '1px solid #e2e8f0', borderRadius: 6 }} /> : null;
}

function Sheet() {
  const list = TEMPLATES.filter((t) => (!only || only.includes(t.id)) && (!cat || t.category === cat));
  return (
    <div style={{ padding: 16, background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, sans-serif', height: '100vh', overflow: 'auto' }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{TEMPLATES.length} templates</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {list.map((t) => {
          let pages: Page[] = [];
          let err = '';
          try {
            pages = t.build();
          } catch (e) {
            err = String(e);
          }
          return (
            <section key={t.id} style={{ background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 0 0 1px #e2e8f0' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>
                {t.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {t.category} · {t.id}</span>
              </h2>
              {err && <pre style={{ color: 'red' }}>{err}</pre>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {pages.map((p) => (
                  <PageImg key={p.id} page={p} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function DialogHarness() {
  useEffect(() => {
    useUi.getState().set({ templatesOpen: true });
  }, []);
  return (
    <div className="h-screen bg-app">
      <button className="m-4 rounded bg-accent px-3 py-1 text-accent-fg" onClick={() => useUi.getState().set({ templatesOpen: true })}>
        Open templates
      </button>
      <TemplatesDialog />
    </div>
  );
}

Object.assign(window, { __harness: { useEditor, useUi } });
const theme = params.get('theme');
if (theme === 'dark') document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(params.has('dialog') ? <DialogHarness /> : <Sheet />);
