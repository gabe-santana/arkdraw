/**
 * Central action registry. Menus, the context menu, keyboard shortcuts and
 * the command palette are all generated from this list, so they never drift
 * apart. Shortcuts follow mxGraph's where they exist.
 */
import type { ReactNode } from 'react';
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter,
  AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, BringToFront, ChevronsDown, ChevronsUp,
  Circle, ClipboardPaste, Copy, CopyPlus, Diamond, FilePlus, FileDown, FolderOpen, Frame, Grid3x3, Group, Hand,
  Keyboard, Lock, Magnet, Maximize, Minus, Moon, MousePointer2, PanelLeft, PanelRight, Play, Plus, Redo2, Save,
  Scissors, SendToBack, Sparkles, Square, StickyNote, Sun, SunMoon, Trash, Type, Undo2, Ungroup, Waypoints, Command,
  ScanLine, Settings2, RotateCw, RotateCcw, FlipHorizontal2, FlipVertical2, Search, Database, Link2, Paintbrush,
  Code2, Printer, FileUp, LayoutTemplate, Pencil, Table, Image, Layers3, Map as MapIcon, Ruler, Fullscreen,
  Network, Spline, ArrowLeftRight, Shrink, Scaling, FileJson, MessageSquare, ChevronsLeftRight, History, SlidersHorizontal,
  Bold, Italic, Underline, Replace,
} from 'lucide-react';
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { isShape } from '@/model/types';
import { shapeTool } from '@/canvas/tools';
import { LAYOUTS } from '@/layout';
import { newDocument, openDocument, saveDocument } from './fileCommands';
import { copyToClipboard, pasteFromClipboard } from './clipboard';
import { togglePlayback } from './playback';
import {
  addTreeNode, alignToGrid, applyLayout, autosizeSelection, clearDefaultStyle, clearWaypoints, cloneConnect, connectSelection,
  copyAsImage, copyStyle, editTable, equalSize, flipSelection, gotoPage, insertTable, pasteHere, pasteStyle, pickImage,
  removeFromGroup, reverseConnectors, rotateSelection, selectByType, selectGroupOrChildren, setDefaultStyleFromSelection,
  toggleFullscreen, toggleTextStyle, stepFontSize, pickReplacement, zoomToPage,
} from './commands';
import { AUTOMATION_ACTIONS } from '@/automation/actions';
import { openAutomationDialog } from '@/automation/ui';
import { RemoveFormatting } from 'lucide-react';
import { clearFormatting } from '@/text/clearFormatting';
import { AppWindow, FileCog, RefreshCw } from 'lucide-react';
import { isTauri } from '@/lib/platform';
import { openNewWindow } from '@/desktop/windows';
import { checkForUpdates } from '@/desktop/updater';
import { showConfigFile } from '@/desktop/startup';
import { STYLING_ACTIONS } from '@/styling/actions';
import { INTERACTION_ACTIONS } from '@/interaction/actions';
import { CONNECTOR_ACTIONS } from '@/panels/connectorActions';
import { columnInset, panelColumnOpen, resetDock, sideOf, toggleAiTab, togglePanelColumn } from '@/chrome/Dock';

export type ActionGroup = 'File' | 'Edit' | 'View' | 'Arrange' | 'Tools' | 'Help' | 'AI' | 'Layout';

export interface Action {
  id: string;
  label: string;
  group: ActionGroup;
  icon?: ReactNode;
  /** e.g. "Mod+Shift+Z". First is displayed; all are bound. */
  shortcuts?: string[];
  run: () => void;
  enabled?: () => boolean;
  checked?: () => boolean;
  keywords?: string;
  /** Hidden from the command palette. */
  hidden?: boolean;
}

const ed = () => useEditor.getState();
const ui = () => useUi.getState();
const hasText = () => !!ed().editingId || ed().selection.length > 0;
const hasSelection = () => ed().selection.length > 0;
const multi = (n: number) => () => ed().selection.length >= n;
const oneShape = () => {
  const s = ed();
  return s.selection.length === 1 && isShape(s.doc.elements[s.selection[0]]);
};
const hasShapes = () => ed().selection.some((id) => isShape(ed().doc.elements[id]));
const hasConnectors = () => ed().selection.some((id) => ed().doc.elements[id]?.type === 'connector');
const isTable = () => {
  const s = ed();
  const el = s.doc.elements[s.selection[0]];
  return isShape(el) && !!el.table;
};
const panelInsets = () => ({
  left: columnInset(ui(), 'left') ? columnInset(ui(), 'left') + 36 : 40,
  right: columnInset(ui(), 'right') ? columnInset(ui(), 'right') + 32 : 40,
  top: 40,
  bottom: 96,
});

