import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useEditor } from './store/editor';
import { useUi } from './store/ui';
import { isTauri } from './lib/platform';
import { bootWeb } from './web/boot';
import { initI18n } from './i18n';
import './index.css';

// Dev-only handle for debugging and end-to-end scripting.
if (import.meta.env.DEV) Object.assign(window, { __arkdraw: { useEditor, useUi, ai: () => import('./ai'), i18n: () => import('./i18n') } });

const root = createRoot(document.getElementById('root')!);
const editor = (
  <StrictMode>
    <App />
  </StrictMode>
);
// Load the UI language first (English is bundled; others are a small lazy chunk).
void initI18n().finally(() => {
  // Web builds: viewer/embed modes, share links and the service worker (never in the desktop app).
  if (isTauri()) root.render(editor);
  else bootWeb(root, editor);
});
