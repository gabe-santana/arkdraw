/**
 * Edit shape (Edit → Edit shape…) and Insert shape (Arrange → Insert → Shape…):
 * an mxGraph stencil XML editor with a live preview.
 *
 * - Stencil shapes: edit their XML; Apply updates the shape (one undo step).
 * - Built-in shapes: offered as a converted stencil when their geometry is
 *   plain SVG; otherwise the dialog explains why and can start from a blank one.
 * - Insert: creates a new custom shape, or saves it to the Scratchpad library.
 */
import { useMemo, useRef, useState } from 'react';
import { BookmarkPlus, FileUp, Info, RotateCcw, TriangleAlert } from 'lucide-react';
import type { ElementStyle, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { createShape, DEFAULT_STYLE } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { viewportCenter } from '@/canvas/viewport';
import { getShapeDef } from '@/shapes/registry';
import { pickAndOpenFile } from '@/io/native';
import { SCRATCHPAD_ID, useUserLibraries } from '@/panels/userLibraries';
import { Dialog, DialogHeader } from '@/ui/Dialog';
import { Button } from '@/ui/Button';
import { useExt } from '@/extensibility/store';
import { parseStencil, splitStencilSet, stencilPoints, StencilError, type Stencil } from './parse';
import { renderStencilXml, STENCIL_KIND } from './shape';
import { stencilFromShape } from './convert';

/** Starting point for Insert → Shape…: a tag with a hole, showing paths, arcs and the save/restore state stack. */
export const SAMPLE_STENCIL = `<shape name="Tag" w="120" h="60" aspect="variable" strokewidth="inherit">
  <connections>
    <constraint x="0" y="0.5" perimeter="1" name="W"/>
    <constraint x="1" y="0.5" perimeter="1" name="E"/>
  </connections>
  <background>
    <path>
      <move x="0" y="8"/>
      <arc rx="8" ry="8" x-axis-rotation="0" large-arc-flag="0" sweep-flag="1" x="8" y="0"/>
      <line x="92" y="0"/>
      <line x="120" y="30"/>
      <line x="92" y="60"/>
      <line x="8" y="60"/>
      <arc rx="8" ry="8" x-axis-rotation="0" large-arc-flag="0" sweep-flag="1" x="0" y="52"/>
      <close/>
    </path>
  </background>
  <foreground>
    <fillstroke/>
    <save/>
    <fillcolor color="#ffffff"/>
    <ellipse x="94" y="25" w="10" h="10"/>
    <fillstroke/>
    <restore/>
  </foreground>
</shape>`;

export function StencilEditorDialog() {
  const state = useExt((s) => s.stencilEditor);
  const target = useEditor((s) => (state?.mode === 'edit' ? s.doc.elements[state.id] : undefined));
  const close = () => useExt.getState().set({ stencilEditor: null });
  const open = !!state && (state.mode === 'insert' || isShape(target));
  return (
    <Dialog open={open} onClose={close} className="w-[860px] max-w-[95vw]">
      {open && <EditorBody key={state?.mode === 'edit' ? state.id : 'insert'} el={isShape(target) ? target : null} close={close} />}
    </Dialog>
  );
}

type Parsed = { ok: true; stencil: Stencil } | { ok: false; error: string };

function parse(xml: string): Parsed {
  try {
    return { ok: true, stencil: parseStencil(xml) };
  } catch (e) {
    return { ok: false, error: e instanceof StencilError ? e.message : String((e as Error).message ?? e) };
  }
}

function EditorBody({ el, close }: { el: ShapeElement | null; close: () => void }) {
  const isStencil = el?.kind === STENCIL_KIND;
  const conversion = useMemo(() => (el && !isStencil ? stencilFromShape(el) : null), [el, isStencil]);
  const initialXml = !el ? SAMPLE_STENCIL : isStencil ? (el.stencil ?? '') : conversion?.ok ? conversion.xml : '';
  const [xml, setXml] = useState(initialXml);
  const parsed = useMemo(() => parse(xml), [xml]);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const toast = useUi((s) => s.toast);
  const style: ElementStyle = el?.style ?? DEFAULT_STYLE;
  const label = el ? getShapeDef(el.kind).label : '';

  const size = (st: Stencil) => {
    const k = Math.min(1, 240 / Math.max(st.w, st.h));
    return { w: Math.max(8, Math.round(st.w * k * 2) / 2), h: Math.max(8, Math.round(st.h * k * 2) / 2) };
  };

  const apply = () => {
    if (!parsed.ok || !el) return;
    useEditor.getState().updateElements({ [el.id]: { kind: STENCIL_KIND, stencil: xml, connectionPoints: stencilPoints(xml) } });
    close();
  };

  const insert = () => {
    if (!parsed.ok) return;
    const { w, h } = size(parsed.stencil);
    const c = viewportCenter();
    const shape = createShape(STENCIL_KIND, { x: Math.round(c.x - w / 2), y: Math.round(c.y - h / 2), w, h });
    shape.stencil = xml;
    shape.connectionPoints = stencilPoints(xml);
    useEditor.getState().addElements([shape]);
    close();
  };

  const saveToLibrary = () => {
    if (!parsed.ok) return;
    const { w, h } = size(parsed.stencil);
    const shape = createShape(STENCIL_KIND, { x: 0, y: 0, w, h });
    shape.stencil = xml;
    shape.connectionPoints = stencilPoints(xml);
    useUserLibraries.getState().addItem(SCRATCHPAD_ID, [shape], parsed.stencil.name || 'Custom shape');
    toast(`Added “${parsed.stencil.name || 'Custom shape'}” to the Scratchpad`, 'success');
  };

  const openFile = async () => {
    const f = await pickAndOpenFile([{ name: 'Stencil XML', extensions: ['xml'] }]);
    if (!f) return;
    try {
      const shapes = splitStencilSet(f.contents);
      if (!shapes.length) throw new Error('No <shape> in this file.');
      setXml(shapes[0].xml);
      if (shapes.length > 1) toast(`Loaded the first of ${shapes.length} shapes. Import the file as a library to get all of them.`);
    } catch (e) {
      toast(String((e as Error).message ?? e), 'error');
    }
  };

  // Tab inserts two spaces instead of leaving the editor.
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = ta;
    const next = xml.slice(0, a) + '  ' + xml.slice(b);
    setXml(next);
    requestAnimationFrame(() => areaRef.current?.setSelectionRange(a + 2, a + 2));
  };

  const title = el ? 'Edit shape' : 'Insert shape';
  const subtitle = el ? (isStencil ? 'mxGraph stencil XML — compatible with draw.io custom shapes' : `${label} is a built-in shape`) : 'Describe a shape in mxGraph stencil XML (the format draw.io uses)';
  const lines = xml.split('\n').length;

  return (
    <div onKeyDown={(e) => e.stopPropagation()}>
      <DialogHeader title={title} subtitle={subtitle} onClose={close} />
      {el && !isStencil && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-panel-2 px-3 py-2.5 text-[12.5px] text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" />
          {conversion?.ok ? (
            <span>
              Built-in shapes are drawn in code. Applying converts this one into an editable <b className="font-medium text-fg">custom shape</b> at its current proportions; text, style and connections are kept.
            </span>
          ) : (
            <span>
              {conversion?.ok === false ? conversion.reason : ''} You can still replace it with a custom shape written from scratch.{' '}
              <button className="font-medium text-accent hover:underline" onClick={() => setXml(SAMPLE_STENCIL)}>
                Start from a sample
              </button>
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-[1fr_280px] gap-4 px-5 pb-4">
        <div className="relative flex h-[400px] overflow-hidden rounded-xl bg-panel-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent/40">
          <div aria-hidden className="pointer-events-none select-none overflow-hidden py-3 pl-3 pr-2 text-right font-mono text-[11.5px] leading-[1.6] text-subtle">
            <div style={{ transform: `translateY(${-(areaRef.current?.scrollTop ?? 0)}px)` }} id="od-stencil-gutter">
              {Array.from({ length: lines }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          </div>
          <textarea
            ref={areaRef}
            value={xml}
            onChange={(e) => setXml(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={(e) => {
              const g = document.getElementById('od-stencil-gutter');
              if (g) g.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`;
            }}
            spellCheck={false}
            wrap="off"
            placeholder="<shape name=… w=… h=…>…</shape>"
            aria-label="Stencil XML"
            className="scroll-thin h-full flex-1 resize-none bg-transparent py-3 pr-3 font-mono text-[11.5px] leading-[1.6] text-fg outline-none"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="diagram-adapt-tile flex h-[280px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(var(--panel-2)_0_25%,var(--panel)_0_50%)] bg-[length:16px_16px] ring-1 ring-line">
            {parsed.ok ? (
              (() => {
                const { w, h } = size(parsed.stencil);
                const pad = Math.max(4, style.strokeWidth * 2);
                return (
                  <svg width={w + pad * 2} height={h + pad * 2} viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`} role="img" aria-label="Preview">
                    {renderStencilXml(xml, w, h, style)}
                    {parsed.stencil.connections.map((c, i) => (
                      <path key={i} d={`M${c.x * w - 3},${c.y * h - 3} l6,6 m0,-6 l-6,6`} stroke="#5b5bf6" strokeWidth={1.25} opacity={0.75} />
                    ))}
                  </svg>
                );
              })()
            ) : (
              <span className="px-4 text-center text-[12px] text-subtle">{xml.trim() ? 'Fix the XML to see a preview' : 'Nothing to preview'}</span>
            )}
          </div>
          {parsed.ok ? (
            <div className="space-y-1 px-1 text-[12px] text-muted">
              <div>
                <span className="font-medium text-fg">{parsed.stencil.name || 'Untitled'}</span> · {parsed.stencil.w}×{parsed.stencil.h} · {parsed.stencil.aspect} aspect
              </div>
              <div>
                {parsed.stencil.connections.length} connection point{parsed.stencil.connections.length === 1 ? '' : 's'} · stroke {parsed.stencil.strokewidth === 'inherit' ? 'from style' : parsed.stencil.strokewidth}
              </div>
              {parsed.stencil.unsupported.length > 0 && (
                <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  Ignored: {[...new Set(parsed.stencil.unsupported)].join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-1.5 px-1 text-[12px] text-danger">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {parsed.error}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-line px-5 py-3">
        <Button size="sm" variant="ghost" icon={<FileUp className="size-3.5" />} onClick={() => void openFile()}>
          Open XML…
        </Button>
        {xml !== initialXml && initialXml && (
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={() => setXml(initialXml)}>
            Revert
          </Button>
        )}
        <div className="flex-1" />
        <Button onClick={close}>Cancel</Button>
        {el ? (
          <Button variant="primary" disabled={!parsed.ok} onClick={apply}>
            {isStencil ? 'Apply' : 'Convert & apply'}
          </Button>
        ) : (
          <>
            <Button disabled={!parsed.ok} icon={<BookmarkPlus className="size-3.5" />} onClick={saveToLibrary}>
              Add to Scratchpad
            </Button>
            <Button variant="primary" disabled={!parsed.ok} onClick={insert}>
              Insert
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
