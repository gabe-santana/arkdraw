/**
 * Commands for the editing & interaction features, spread into the central
 * registry (src/app/actions.tsx) so menus, the palette and shortcuts see them.
 */
import { ArrowDownToLine, ArrowUpToLine, BetweenHorizontalStart, BetweenVerticalStart, House, LogIn, LogOut, PenLine, Split, TableCellsMerge } from 'lucide-react';
import type { Action } from '@/app/actions';
import { canEnterGroup, canExitGroup, enterGroup, exitAllGroups, exitGroup, selectDescendants } from './groups';
import { canEditPoints, startEditPoints } from './pointEdit';
import { hasCellRange, hasTable, inMergedCell, runTableOp } from './tableCells';
import { openContextMenuForSelection } from './navigation';
import { useInteraction } from './store';
import { useEditor } from '@/store/editor';

const isolated = () => useInteraction.getState().isolation.length > 0;

export const INTERACTION_ACTIONS: Action[] = [
  { id: 'edit.selectDescendants', label: 'Select descendants', group: 'Edit', shortcuts: ['Alt+Shift+D'], run: selectDescendants, enabled: () => useEditor.getState().selection.length > 0, keywords: 'nested children container group recursive' },
  { id: 'edit.editPoints', label: 'Edit points', group: 'Edit', icon: <PenLine />, run: () => startEditPoints(), enabled: canEditPoints, keywords: 'freehand vertices nodes path' },
  { id: 'edit.contextMenu', label: 'Open context menu', group: 'Edit', shortcuts: ['Shift+F10'], run: openContextMenuForSelection, hidden: true },
  { id: 'arrange.enterGroup', label: 'Enter group', group: 'Arrange', icon: <LogIn />, shortcuts: ['Mod+Shift+End'], run: () => enterGroup(), enabled: canEnterGroup, keywords: 'isolate edit inside' },
  { id: 'arrange.exitGroup', label: 'Exit group', group: 'Arrange', icon: <LogOut />, shortcuts: ['Mod+Shift+Home'], run: exitGroup, enabled: canExitGroup, keywords: 'up parent container' },
  { id: 'arrange.home', label: 'Home (exit all groups)', group: 'Arrange', icon: <House />, shortcuts: ['Home'], run: exitAllGroups, enabled: isolated, keywords: 'root top level' },
  { id: 'table.rowAbove', label: 'Insert row above', group: 'Arrange', icon: <ArrowUpToLine />, run: () => runTableOp('rowAbove'), enabled: hasTable, keywords: 'table' },
  { id: 'table.rowBelow', label: 'Insert row below', group: 'Arrange', icon: <ArrowDownToLine />, run: () => runTableOp('rowBelow'), enabled: hasTable, keywords: 'table' },
  { id: 'table.colLeft', label: 'Insert column left', group: 'Arrange', icon: <BetweenVerticalStart />, run: () => runTableOp('colLeft'), enabled: hasTable, keywords: 'table' },
  { id: 'table.colRight', label: 'Insert column right', group: 'Arrange', icon: <BetweenHorizontalStart />, run: () => runTableOp('colRight'), enabled: hasTable, keywords: 'table' },
  { id: 'table.deleteRow', label: 'Delete row', group: 'Arrange', run: () => runTableOp('delRow'), enabled: hasTable, keywords: 'table remove' },
  { id: 'table.deleteCol', label: 'Delete column', group: 'Arrange', run: () => runTableOp('delCol'), enabled: hasTable, keywords: 'table remove' },
  { id: 'table.merge', label: 'Merge cells', group: 'Arrange', icon: <TableCellsMerge />, run: () => runTableOp('merge'), enabled: hasCellRange, keywords: 'table join span' },
  { id: 'table.unmerge', label: 'Unmerge cells', group: 'Arrange', icon: <Split />, run: () => runTableOp('unmerge'), enabled: inMergedCell, keywords: 'table split' },
];

/** Table commands, in menu order. */
export const TABLE_MENU_IDS = ['table.rowAbove', 'table.rowBelow', 'table.colLeft', 'table.colRight', 'table.deleteRow', 'table.deleteCol', 'table.merge', 'table.unmerge'];
