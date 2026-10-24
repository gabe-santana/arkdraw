/**
 * SVG → editable shapes, app side: the "Insert as image / Convert to shapes"
 * choice offered when an SVG is dropped, pasted or picked, and
 * Arrange › Insert › SVG as shapes…. The conversion itself is the pure
 * `convertSvg` in src/io/import/svgShapes.ts.
 *
 * The choice dialog mounts itself on first use (like PromptDialog), so no App
 * wiring is needed.
 */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { create } from 'zustand';
import type { Vec } from '@/model/types';
import { Dialog } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { Switch } from '@/ui/controls';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { viewportCenter } from '@/canvas/viewport';
import { convertSvg, SVG_IMPORT_MESSAGES } from '@/io/import/svgShapes';
import { t, tx, useT } from '@/i18n';

/** User-facing strings, in the UI language (src/i18n/en/svgImport.ts). */
export const SVG_IMPORT_UI = {
  get title() {
    return t('svgImport.title');
  },
  message: (name: string) => t('svgImport.message', { name }),
  get unnamed() {
    return t('svgImport.unnamed');
  },
  get perGroup() {
    return t('svgImport.perGroup');
  },
  get cancel() {
    return t('common.cancel');
  },
  get asImage() {
    return t('svgImport.asImage');
  },
  get convert() {
    return t('svgImport.convert');
  },
  converted: (n: number) => t('svgImport.converted', { count: n }),
  get pickTitle() {
    return t('svgImport.pickTitle');
  },
};

/** A conversion message (an SVG_IMPORT_MESSAGES value) in the UI language. */
const importMessage = (text: string): string => {
  const key = (Object.keys(SVG_IMPORT_MESSAGES) as Array<keyof typeof SVG_IMPORT_MESSAGES>).find((k) => SVG_IMPORT_MESSAGES[k] === text);
  return key ? tx(`svgImport.msg.${key}`, text) : text;
};

/** Largest side of a converted drawing, in px (bigger SVGs are scaled down). */
const FIT = 800;

export type SvgImportMode = 'path' | 'group';
type Choice = { action: 'image' } | { action: 'shapes'; mode: SvgImportMode };

const useChoice = create<{ req: { name: string; resolve: (c: Choice | null) => void } | null }>(() => ({ req: null }));
let mounted = false;

/** Asks how to insert an SVG. Null when cancelled. */
export function chooseSvgImport(name?: string): Promise<Choice | null> {
  if (!mounted && typeof document !== 'undefined') {
    mounted = true;
    const host = document.createElement('div');
    host.dataset.odSvgImport = '';
    document.body.appendChild(host);
    createRoot(host).render(<ChoiceHost />);
  }
  useChoice.getState().req?.resolve(null);
  return new Promise((resolve) => {
    useChoice.setState({
      req: {
        name: name ? `“${name}”` : SVG_IMPORT_UI.unnamed,
        resolve: (c) => {
          useChoice.setState({ req: null });
          resolve(c);
        },
      },
    });
  });
}

const MODE_KEY = 'opendraw:svgImportMode';
const loadMode = (): SvgImportMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'group' ? 'group' : 'path';
  } catch {
    return 'path';
  }
};

function ChoiceHost() {
  const req = useChoice((s) => s.req);
  return (
    <Dialog open={!!req} onClose={() => req?.resolve(null)} className="w-[440px] max-w-[94vw]" labelledBy="od-svg-import-title">
      {req && <ChoiceBody req={req} />}
    </Dialog>
  );
}

function ChoiceBody({ req }: { req: NonNullable<ReturnType<typeof useChoice.getState>['req']> }) {
  useT(); // re-render on language change
  const [perGroup, setPerGroup] = useState(() => loadMode() === 'group');
  const primary = useRef<HTMLButtonElement>(null);
  // Dialog focuses the first control (the switch); Enter should convert.
  useEffect(() => {
    const t = setTimeout(() => primary.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);
  const convert = () => {
    const mode: SvgImportMode = perGroup ? 'group' : 'path';
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* private mode */
    }
    req.resolve({ action: 'shapes', mode });
  };
  return (
    <div className="p-5">
      <h2 id="od-svg-import-title" className="text-[15px] font-semibold tracking-tight text-fg">
        {SVG_IMPORT_UI.title}
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{SVG_IMPORT_UI.message(req.name)}</p>
      <div className="mt-4">
        <Switch label={SVG_IMPORT_UI.perGroup} checked={perGroup} onChange={setPerGroup} />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <Button onClick={() => req.resolve(null)}>{SVG_IMPORT_UI.cancel}</Button>
        <div className="flex-1" />
        <Button onClick={() => req.resolve({ action: 'image' })}>{SVG_IMPORT_UI.asImage}</Button>
        <Button ref={primary} variant="primary" onClick={convert}>
          {SVG_IMPORT_UI.convert}
        </Button>
      </div>
    </div>
  );
}

/** Converts SVG markup and adds the shapes (one undo step, selected), centred on `at`. */
export function insertSvgAsShapes(svg: string, at?: Vec, mode: SvgImportMode = 'path'): boolean {
  const ui = useUi.getState();
  let result;
  try {
    result = convertSvg(svg, { mode, fit: FIT, center: at ?? viewportCenter() });
  } catch {
    ui.toast(importMessage(SVG_IMPORT_MESSAGES.invalid), 'error');
    return false;
  }
  if (!result.elements.length) {
    ui.toast(importMessage(SVG_IMPORT_MESSAGES.empty), 'error');
    return false;
  }
  useEditor.getState().addElements(result.elements);
  ui.toast([SVG_IMPORT_UI.converted(result.elements.length), ...result.warnings.map(importMessage)].join(' '), result.warnings.length ? 'info' : 'success');
  return true;
}

const isSvgBlob = (file: File | Blob) => file.type === 'image/svg+xml' || ('name' in file && /\.svg$/i.test(file.name));

/**
 * For an SVG file: asks image vs. shapes and converts when chosen.
 * Returns true when handled (converted or cancelled); false to insert it as an image.
 */
export async function offerSvgConvert(file: File | Blob, at?: Vec): Promise<boolean> {
  if (!isSvgBlob(file)) return false;
  const choice = await chooseSvgImport('name' in file ? file.name : undefined);
  if (!choice) return true;
  if (choice.action === 'image') return false;
  insertSvgAsShapes(await file.text(), at, choice.mode);
  return true;
}

/** Pasted SVG markup: same choice; "image" inserts it as an SVG image. Always handled. */
export async function offerSvgText(svg: string, at?: Vec): Promise<boolean> {
  const choice = await chooseSvgImport();
  if (!choice) return true;
  if (choice.action === 'shapes') {
    insertSvgAsShapes(svg, at, choice.mode);
    return true;
  }
  const { insertImageFile } = await import('./commands');
  await insertImageFile(new Blob([svg], { type: 'image/svg+xml' }), at, true);
  return true;
}

/** Arrange › Insert › SVG as shapes…: picks a file and converts it directly. */
export function pickSvgAsShapes() {
  const at = viewportCenter();
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.svg,image/svg+xml' });
  input.onchange = async () => {
    const f = input.files?.[0];
    if (f) insertSvgAsShapes(await f.text(), at, loadMode());
  };
  input.click();
}
