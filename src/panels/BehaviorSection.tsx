/**
 * Format panel pieces for the editing & interaction features: the
 * "Constrain proportions" lock, the Container switch and group navigation in
 * Arrange, the Behaviour disclosure (movable / resizable / … flags), the
 * Table section (cell-aware structure edits and per-cell styling) and the
 * Freehand section.
 */
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  ArrowDownToLine, ArrowUpToLine, BetweenHorizontalStart, BetweenVerticalStart, Bold, ChevronDown, Italic, Link2, Link2Off,
  LogIn, LogOut, PenLine, Split, TableCellsMerge, TextAlignCenter, TextAlignEnd, TextAlignStart, Trash2,
} from 'lucide-react';
import type { DiagramElement, ShapeElement, TableCellStyle } from '@/model/types';
import { isShape } from '@/model/types';
import { PALETTE } from '@/model/defaults';
import { useEditor } from '@/store/editor';
import { cn } from '@/lib/cn';
import { runAction } from '@/app/actions';
import { ColorField, Segmented, Switch } from '@/ui/controls';
import { IconButton } from '@/ui/Button';
import { Section, common } from './sections';
import { useT } from '@/i18n';
import { BEHAVIOR_FLAGS, setBehavior } from '@/interaction/behavior';
import { isContainerShape, setContainer } from '@/interaction/container';
import { useInteraction } from '@/interaction/store';
import { canEnterGroup, canExitGroup } from '@/interaction/groups';
import { startEditPoints } from '@/interaction/pointEdit';
import { cellStyleValue, runTableOp, styleSelectedCells } from '@/interaction/tableCells';
import { mergeAt, rangeBounds } from '@/interaction/table';

// ---------------------------------------------------------------------------
// Constrain proportions
// ---------------------------------------------------------------------------

/** Width/height patch honoring the shape's proportion lock. */
export function sizePatch(shape: ShapeElement, key: 'x' | 'y' | 'w' | 'h', v: number): Partial<ShapeElement> {
  if (!shape.lockAspect || (key !== 'w' && key !== 'h') || !shape.w || !shape.h) return { [key]: v };
  const ratio = shape.w / shape.h;
  return key === 'w' ? { w: v, h: Math.max(1, v / ratio) } : { h: v, w: Math.max(1, v * ratio) };
}

export function AspectLockToggle({ shape }: { shape: ShapeElement }) {
  const on = !!shape.lockAspect;
  const t = useT();
  return (
    <IconButton
      size="sm"
      label={on ? t('panels.aspect.on') : t('panels.aspect.off')}
      active={on}
      onClick={() => useEditor.getState().updateElements({ [shape.id]: { lockAspect: on ? undefined : true } })}
    >
      {on ? <Link2 /> : <Link2Off />}
    </IconButton>
  );
}

// ---------------------------------------------------------------------------
// Arrange: container switch + group navigation
// ---------------------------------------------------------------------------

