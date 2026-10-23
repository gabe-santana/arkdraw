import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useEditor } from './store/editor';
import { useUi } from './store/ui';
import { isTauri } from './lib/platform';
import { bootWeb } from './web/boot';
import './index.css';

// Dev-only handle for debugging and end-to-end scripting.
if (import.meta.env.DEV) Object.assign(window, { __opendraw: { useEditor, useUi, ai: () => import('./ai') } });

const root = createRoot(document.getElementById('root')!);
const editor = (
  <StrictMode>
    <App />
  </StrictMode>
);
// Web builds: viewer/embed modes, share links and the service worker (never in the desktop app).
if (isTauri()) root.render(editor);
else bootWeb(root, editor);
