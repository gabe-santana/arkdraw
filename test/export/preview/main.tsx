/**
 * Dev-only harness for the Export dialog and exporters, isolated from the app
 * (no recovery / autosave):  http://localhost:1420/test/export/preview/index.html
 * Params: `?dark` dark UI, `?pages=3` page count. `window.__exportPreview` exposes
 * the export modules for scripted checks.
 */
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { ExportDialog } from '@/chrome/ExportDialog';
import { Toasts } from '@/chrome/Overlays';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { createShape } from '@/model/defaults';
import * as exporters from '@/io/export';
import { exportHtml } from '@/io/export/html';
import { samplePages } from '../fixtures';

const params = new URLSearchParams(location.search);
if (params.has('dark')) document.documentElement.classList.add('dark');
const pages = samplePages(Number(params.get('pages') ?? 3));
const icon = createShape('icon', { x: 420, y: 0, w: 64, h: 64 }, {}, 'Athena');
icon.icon = 'aws/analytics/amazon-athena.svg';
icon.tooltip = 'Query service';
pages[0].doc.elements[icon.id] = icon;
pages[0].doc.order.push(icon.id);
pages[0].doc.elements[pages[0].doc.order[0]] = { ...pages[0].doc.elements[pages[0].doc.order[0]], link: 'page:page-2', tooltip: 'Go to page 2' };
pages[1].doc.layers = [
  { id: 'l1', name: 'Base', visible: true, locked: false },
  { id: 'l2', name: 'Notes', visible: true, locked: false },
];
pages[1].doc.elements[pages[1].doc.order[3]] = { ...pages[1].doc.elements[pages[1].doc.order[3]], layerId: 'l2' };
useEditor.getState().loadPages(pages, { path: null, name: 'Architecture.arkdraw' });
useUi.getState().set({ exportOpen: true });
Object.assign(window, { __exportPreview: { ...exporters, exportHtml, useEditor, useUi } });

createRoot(document.getElementById('root')!).render(
  <div className="h-full bg-app">
    <ExportDialog />
    <Toasts />
  </div>,
);