export function ArrangeExtras() {
  const shapes = useEditor(useShallow((s) => s.selection.map((id) => s.doc.elements[id]).filter(isShape)));
  const isolated = useInteraction((s) => s.isolation.length > 0);
  // Re-render when the selection changes so the enabled states stay fresh.
  useEditor((s) => s.selection);
  const enter = canEnterGroup();
  const exit = canExitGroup();
  const container = common(shapes.map(isContainerShape));
  const t = useT();
  return (
    <>
      {shapes.length > 0 && (
        <Switch
          label={t('panels.container')}
          checked={!!container}
          onChange={(on) => setContainer(shapes.map((s) => s.id), on)}
        />
      )}
      {(enter || exit) && (
        <div className="flex gap-1.5">
          {enter && (
            <button onClick={() => runAction('arrange.enterGroup')} className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-panel-2 text-[12px] text-fg hover:bg-hover">
              <LogIn className="size-3.5 shrink-0" /> <span className="truncate">{t('panels.group.enter')}</span>
            </button>
          )}
          {exit && (
            <button onClick={() => runAction('arrange.exitGroup')} className="flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-panel-2 text-[12px] text-fg hover:bg-hover">
              <LogOut className="size-3.5 shrink-0" /> <span className="truncate">{isolated ? t('panels.group.exit') : t('panels.group.selectContainer')}</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------

export function BehaviorSection({ els }: { els: DiagramElement[] }) {
  const [open, setOpen] = useState(() => els.some((e) => e.behavior && Object.keys(e.behavior).length > 0));
  const locked = els.filter((e) => e.behavior && Object.values(e.behavior).some((v) => v === false)).length;
  const onlyConnectors = els.every((e) => !isShape(e));
  const t = useT();
  return (
    <Section
      title={t('panels.behavior.title')}
      action={
        <button
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] text-muted hover:bg-hover hover:text-fg"
        >
          {locked > 0 && !open && <span className="text-accent">{t('panels.behavior.restricted')}</span>}
          <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        </button>
      }
    >
      {open && (
        <div className="space-y-0.5">
          {BEHAVIOR_FLAGS.filter((f) => !(f.shapeOnly && onlyConnectors)).map((f) => {
            const value = common(els.map((e) => e.behavior?.[f.key] !== false));
            return (
              <Switch
                key={f.key}
                label={
                  <span title={f.hint}>
                    {f.label}
                    {value === null && <span className="ml-1 text-subtle">{t('panels.behavior.mixed')}</span>}
                  </span>
                }
                checked={value !== false}
                onChange={(v) => setBehavior(els.map((e) => e.id), f.key, v)}
              />
            );
          })}
          <p className="pt-1 text-[11px] leading-relaxed text-subtle">{t('panels.behavior.exportHint')}</p>
        </div>
      )}
      {!open && <p className="text-[11.5px] text-subtle">{locked ? t('panels.behavior.restrictedCount', { count: locked }) : t('panels.behavior.summary')}</p>}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function TableButton({ label, icon, onClick, disabled, danger }: { label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-7 items-center justify-center gap-1.5 rounded-md bg-panel-2 px-2 text-[11.5px] text-fg hover:bg-hover disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5',
        danger && 'text-danger',
      )}
      title={label}
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

export function TableSection({ el }: { el: ShapeElement }) {
  const cell = useInteraction((s) => (s.cell && s.cell.id === el.id ? s.cell : null));
  const table = el.table!;
  const t = useT();
  const range = cell ? rangeBounds(table, cell.r, cell.c, cell.r2, cell.c2) : null;
  const multi = !!range && (range.top !== range.bottom || range.left !== range.right);
  const merged = !!cell && !!mergeAt(table, cell.r, cell.c);
  const set = (patch: Partial<TableCellStyle>) => styleSelectedCells(patch);
  const v = <K extends keyof TableCellStyle>(k: K) => cellStyleValue(el, k);
  const where = range
    ? multi
      ? t('panels.table.rangeMulti', { top: range.top + 1, bottom: range.bottom + 1, left: range.left + 1, right: range.right + 1 })
      : t('panels.table.rangeOne', { row: range.top + 1, col: range.left + 1 })
    : t('panels.table.noCell');
  return (
    <Section title={t('panels.table.title')} action={<span className="text-[11px] tabular-nums text-subtle">{table.rows.length} × {table.cols.length}</span>}>
      <p className="text-[11.5px] text-muted">{where}</p>
      <div className="grid grid-cols-2 gap-1.5">
        <TableButton label={t('panels.table.rowAbove')} icon={<ArrowUpToLine />} onClick={() => runTableOp('rowAbove')} />
        <TableButton label={t('panels.table.rowBelow')} icon={<ArrowDownToLine />} onClick={() => runTableOp('rowBelow')} />
        <TableButton label={t('panels.table.colLeft')} icon={<BetweenVerticalStart />} onClick={() => runTableOp('colLeft')} />
        <TableButton label={t('panels.table.colRight')} icon={<BetweenHorizontalStart />} onClick={() => runTableOp('colRight')} />
        <TableButton label={t('panels.table.deleteRow')} icon={<Trash2 />} danger disabled={table.rows.length < 2} onClick={() => runTableOp('delRow')} />
        <TableButton label={t('panels.table.deleteCol')} icon={<Trash2 />} danger disabled={table.cols.length < 2} onClick={() => runTableOp('delCol')} />
        <TableButton label={t('panels.table.merge')} icon={<TableCellsMerge />} disabled={!multi} onClick={() => runTableOp('merge')} />
        <TableButton label={t('panels.table.unmerge')} icon={<Split />} disabled={!merged} onClick={() => runTableOp('unmerge')} />
      </div>
      <Switch
        label={t('panels.table.headerRow')}
        checked={!!table.header}
        onChange={(header) => useEditor.getState().updateElements({ [el.id]: { table: { ...table, header: header || undefined } } })}
      />
      <div className="pt-1 text-[11px] font-medium text-subtle">{cell ? t('panels.table.selectedCells') : t('panels.table.allCells')}</div>
      <ColorField label={t('panels.table.cellFill')} value={(v('fill') as string | undefined) ?? 'none'} onChange={(fill) => set({ fill: fill === 'none' ? undefined : fill })} swatches={PALETTE.fills} allowNone />
      <ColorField label={t('panels.table.cellText')} value={(v('textColor') as string | undefined) ?? el.style.textColor} onChange={(textColor) => set({ textColor })} swatches={PALETTE.strokes} />
      <div className="flex items-center gap-1.5">
        <div className="flex rounded-lg bg-panel-2 p-0.5">
          <IconButton size="sm" label={t('panels.table.boldCells')} active={!!v('bold')} onClick={() => set({ bold: v('bold') ? undefined : true })}>
            <Bold />
          </IconButton>
          <IconButton size="sm" label={t('panels.table.italicCells')} active={!!v('italic')} onClick={() => set({ italic: v('italic') ? undefined : true })}>
            <Italic />
          </IconButton>
        </div>
        <Segmented
          className="flex-1"
          size="sm"
          value={(v('textAlign') as TableCellStyle['textAlign'] | null | undefined) ?? el.style.textAlign}
          onChange={(textAlign) => set({ textAlign })}
          options={[
            { value: 'left', label: <TextAlignStart />, title: t('panels.alignLeft') },
            { value: 'center', label: <TextAlignCenter />, title: t('panels.alignCenter') },
            { value: 'right', label: <TextAlignEnd />, title: t('panels.alignRight') },
          ]}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-subtle">{t('panels.table.hint')}</p>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Freehand
// ---------------------------------------------------------------------------

export function FreehandSection({ el }: { el: ShapeElement }) {
  const editing = useInteraction((s) => s.editPointsId === el.id);
  const t = useT();
  return (
    <Section title={t('panels.freehand.title')} action={<span className="text-[11px] tabular-nums text-subtle">{t('panels.freehand.points', { count: el.points?.length ?? 0 })}</span>}>
      <button
        onClick={() => (editing ? useInteraction.getState().set({ editPointsId: null, activePoint: null }) : startEditPoints(el.id))}
        className={cn('flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[12px]', editing ? 'bg-accent text-accent-fg' : 'bg-panel-2 text-fg hover:bg-hover')}
      >
        <PenLine className="size-3.5" /> {editing ? t('panels.freehand.doneEditing') : t('panels.freehand.editPoints')}
      </button>
      {editing && <p className="text-[11px] leading-relaxed text-subtle">{t('panels.freehand.hint')}</p>}
    </Section>
  );
}
