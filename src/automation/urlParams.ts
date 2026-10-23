/**
 * URL parameters for the web editor (parsed in src/web/launch.ts):
 *
 *   ?lang=de        UI language for the session (read by src/i18n at startup) and document language:
 *                   <html lang>, spell checking and dictation
 *   ?libs=general;uml   shape libraries to show expanded in the Shapes panel
 *   ?clibs=Uhttps%3A%2F%2F…;…   custom library URLs (mxGraph `.xml` / `.opendrawlib`) to load
 *   ?grid=0|1       grid off / on for this session
 *   ?math=1         typeset labels that contain LaTeX ($$…$$, \(…\)) in every opened diagram
 *   ?ui=dark|light|atlas|kennedy|min|simple|sketch   theme, or a minimal layout (panels hidden)
 */
import type { Doc, Page } from '@/model/types';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import type { LaunchParams } from '@/web/launch';
import { withoutOriginTracking } from '@/storage/origin';
import { loadLibraryUrls, resolveLibraryIds, showOnlyLibraries } from './configuration';
import { t } from '@/i18n';

const MATH_RE = /\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)/;

/** Turns on `math` for labels that contain LaTeX delimiters. Returns the same doc if nothing changes. */
export function enableMathLabels(doc: Doc): Doc {
  let elements = doc.elements;
  for (const id of doc.order) {
    const el = elements[id];
    if (!el || el.style.math || !MATH_RE.test(el.text)) continue;
    if (elements === doc.elements) elements = { ...doc.elements };
    elements[id] = { ...el, style: { ...el.style, math: true } } as typeof el;
  }
  return elements === doc.elements ? doc : { ...doc, elements };
}

/** Applies `enableMathLabels` to every loaded document, keeping clean files clean. */
function installMathOnLoad(): () => void {
  let busy = false;
  const apply = () => {
    const s = useEditor.getState();
    const pages: Page[] = s.allPages().map((p) => ({ ...p, doc: enableMathLabels(p.doc) }));
    if (pages.every((p, i) => p.doc === s.allPages()[i].doc)) return;
    const savedDocs = { ...s.file.savedDocs };
    const before = s.allPages();
    pages.forEach((p, i) => {
      if (savedDocs[p.id] === before[i].doc) savedDocs[p.id] = p.doc;
    });
    const active = pages.find((p) => p.id === s.activePageId)!;
    busy = true;
    withoutOriginTracking(() =>
      useEditor.setState({
        pages,
        doc: active.doc,
        file: { ...s.file, savedDocs, savedDoc: s.file.savedDoc === s.doc ? active.doc : s.file.savedDoc },
      }),
    );
    busy = false;
  };
  apply();
  return useEditor.subscribe((s, prev) => {
    if (busy || s.pages === prev.pages || s.file.savedDocs === prev.file.savedDocs) return;
    apply();
  });
}

export function applyLaunchOptions(launch: Pick<LaunchParams, 'lang' | 'libs' | 'clibs' | 'grid' | 'math' | 'ui'>) {
  // The UI language itself was already applied by initI18n() (src/main.tsx).
  if (launch.lang) document.documentElement.lang = launch.lang;
  if (launch.libs) showOnlyLibraries(resolveLibraryIds(launch.libs));
  if (launch.clibs.length) {
    void loadLibraryUrls(launch.clibs).then(({ added, failed }) => {
      const ui = useUi.getState();
      if (added) ui.toast(t('automation.urlParams.librariesLoaded', { count: added }), 'success');
      if (failed.length) ui.toast(t('automation.librariesFailed', { count: failed.length }), 'error');
    });
  }
  if (launch.grid !== null) {
    // Session only: not written to the saved defaults.
    const s = useEditor.getState();
    useEditor.setState({ settings: { ...s.settings, grid: launch.grid } });
  }
  if (launch.math) installMathOnLoad();
  switch (launch.ui) {
    case 'dark':
      useUi.setState({ theme: 'dark' });
      break;
    case 'light':
    case 'atlas':
    case 'kennedy':
      useUi.setState({ theme: 'light' });
      break;
    case 'min':
    case 'simple':
    case 'sketch':
      useUi.setState({ leftOpen: false, rightOpen: false });
      break;
  }
}
