/**
 * Table cell selection and in-place cell editing. With a table selected,
 * a click picks a cell (Shift-click extends to a range), double-click or
 * Enter types into it; Tab / Shift+Tab move to the next / previous cell
 * while typing and Enter commits and moves down.
 */
import { useLayoutEffect, useRef } from 'react';
import type { ElementStyle, ShapeElement } from '@/model/types';
import { isShape } from '@/model/types';
import { fontStack } from '@/text/fonts';
import { LINE_HEIGHT } from '@/lib/text';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { useInteraction } from './store';
import { cellKey, cellRect, cellsInRange, isCovered, rangeBounds } from './table';
import { commitCellText, selectCell, startCellEdit } from './tableCells';
import { takeCellSeed } from './navigation';
import { Camera } from './PointEditor';

const ACCENT = 'var(--selection)';

function useSelectedTable(): ShapeElement | null {
  return useEditor((s) => {
    if (s.selection.length !== 1 || s.editingId) return null;
    const el = s.doc.elements[s.selection[0]];
    return isShape(el) && el.table ? el : null;
  });
}

export function TableCellOverlay() {
  const el = useSelectedTable();
  const cell = useInteraction((s) => s.cell);
  const z = useEditor((s) => s.camera.z);
  const dragging = useEditor((s) => !!s.interactionBase);
  if (!el?.table || el.locked) return null;
  const t = el.table;
  const px = 1 / z;
  const inset = 5 * px;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const sel = cell && cell.id === el.id ? rangeBounds(t, cell.r, cell.c, cell.r2, cell.c2) : null;
  const selRect = sel
    ? (() => {
        const a = cellRect(t, el.w, el.h, sel.top, sel.left);
        const b = cellRect(t, el.w, el.h, sel.bottom, sel.right);
        return { x: a.x, y: a.y, w: b.x + b.w - a.x, h: b.y + b.h - a.y };
      })()
    : null;
  const anchors = cellsInRange(t, 0, 0, t.rows.length - 1, t.cols.length - 1);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
      <Camera>
        <g transform={`${el.rotation ? `rotate(${el.rotation} ${cx} ${cy}) ` : ''}translate(${el.x} ${el.y})`}>
          {selRect && <rect x={selRect.x} y={selRect.y} width={selRect.w} height={selRect.h} fill="var(--accent-soft)" stroke={ACCENT} strokeWidth={2 * px} />}
          {!dragging &&
            anchors.map(([r, c]) => {
              const b = cellRect(t, el.w, el.h, r, c);
              return (
                <rect
                  key={cellKey(r, c)}
                  data-el={el.id}
                  data-cell={cellKey(r, c)}
                  x={b.x + Math.min(inset, b.w / 4)}
                  y={b.y + Math.min(inset, b.h / 4)}
                  width={Math.max(1, b.w - 2 * Math.min(inset, b.w / 4))}
                  height={Math.max(1, b.h - 2 * Math.min(inset, b.h / 4))}
                  fill="transparent"
                  style={{ pointerEvents: 'all', cursor: 'cell' }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    if (e.shiftKey) {
                      // Shift-click extends the cell range instead of toggling the table's selection.
                      e.stopPropagation();
                      selectCell(el.id, r, c, true);
                    } else selectCell(el.id, r, c);
                  }}
                />
              );
            })}
        </g>
      </Camera>
    </svg>
  );
}

/** contentEditable box over the cell being edited. */
export function TableCellEditor() {
  const editing = useInteraction((s) => s.editingCell);
  const el = useEditor((s) => (editing ? s.doc.elements[editing.id] : undefined));
  const camera = useEditor((s) => s.camera);
  const adapt = useEditor((s) => s.settings.adaptColors);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !editing || !isShape(el) || !el.table) return;
    done.current = false;
    const seed = takeCellSeed();
    node.innerText = seed ?? el.table.cells[editing.r]?.[editing.c] ?? '';
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    if (seed !== null) range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, editing?.r, editing?.c]);

  if (!editing || !isShape(el) || !el.table || editing.r >= el.table.rows.length || editing.c >= el.table.cols.length) return null;
  const t = el.table;
  const b = cellRect(t, el.w, el.h, editing.r, editing.c);
  const cs = t.cellStyles?.[cellKey(editing.r, editing.c)];
  const style: ElementStyle = { ...el.style, ...(t.header && editing.r === 0 ? { bold: true } : {}), ...cs } as ElementStyle;
  const z = camera.z;
  const left = (el.x + b.x) * z + camera.x;
  const top = (el.y + b.y) * z + camera.y;
  const origin = { x: (el.x + el.w / 2) * z + camera.x - left, y: (el.y + el.h / 2) * z + camera.y - top };

  const commit = () => {
    if (done.current) return;
    done.current = true;
    commitCellText(editing.id, editing.r, editing.c, (ref.current?.innerText ?? '').replace(/\n$/, ''));
    useInteraction.getState().set({ editingCell: null });
  };
  /** Next anchor cell in reading order (skipping merged-over cells). */
  const step = (dir: 1 | -1) => {
    let r = editing.r;
    let c = editing.c;
    for (let i = 0; i < t.rows.length * t.cols.length; i++) {
      c += dir;
      if (c >= t.cols.length) [r, c] = [r + 1, 0];
      if (c < 0) [r, c] = [r - 1, t.cols.length - 1];
      if (r < 0 || r >= t.rows.length) return null;
      if (!isCovered(t, r, c)) return { r, c };
    }
    return null;
  };

  return (
    <div
      data-text-editor
      className={cn('absolute', adapt && 'diagram-adapt')}
      style={{
        left,
        top,
        width: b.w * z,
        minHeight: b.h * z,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: `${2 * z}px ${6 * z}px`,
        // Opaque so the rendered cell text doesn't show through while typing.
        background: cs?.fill ?? (el.style.fill && el.style.fill !== 'none' ? el.style.fill : 'var(--canvas)'),
        boxShadow: `inset 0 0 0 2px ${ACCENT}`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: `${origin.x}px ${origin.y}px`,
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={ref}
        role="textbox"
        aria-label={`Cell row ${editing.r + 1}, column ${editing.c + 1}`}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
            const r = Math.min(t.rows.length - 1, editing.r + 1);
            selectCell(editing.id, r, editing.c);
          } else if (e.key === 'Tab') {
            e.preventDefault();
            const next = step(e.shiftKey ? -1 : 1);
            commit();
            if (next) startCellEdit(editing.id, next.r, next.c);
          }
        }}
        style={{
          fontFamily: fontStack(style.fontFamily),
          fontSize: style.fontSize * z,
          fontWeight: style.bold ? 700 : 400,
          fontStyle: style.italic ? 'italic' : 'normal',
          lineHeight: LINE_HEIGHT,
          color: style.textColor,
          textAlign: style.textAlign,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          outline: 'none',
          caretColor: 'var(--accent)',
          cursor: 'text',
        }}
      />
    </div>
  );
}