const tool = (id: string, label: string, icon: ReactNode, keys: string[]): Action => ({
  id: `tool.${id}`,
  label,
  group: 'Tools',
  icon,
  shortcuts: keys,
  run: () => ed().setTool(id.startsWith('shape') ? shapeTool(id.slice(6) as never) : id),
  checked: () => ed().tool === (id.startsWith('shape') ? shapeTool(id.slice(6) as never) : id),
});

export const ACTIONS: Action[] = [
  // --- File -----------------------------------------------------------------
  { id: 'file.new', label: 'New diagram', group: 'File', icon: <FilePlus />, shortcuts: ['Mod+N'], run: newDocument },
  { id: 'file.newWindow', label: 'New window', group: 'File', icon: <AppWindow />, shortcuts: ['Mod+Shift+N'], run: () => void openNewWindow(), enabled: isTauri, hidden: !isTauri(), keywords: 'second editor instance' },
  { id: 'file.templates', label: 'New from template…', group: 'File', icon: <LayoutTemplate />, run: () => ui().set({ templatesOpen: true }), keywords: 'gallery examples' },
  { id: 'file.open', label: 'Open…', group: 'File', icon: <FolderOpen />, shortcuts: ['Mod+O'], run: openDocument, keywords: 'import drawio vsdx gliffy' },
  {
    id: 'file.import',
    label: 'Import from text…',
    group: 'File',
    icon: <FileUp />,
    run: () => ui().set({ importOpen: true }),
    keywords: 'mermaid csv sql plantuml text list',
  },
  { id: 'file.save', label: 'Save', group: 'File', icon: <Save />, shortcuts: ['Mod+S'], run: () => void saveDocument() },
  { id: 'file.saveAs', label: 'Save as…', group: 'File', shortcuts: ['Mod+Shift+S'], run: () => void saveDocument(true) },
  {
    id: 'file.export',
    label: 'Export…',
    group: 'File',
    icon: <FileDown />,
    shortcuts: ['Mod+Alt+E'],
    run: () => ui().set({ exportOpen: true }),
    keywords: 'png svg pdf drawio gif jpeg webp html vsdx image',
  },
  { id: 'file.revisions', label: 'Revision history…', group: 'File', icon: <History />, shortcuts: ['Mod+Alt+Shift+H'], run: () => ui().set({ revisionsOpen: true }), keywords: 'versions restore backup' },
  { id: 'file.print', label: 'Print…', group: 'File', icon: <Printer />, shortcuts: ['Mod+P'], run: () => openAutomationDialog({ kind: 'print' }), keywords: 'paper pages scale fit sheets' },

  // --- Edit -----------------------------------------------------------------
  { id: 'edit.undo', label: 'Undo', group: 'Edit', icon: <Undo2 />, shortcuts: ['Mod+Z'], run: () => ed().undo(), enabled: () => ed().past.length > 0 },
  { id: 'edit.redo', label: 'Redo', group: 'Edit', icon: <Redo2 />, shortcuts: ['Mod+Shift+Z', 'Mod+Y'], run: () => ed().redo(), enabled: () => ed().future.length > 0 },
  { id: 'edit.cut', label: 'Cut', group: 'Edit', icon: <Scissors />, shortcuts: ['Mod+X'], run: () => copyToClipboard(true), enabled: hasSelection },
  { id: 'edit.copy', label: 'Copy', group: 'Edit', icon: <Copy />, shortcuts: ['Mod+C'], run: () => copyToClipboard(false), enabled: hasSelection },
  // Mod+V is handled by the native "paste" event (see clipboard.ts); listed for display.
  { id: 'edit.paste', label: 'Paste', group: 'Edit', icon: <ClipboardPaste />, shortcuts: ['Mod+V'], run: () => void pasteFromClipboard() },
  { id: 'edit.pasteHere', label: 'Paste here', group: 'Edit', icon: <ClipboardPaste />, run: pasteHere, hidden: true },
  { id: 'edit.duplicate', label: 'Duplicate', group: 'Edit', icon: <CopyPlus />, shortcuts: ['Mod+D'], run: () => ed().duplicateSelection(), enabled: hasSelection },
  { id: 'edit.delete', label: 'Delete', group: 'Edit', icon: <Trash />, shortcuts: ['Delete', 'Backspace'], run: () => ed().deleteSelection(false), enabled: hasSelection },
  {
    id: 'edit.deleteAll',
    label: 'Delete with connections',
    group: 'Edit',
    shortcuts: ['Mod+Delete', 'Mod+Backspace'],
    run: () => ed().deleteSelection(true),
    enabled: hasSelection,
  },
  { id: 'edit.selectAll', label: 'Select all', group: 'Edit', shortcuts: ['Mod+A'], run: () => ed().selectAll() },
  { id: 'edit.selectVertices', label: 'Select shapes', group: 'Edit', shortcuts: ['Mod+Shift+I'], run: () => selectByType('shape'), keywords: 'vertices' },
  { id: 'edit.selectEdges', label: 'Select connectors', group: 'Edit', shortcuts: ['Mod+Shift+E'], run: () => selectByType('connector'), keywords: 'edges' },
  { id: 'edit.selectNone', label: 'Select none', group: 'Edit', shortcuts: ['Mod+Shift+A'], run: () => selectByType('none') },
  { id: 'edit.selectChildren', label: 'Select children', group: 'Edit', shortcuts: ['Alt+Shift+X'], run: () => selectGroupOrChildren('children'), enabled: oneShape },
  { id: 'edit.selectParent', label: 'Select parent', group: 'Edit', shortcuts: ['Alt+Shift+P'], run: () => selectGroupOrChildren('parent'), enabled: oneShape },
  { id: 'edit.selectSiblings', label: 'Select siblings', group: 'Edit', shortcuts: ['Alt+Shift+S'], run: () => selectGroupOrChildren('siblings'), enabled: oneShape },
  { id: 'format.bold', label: 'Bold', group: 'Edit', icon: <Bold />, shortcuts: ['Mod+B'], run: () => toggleTextStyle('bold'), enabled: hasText, keywords: 'text font weight' },
  { id: 'format.italic', label: 'Italic', group: 'Edit', icon: <Italic />, shortcuts: ['Mod+I'], run: () => toggleTextStyle('italic'), enabled: hasText, keywords: 'text font' },
  { id: 'format.underline', label: 'Underline', group: 'Edit', icon: <Underline />, shortcuts: ['Mod+U'], run: () => toggleTextStyle('underline'), enabled: hasText, keywords: 'text font' },
  { id: 'format.fontBigger', label: 'Increase font size', group: 'Edit', shortcuts: ['Mod+Shift+.'], run: () => stepFontSize(1), enabled: hasText, keywords: 'text larger grow' },
  { id: 'format.fontSmaller', label: 'Decrease font size', group: 'Edit', shortcuts: ['Mod+Shift+,'], run: () => stepFontSize(-1), enabled: hasText, keywords: 'text smaller shrink' },
  { id: 'format.clear', label: 'Clear formatting', group: 'Edit', icon: <RemoveFormatting />, run: clearFormatting, enabled: hasText, keywords: 'text reset plain remove style' },
  { id: 'edit.replaceShape', label: 'Replace shape…', group: 'Edit', icon: <Replace />, run: pickReplacement, enabled: () => ed().selection.some((id) => isShape(ed().doc.elements[id])), keywords: 'turn into change convert swap kind' },
  { id: 'edit.lock', label: 'Lock / unlock', group: 'Edit', icon: <Lock />, shortcuts: ['Mod+L'], run: () => ed().toggleLock(), enabled: hasSelection },
  { id: 'edit.find', label: 'Find & replace…', group: 'Edit', icon: <Search />, shortcuts: ['Mod+F'], run: () => ui().set({ findOpen: true }) },
  {
    id: 'edit.data',
    label: 'Edit data…',
    group: 'Edit',
    icon: <Database />,
    shortcuts: ['Mod+M'],
    run: () => ui().set({ editDataId: ed().selection[0] ?? null }),
    enabled: () => ed().selection.length === 1,
    keywords: 'properties metadata tooltip tags id',
  },
  {
    id: 'edit.link',
    label: 'Edit link…',
    group: 'Edit',
    icon: <Link2 />,
    shortcuts: ['Alt+Shift+L'],
    run: () => ui().set({ editDataId: ed().selection[0] ?? null }),
    enabled: () => ed().selection.length === 1,
  },
  {
    id: 'edit.tooltip',
    label: 'Edit tooltip…',
    group: 'Edit',
    icon: <MessageSquare />,
    run: () => ui().set({ editDataId: ed().selection[0] ?? null }),
    enabled: () => ed().selection.length === 1,
  },
  { id: 'edit.style', label: 'Edit style…', group: 'Edit', icon: <Code2 />, shortcuts: ['Mod+E'], run: () => ui().set({ editStyleOpen: true }), enabled: hasSelection },
  { id: 'edit.copyStyle', label: 'Copy style', group: 'Edit', icon: <Paintbrush />, shortcuts: ['Mod+Alt+C'], run: copyStyle, enabled: hasSelection },
  { id: 'edit.pasteStyle', label: 'Paste style', group: 'Edit', shortcuts: ['Mod+Alt+V'], run: pasteStyle, enabled: hasSelection },
  { id: 'edit.defaultStyle', label: 'Set as default style', group: 'Edit', shortcuts: ['Mod+Shift+D'], run: setDefaultStyleFromSelection, enabled: oneShape },
  { id: 'edit.clearDefaultStyle', label: 'Clear default style', group: 'Edit', run: clearDefaultStyle },
  { id: 'edit.copyImage', label: 'Copy as image', group: 'Edit', run: () => void copyAsImage('png'), keywords: 'png clipboard' },
  { id: 'edit.copySvg', label: 'Copy as SVG', group: 'Edit', run: () => void copyAsImage('svg'), keywords: 'svg clipboard' },
  { id: 'edit.diagram', label: 'Edit diagram source…', group: 'Edit', icon: <FileJson />, run: () => ui().set({ editDiagramOpen: true }), keywords: 'json xml raw' },

  // --- View -----------------------------------------------------------------
  { id: 'view.zoomIn', label: 'Zoom in', group: 'View', icon: <Plus />, shortcuts: ['Mod+=', 'Mod++'], run: () => ed().zoomBy(1.25) },
  { id: 'view.zoomOut', label: 'Zoom out', group: 'View', icon: <Minus />, shortcuts: ['Mod+-'], run: () => ed().zoomBy(0.8) },
  { id: 'view.pageWidth', label: 'Fit page width', group: 'View', run: () => zoomToPage('pageWidth', panelInsets()), keywords: 'zoom' },
  { id: 'view.onePage', label: 'One page', group: 'View', run: () => zoomToPage('onePage', panelInsets()), keywords: 'zoom fit page' },
  { id: 'view.twoPages', label: 'Two pages', group: 'View', run: () => zoomToPage('twoPages', panelInsets()), keywords: 'zoom fit pages' },
  { id: 'view.zoom100', label: 'Actual size', group: 'View', shortcuts: ['Mod+0'], run: () => ed().zoomBy(1 / ed().camera.z) },
  { id: 'view.fit', label: 'Fit window', group: 'View', icon: <Maximize />, shortcuts: ['Mod+H', 'Shift+1'], run: () => ed().zoomToFit(undefined, panelInsets()) },
  {
    id: 'view.fitSelection',
    label: 'Zoom to selection',
    group: 'View',
    icon: <ScanLine />,
    shortcuts: ['Shift+2'],
    run: () => ed().zoomToFit(ed().selection, panelInsets()),
    enabled: hasSelection,
  },
  { id: 'view.grid', label: 'Grid', group: 'View', icon: <Grid3x3 />, shortcuts: ['Mod+Shift+G', "Mod+'"], run: () => ed().updateSettings({ grid: !ed().settings.grid }), checked: () => ed().settings.grid },
  { id: 'view.snap', label: 'Snap to grid', group: 'View', icon: <Magnet />, run: () => ed().updateSettings({ snap: !ed().settings.snap }), checked: () => ed().settings.snap },
  { id: 'view.connectionPoints', label: 'Connection points', group: 'View', run: () => ed().updateSettings({ connectionPoints: !ed().settings.connectionPoints }), checked: () => ed().settings.connectionPoints },
  { id: 'view.guides', label: 'Guides', group: 'View', run: () => ed().updateSettings({ guides: !ed().settings.guides }), checked: () => ed().settings.guides },
  { id: 'view.rulers', label: 'Rulers', group: 'View', icon: <Ruler />, shortcuts: ['Mod+Shift+R'], run: () => ui().set({ rulers: !ui().rulers }), checked: () => ui().rulers },
  ...STYLING_ACTIONS,
  {
    id: 'view.pageView',
    label: 'Page view',
    group: 'View',
    run: () => {
      const s = ed();
      const p = s.pages.find((pg) => pg.id === s.activePageId);
      s.updatePageSettings({ pageView: !p?.settings.pageView });
    },
    checked: () => !!ed().pages.find((p) => p.id === ed().activePageId)?.settings.pageView,
  },
  { id: 'view.outline', label: 'Outline', group: 'View', icon: <MapIcon />, shortcuts: ['Mod+Shift+O'], run: () => ui().set({ outlineOpen: !ui().outlineOpen }), checked: () => ui().outlineOpen, keywords: 'minimap navigator' },
  {
    id: 'view.layers',
    label: 'Layers',
    group: 'View',
    icon: <Layers3 />,
    shortcuts: ['Mod+Shift+L'],
    run: () => {
      // A tab on the right: show it, or go back to Design when it's showing.
      if (sideOf(ui().dock, 'layers') === 'right') {
        if (!panelColumnOpen('layers')) togglePanelColumn('layers');
        else if (ui().dock.right.includes('format')) ui().set({ rightPanel: 'format' });
        else togglePanelColumn('layers');
        return;
      }
      const show = !(panelColumnOpen('layers') && ui().layersOpen);
      if (show && !panelColumnOpen('layers')) togglePanelColumn('layers');
      ui().set({ layersOpen: show });
    },
    checked: () => panelColumnOpen('layers') && (sideOf(ui().dock, 'layers') === 'right' || ui().layersOpen),
  },
  {
    id: 'view.adapt',
    label: 'Adapt diagram colors in dark mode',
    group: 'View',
    run: () => ed().updateSettings({ adaptColors: !ed().settings.adaptColors }),
    checked: () => ed().settings.adaptColors,
  },
  { id: 'view.comments', label: 'Comments', group: 'View', icon: <MessageSquare />, shortcuts: ['Mod+Alt+M'], run: () => ui().set({ commentsOpen: !ui().commentsOpen }), checked: () => ui().commentsOpen, keywords: 'review notes' },
  { id: 'view.left', label: 'Shapes panel', group: 'View', icon: <PanelLeft />, shortcuts: ['Mod+Shift+K'], run: () => togglePanelColumn('shapes'), checked: () => panelColumnOpen('shapes') },
  { id: 'view.resetPanels', label: 'Reset panel layout', group: 'View', run: resetDock, keywords: 'dock panels arrange move default' },
  { id: 'view.right', label: 'Format panel', group: 'View', icon: <PanelRight />, shortcuts: ['Mod+Shift+P'], run: () => togglePanelColumn('format'), checked: () => panelColumnOpen('format') },
  {
    id: 'view.focus',
    label: 'Focus mode',
    group: 'View',
    shortcuts: ['Mod+\\'],
    run: () => {
      const open = ui().leftOpen || ui().rightOpen;
      ui().set({ leftOpen: !open, rightOpen: !open });
    },
    keywords: 'hide panels zen',
  },
  { id: 'view.fullscreen', label: 'Fullscreen', group: 'View', icon: <Fullscreen />, shortcuts: ['F11'], run: () => void toggleFullscreen() },
  { id: 'view.prevPage', label: 'Previous page', group: 'View', shortcuts: ['Mod+Shift+PageUp', 'Alt+PageUp'], run: () => gotoPage(-1), enabled: () => ed().pages.length > 1 },
  { id: 'view.nextPage', label: 'Next page', group: 'View', shortcuts: ['Mod+Shift+PageDown', 'Alt+PageDown'], run: () => gotoPage(1), enabled: () => ed().pages.length > 1 },
  { id: 'view.newPage', label: 'Insert page', group: 'View', run: () => ed().addPage() },
  { id: 'view.themeLight', label: 'Light theme', group: 'View', icon: <Sun />, run: () => ui().set({ theme: 'light' }), checked: () => ui().theme === 'light' },
  { id: 'view.themeDark', label: 'Dark theme', group: 'View', icon: <Moon />, run: () => ui().set({ theme: 'dark' }), checked: () => ui().theme === 'dark' },
  { id: 'view.themeSystem', label: 'System theme', group: 'View', icon: <SunMoon />, run: () => ui().set({ theme: 'system' }), checked: () => ui().theme === 'system' },
  { id: 'view.play', label: 'Play / pause animation', group: 'View', icon: <Play />, shortcuts: ['Alt+P'], run: togglePlayback, keywords: 'animate preview gif' },
  { id: 'view.palette', label: 'Command palette', group: 'View', icon: <Command />, shortcuts: ['Mod+K'], run: () => ui().set({ paletteOpen: true }), hidden: true },

  // --- Arrange --------------------------------------------------------------
  { id: 'arrange.group', label: 'Group', group: 'Arrange', icon: <Group />, shortcuts: ['Mod+G'], run: () => ed().groupSelection(), enabled: multi(2) },
  { id: 'arrange.ungroup', label: 'Ungroup', group: 'Arrange', icon: <Ungroup />, shortcuts: ['Mod+Shift+U'], run: () => ed().ungroupSelection(), enabled: hasSelection },
  { id: 'arrange.removeFromGroup', label: 'Remove from group', group: 'Arrange', run: removeFromGroup, enabled: hasSelection },
  { id: 'arrange.front', label: 'To front', group: 'Arrange', icon: <BringToFront />, shortcuts: ['Mod+Shift+F', 'Mod+Shift+]'], run: () => ed().reorder('front'), enabled: hasSelection },
  { id: 'arrange.forward', label: 'Bring forward', group: 'Arrange', icon: <ChevronsUp />, shortcuts: ['Mod+]'], run: () => ed().reorder('forward'), enabled: hasSelection },
  { id: 'arrange.backward', label: 'Send backward', group: 'Arrange', icon: <ChevronsDown />, shortcuts: ['Mod+['], run: () => ed().reorder('backward'), enabled: hasSelection },
  { id: 'arrange.back', label: 'To back', group: 'Arrange', icon: <SendToBack />, shortcuts: ['Mod+Shift+B', 'Mod+Shift+['], run: () => ed().reorder('back'), enabled: hasSelection },
  { id: 'align.left', label: 'Align left', group: 'Arrange', icon: <AlignStartVertical />, shortcuts: ['Alt+A'], run: () => ed().align('left'), enabled: multi(2) },
  { id: 'align.hcenter', label: 'Align center', group: 'Arrange', icon: <AlignCenterVertical />, shortcuts: ['Alt+H'], run: () => ed().align('hcenter'), enabled: multi(2) },
  { id: 'align.right', label: 'Align right', group: 'Arrange', icon: <AlignEndVertical />, shortcuts: ['Alt+D'], run: () => ed().align('right'), enabled: multi(2) },
  { id: 'align.top', label: 'Align top', group: 'Arrange', icon: <AlignStartHorizontal />, shortcuts: ['Alt+W'], run: () => ed().align('top'), enabled: multi(2) },
  { id: 'align.vcenter', label: 'Align middle', group: 'Arrange', icon: <AlignCenterHorizontal />, shortcuts: ['Alt+V'], run: () => ed().align('vcenter'), enabled: multi(2) },
  { id: 'align.bottom', label: 'Align bottom', group: 'Arrange', icon: <AlignEndHorizontal />, shortcuts: ['Alt+S'], run: () => ed().align('bottom'), enabled: multi(2) },
  { id: 'distribute.h', label: 'Distribute horizontally', group: 'Arrange', icon: <AlignHorizontalDistributeCenter />, shortcuts: ['Alt+Shift+H'], run: () => ed().distribute('h'), enabled: multi(3) },
  { id: 'distribute.v', label: 'Distribute vertically', group: 'Arrange', icon: <AlignVerticalDistributeCenter />, shortcuts: ['Alt+Shift+V'], run: () => ed().distribute('v'), enabled: multi(3) },
  { id: 'arrange.rotate', label: 'Rotate 90°', group: 'Arrange', icon: <RotateCw />, shortcuts: ['Mod+R'], run: () => rotateSelection(90), enabled: hasShapes },
  { id: 'arrange.rotateCcw', label: 'Rotate -90°', group: 'Arrange', icon: <RotateCcw />, shortcuts: ['Mod+Alt+R'], run: () => rotateSelection(-90), enabled: hasShapes },
  { id: 'arrange.flipH', label: 'Flip horizontal', group: 'Arrange', icon: <FlipHorizontal2 />, run: () => flipSelection('h'), enabled: hasShapes },
  { id: 'arrange.flipV', label: 'Flip vertical', group: 'Arrange', icon: <FlipVertical2 />, run: () => flipSelection('v'), enabled: hasShapes },
  { id: 'arrange.autosize', label: 'Autosize', group: 'Arrange', icon: <Shrink />, shortcuts: ['Mod+Shift+Y'], run: autosizeSelection, enabled: hasShapes, keywords: 'fit text' },
  { id: 'arrange.equalSize', label: 'Equal size', group: 'Arrange', icon: <Scaling />, run: () => equalSize('both'), enabled: multi(2) },
  { id: 'arrange.equalWidth', label: 'Equal width', group: 'Arrange', run: () => equalSize('w'), enabled: multi(2) },
  { id: 'arrange.equalHeight', label: 'Equal height', group: 'Arrange', run: () => equalSize('h'), enabled: multi(2) },
  { id: 'arrange.alignGrid', label: 'Align to grid', group: 'Arrange', run: alignToGrid, enabled: hasShapes },
  { id: 'arrange.clearWaypoints', label: 'Clear waypoints', group: 'Arrange', icon: <Spline />, shortcuts: ['Alt+Shift+C'], run: clearWaypoints, enabled: hasConnectors },
  { id: 'arrange.reverse', label: 'Reverse connector', group: 'Arrange', icon: <ArrowLeftRight />, run: reverseConnectors, enabled: hasConnectors },
  { id: 'arrange.connect', label: 'Connect selected shapes', group: 'Arrange', icon: <Waypoints />, run: connectSelection, enabled: multi(2) },
  {
    id: 'arrange.collapse',
    label: 'Collapse / expand',
    group: 'Arrange',
    icon: <ChevronsLeftRight />,
    run: () => ed().toggleCollapse(ed().selection[0]),
    enabled: oneShape,
  },
  { id: 'arrange.table', label: 'Insert table', group: 'Arrange', icon: <Table />, run: () => insertTable() },
  { id: 'arrange.tableRow', label: 'Add table row', group: 'Arrange', run: () => editTable('addRow'), enabled: isTable },
  { id: 'arrange.tableCol', label: 'Add table column', group: 'Arrange', run: () => editTable('addCol'), enabled: isTable },
  { id: 'arrange.tableDelRow', label: 'Delete table row', group: 'Arrange', run: () => editTable('delRow'), enabled: isTable },
  { id: 'arrange.tableDelCol', label: 'Delete table column', group: 'Arrange', run: () => editTable('delCol'), enabled: isTable },
  { id: 'arrange.image', label: 'Insert image…', group: 'Arrange', icon: <Image />, run: pickImage },
  { id: 'arrange.imageUrl', label: 'Insert image from URL…', group: 'Arrange', icon: <Link2 />, keywords: 'picture link url web', run: () => void import('./commands').then((m) => m.insertImageFromUrl()) },
  { id: 'arrange.svgShapes', label: 'Insert SVG as shapes…', group: 'Arrange', icon: <Spline />, keywords: 'svg vector convert editable import paths icon logo', run: () => void import('./svgImport').then((m) => m.pickSvgAsShapes()) },
  { id: 'tree.child', label: 'Add child node', group: 'Arrange', icon: <Network />, shortcuts: ['Tab'], run: () => addTreeNode('child'), enabled: oneShape, keywords: 'mind map tree' },
  { id: 'tree.sibling', label: 'Add sibling node', group: 'Arrange', shortcuts: ['Mod+Enter'], run: () => addTreeNode('sibling'), enabled: oneShape, keywords: 'mind map tree' },
  { id: 'tree.siblingBefore', label: 'Add sibling before', group: 'Arrange', shortcuts: ['Mod+Shift+Enter'], run: () => addTreeNode('siblingBefore'), enabled: oneShape },
  { id: 'connect.up', label: 'Clone & connect up', group: 'Arrange', shortcuts: ['Alt+Shift+ArrowUp'], run: () => void cloneConnect('top'), enabled: oneShape, hidden: true },
  { id: 'connect.right', label: 'Clone & connect right', group: 'Arrange', shortcuts: ['Alt+Shift+ArrowRight'], run: () => void cloneConnect('right'), enabled: oneShape, hidden: true },
  { id: 'connect.down', label: 'Clone & connect down', group: 'Arrange', shortcuts: ['Alt+Shift+ArrowDown'], run: () => void cloneConnect('bottom'), enabled: oneShape, hidden: true },
  { id: 'connect.left', label: 'Clone & connect left', group: 'Arrange', shortcuts: ['Alt+Shift+ArrowLeft'], run: () => void cloneConnect('left'), enabled: oneShape, hidden: true },

  // --- Layouts (generated from src/layout) -----------------------------------
  ...LAYOUTS.map(
    (l): Action => ({ id: `layout.${l.id}`, label: l.label, group: 'Layout', icon: <Network />, run: () => applyLayout(l.id), keywords: `layout ${l.description}` }),
  ),

  // --- Tools ----------------------------------------------------------------
  tool('select', 'Select', <MousePointer2 />, ['V']),
  tool('hand', 'Hand', <Hand />, ['H']),
  tool('shape:rectangle', 'Rectangle', <Square />, ['R']),
  tool('shape:ellipse', 'Ellipse', <Circle />, ['O']),
  tool('shape:diamond', 'Diamond', <Diamond />, ['D']),
  tool('connector', 'Connector', <Waypoints />, ['L', 'C']),
  tool('shape:text', 'Text', <Type />, ['T']),
  tool('shape:sticky', 'Sticky note', <StickyNote />, ['S']),
  tool('shape:container', 'Container', <Frame />, ['F']),
  tool('freehand', 'Freehand', <Pencil />, ['P']),

  // --- AI -------------------------------------------------------------------
  { id: 'ai.open', label: 'Generate with AI…', group: 'AI', icon: <Sparkles />, shortcuts: ['Mod+I'], run: toggleAiTab, keywords: 'assistant llm claude gpt agent chat' },
  { id: 'extras.preferences', label: 'Preferences…', group: 'AI', icon: <SlidersHorizontal />, shortcuts: ['Mod+,'], run: () => ui().set({ prefsOpen: true }), keywords: 'settings configuration palette author' },
  { id: 'ai.settings', label: 'AI provider & API key…', group: 'AI', icon: <Settings2 />, run: () => ui().set({ aiSettingsOpen: true }), keywords: 'byok openai anthropic ollama key' },

  // --- Help -----------------------------------------------------------------
  { id: 'help.shortcuts', label: 'Keyboard shortcuts', group: 'Help', icon: <Keyboard />, shortcuts: ['Mod+/'], run: () => ui().set({ shortcutsOpen: true }) },
  { id: 'help.checkUpdates', label: 'Check for updates…', group: 'Help', icon: <RefreshCw />, run: () => void checkForUpdates(), enabled: isTauri, hidden: !isTauri(), keywords: 'update upgrade version release' },
  { id: 'extras.configFile', label: 'Show desktop config file (config.json)', group: 'Help', icon: <FileCog />, run: () => void showConfigFile(), enabled: isTauri, hidden: !isTauri(), keywords: 'config.json plugins spell check language settings' },

  // --- Editing & interaction (src/interaction) --------------------------------
  ...INTERACTION_ACTIONS,
  // --- Connectors (src/panels/connectorActions.tsx) ---------------------------
  ...CONNECTOR_ACTIONS,
];

// Data, storage, import/export and automation commands (src/automation/actions.tsx).
ACTIONS.push(...AUTOMATION_ACTIONS);

export const ACTION_MAP: Record<string, Action> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

/** Bumped whenever actions are added/removed at runtime (palette re-indexes). */
export let actionsVersion = 0;

/** Adds (or replaces) an action at runtime — extensions and plugins. Returns a remover. */
export function registerAction(action: Action): () => void {
  const i = ACTIONS.findIndex((a) => a.id === action.id);
  if (i >= 0) ACTIONS.splice(i, 1, action);
  else ACTIONS.push(action);
  ACTION_MAP[action.id] = action;
  actionsVersion++;
  return () => {
    const j = ACTIONS.indexOf(action);
    if (j >= 0) ACTIONS.splice(j, 1);
    if (ACTION_MAP[action.id] === action) delete ACTION_MAP[action.id];
    actionsVersion++;
  };
}

export function runAction(id: string) {
  const a = ACTION_MAP[id];
  if (a && (a.enabled?.() ?? true)) a.run();
}
