/**
 * Custom title bar. macOS keeps its native traffic lights (overlay title bar);
 * Windows & Linux get custom window controls. Empty areas drag the window,
 * and double-clicking them maximizes, like a native title bar.
 */
import { TABLE_MENU_IDS } from '@/interaction/actions';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Minus, Redo2, Sparkles, Square, Undo2, X, FileDown, Sun, Moon, Clock, Trash } from 'lucide-react';
import { useEditor, useIsDirty } from '@/store/editor';
import { useUi } from '@/store/ui';
import { IS_MAC, isTauri } from '@/lib/platform';
import { cn } from '@/lib/cn';
import { ACTIONS, ACTION_MAP, runAction } from '@/app/actions';
import { UI_MODE_ACTION_IDS } from '@/extensibility/actions';
import { withMenuExtensions } from '@/extensibility/menus';
import { useUi as useUiStore } from '@/store/ui';
import { openPath } from '@/app/fileCommands';
import { clearRecentFiles, getRecentFiles, windowControls, type RecentFile } from '@/io/native';
import { MenuList, useDismiss, type MenuEntry } from '@/ui/Menu';
import { Button, IconButton } from '@/ui/Button';

const MENUS: Array<{ label: string }> = [
  { label: 'File' },
  { label: 'Edit' },
  { label: 'View' },
  { label: 'Arrange' },
  { label: 'Extras' },
  { label: 'Help' },
];

function toEntry(id: string): MenuEntry {
  const a = ACTION_MAP[id];
  return {
    label: a.label,
    icon: a.icon,
    shortcut: a.shortcuts?.[0],
    onSelect: a.run,
    disabled: a.enabled ? !a.enabled() : false,
    checked: a.checked?.(),
  };
}

function buildMenu(label: string, recent: RecentFile[]): MenuEntry[] {
  const sep: MenuEntry = { type: 'separator' };
  const ui = useUiStore.getState();
  const units = (['px', 'pt', 'in', 'mm', 'm'] as const).map((u) => ({
    label: { px: 'Pixels', pt: 'Points', in: 'Inches', mm: 'Millimeters', m: 'Meters' }[u],
    checked: ui.units === u,
    onSelect: () => ui.set({ units: u }),
  }));
  switch (label) {
    case 'File':
      return [
        toEntry('file.new'),
        ...(isTauri() ? [toEntry('file.newWindow')] : []),
        toEntry('file.templates'),
        toEntry('file.open'),
        {
          label: 'Open recent',
          icon: <Clock />,
          disabled: !recent.length,
          items: [
            ...recent.map((r) => ({ label: r.name, onSelect: () => void openPath(r.path) })),
            sep,
            { label: 'Clear recent', icon: <Trash />, onSelect: () => void clearRecentFiles() },
          ],
        },
        toEntry('file.import'),
        ...(isTauri() ? [] : [toEntry('file.openBrowser')]),
        sep,
        toEntry('file.save'),
        toEntry('file.saveAs'),
        ...(isTauri() ? [] : [toEntry('file.saveBrowser')]),
        toEntry('file.saveTemplate'),
        sep,
        toEntry('file.export'),
        toEntry('file.embed'),
        toEntry('file.print'),
        sep,
        toEntry('file.revisions'),
        toEntry('file.properties'),
      ];
    case 'Edit':
      return [
        toEntry('edit.undo'),
        toEntry('edit.redo'),
        sep,
        toEntry('edit.cut'),
        toEntry('edit.copy'),
        toEntry('edit.paste'),
        toEntry('edit.duplicate'),
        toEntry('edit.delete'),
        toEntry('edit.deleteAll'),
        sep,
        toEntry('edit.find'),
        sep,
        {
          label: 'Select',
          items: ['edit.selectAll', 'edit.selectVertices', 'edit.selectEdges', 'edit.selectNone', 'edit.selectChildren', 'edit.selectParent', 'edit.selectSiblings', 'edit.selectDescendants'].map(toEntry),
        },
        sep,
        toEntry('edit.data'),
        { label: 'Data', items: ['edit.pageData', 'edit.documentData', 'edit.revealHidden', 'edit.mermaid'].map(toEntry) },
        toEntry('edit.link'),
        toEntry('edit.tooltip'),
        toEntry('edit.style'),
        toEntry('edit.editShape'),
        {
          label: 'Style',
          items: ['edit.copyStyle', 'edit.pasteStyle', 'edit.defaultStyle', 'edit.clearDefaultStyle'].map(toEntry),
        },
        { label: 'Text', items: ['format.bold', 'format.italic', 'format.underline', 'format.fontBigger', 'format.fontSmaller', 'format.clear'].map(toEntry) },
        { label: 'Copy as', items: ['edit.copyImage', 'edit.copySvg'].map(toEntry) },
        toEntry('edit.replaceShape'),
        toEntry('edit.editPoints'),
        sep,
        toEntry('edit.lock'),
      ];
    case 'View':
      return [
        toEntry('view.palette'),
        sep,
        toEntry('view.left'),
        toEntry('view.right'),
        toEntry('view.layers'),
        toEntry('view.outline'),
        toEntry('view.comments'),
        toEntry('view.focus'),
        sep,
        toEntry('view.grid'),
        toEntry('view.snap'),
        toEntry('view.guides'),
        toEntry('view.connectionPoints'),
        toEntry('view.rulers'),
        toEntry('view.scrollbars'),
        toEntry('view.pageView'),
        { label: 'Units', items: units },
        sep,
        toEntry('view.zoomIn'),
        toEntry('view.zoomOut'),
        toEntry('view.zoom100'),
        toEntry('view.fit'),
        toEntry('view.fitSelection'),
        sep,
        { label: 'Pages', items: ['view.newPage', 'view.prevPage', 'view.nextPage'].map(toEntry) },
        { label: 'Theme', icon: <Sun />, items: [toEntry('view.themeLight'), toEntry('view.themeDark'), toEntry('view.themeSystem'), sep, toEntry('view.adapt')] },
        toEntry('view.fullscreen'),
        toEntry('view.play'),
      ];
    case 'Arrange':
      return [
        toEntry('arrange.front'),
        toEntry('arrange.forward'),
        toEntry('arrange.backward'),
        toEntry('arrange.back'),
        sep,
        toEntry('arrange.group'),
        toEntry('arrange.ungroup'),
        toEntry('arrange.removeFromGroup'),
        { label: 'Navigate', items: ['arrange.enterGroup', 'arrange.exitGroup', 'arrange.home'].map(toEntry) },
        sep,
        {
          label: 'Align',
          items: ['align.left', 'align.hcenter', 'align.right', 'align.top', 'align.vcenter', 'align.bottom', 'arrange.alignGrid'].map(toEntry),
        },
        { label: 'Distribute', items: ['distribute.h', 'distribute.v'].map(toEntry) },
        { label: 'Size', items: ['arrange.autosize', 'arrange.equalSize', 'arrange.equalWidth', 'arrange.equalHeight'].map(toEntry) },
        { label: 'Rotate & flip', items: ['arrange.rotate', 'arrange.rotateCcw', 'arrange.flipH', 'arrange.flipV'].map(toEntry) },
        sep,
        { label: 'Layout', items: ACTIONS.filter((a) => a.group === 'Layout').map((a) => toEntry(a.id)) },
        {
          label: 'Insert',
          items: [toEntry('arrange.image'), toEntry('arrange.imageUrl'), toEntry('arrange.table'), toEntry('arrange.insertShape'), toEntry('file.templates'), toEntry('file.import')],
        },
        {
          label: 'Table',
          items: [...TABLE_MENU_IDS, 'arrange.tableRow', 'arrange.tableCol', 'arrange.tableDelRow', 'arrange.tableDelCol'].map(toEntry),
        },
        sep,
        { label: 'Connector', items: ['arrange.connect', 'arrange.reverse', 'arrange.clearWaypoints'].map(toEntry) },
        { label: 'Tree', items: ['tree.child', 'tree.sibling', 'tree.siblingBefore'].map(toEntry) },
        toEntry('arrange.collapse'),
      ];
    case 'Extras':
      return [toEntry('edit.diagram'), toEntry('edit.style'), sep, toEntry('extras.theme'), toEntry('extras.sketch'), sep, toEntry('ai.open'), toEntry('ai.settings'), sep, { label: 'Appearance', items: UI_MODE_ACTION_IDS.map(toEntry) }, toEntry('extras.plugins'), { label: 'Tools', items: ['extras.explore', 'extras.anonymize', 'extras.replay', ...(ACTION_MAP['extras.dictate'].hidden ? [] : ['extras.dictate'])].map(toEntry) }, toEntry('extras.configuration'), toEntry('extras.preferences')];
    default:
      return [toEntry('help.shortcuts'), toEntry('view.palette'), ...(isTauri() ? [sep, toEntry('help.checkUpdates'), toEntry('extras.configFile')] : [])];
  }
}

export function TitleBar() {
  const name = useEditor((s) => s.file.name);
  const dirty = useIsDirty();
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const theme = useUi((s) => s.theme);
  const setUi = useUi((s) => s.set);
  const aiOpen = useUi((s) => s.aiOpen);
  const [open, setOpen] = useState<{ label: string; x: number; y: number } | null>(null);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(null), []);
  useDismiss(!!open, close, barRef);

  const openMenu = (label: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    if (label === 'File') getRecentFiles().then(setRecent).catch(() => {});
    setOpen({ label, x: r.left, y: r.bottom + 4 });
  };

  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const displayName = name.replace(/\.opendraw$/i, '');

  return (
    <header
      ref={barRef}
      data-tauri-drag-region
      className="relative z-30 flex h-11 shrink-0 items-center gap-1 pr-1.5"
      style={{ paddingLeft: IS_MAC && isTauri() ? 84 : 10 }}
    >
      {/* Brand mark */}
      <div className="mr-1.5 flex size-[22px] items-center justify-center rounded-[7px] bg-gradient-to-br from-[#7c7fff] via-[#5b4bf5] to-[#3a2bb8] shadow-[0_1px_3px_rgb(58_43_184/0.4),inset_0_1px_0_rgb(255_255_255/0.25)]" data-tauri-drag-region>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
          <rect x="2.5" y="4" width="8" height="6" rx="1.8" fill="#fff" stroke="none" />
          <path d="M6.5 10v6.5h7" />
          <circle cx="17.5" cy="16.5" r="3.5" fill="#fff" stroke="none" />
        </svg>
      </div>

      {/* Menus */}
      <nav className="flex items-center">
        {MENUS.map((m) => (
          <button
            key={m.label}
            onPointerDown={(e) => {
              e.preventDefault();
              if (open?.label === m.label) close();
              else openMenu(m.label, e.currentTarget);
            }}
            onPointerEnter={(e) => open && open.label !== m.label && openMenu(m.label, e.currentTarget)}
            className={cn(
              'h-7 rounded-md px-2.5 text-[12.5px] font-medium transition-colors',
              open?.label === m.label ? 'bg-active text-fg' : 'text-muted hover:bg-hover hover:text-fg',
            )}
          >
            {m.label}
          </button>
        ))}
      </nav>
      {open && <MenuList key={open.label} items={withMenuExtensions(open.label, buildMenu(open.label, recent), toEntry, { type: 'separator' } as MenuEntry, (id) => !!ACTION_MAP[id])} onClose={close} x={open.x} y={open.y} />}

      {/* Document name (centered) */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center" data-tauri-drag-region>
        <div className="pointer-events-auto flex max-w-[40vw] items-center gap-2 rounded-md px-2 py-1" data-tauri-drag-region>
          <span className="truncate text-[13px] font-medium text-fg" data-tauri-drag-region>
            {displayName}
          </span>
          <span
            className={cn('size-1.5 shrink-0 rounded-full transition-all duration-300', dirty ? 'scale-100 bg-amber-500' : 'scale-0 bg-transparent')}
            title={dirty ? 'Unsaved changes' : 'Saved'}
          />
        </div>
      </div>

      <div className="flex-1 self-stretch" data-tauri-drag-region />

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <IconButton label="Undo" shortcut="Mod+Z" disabled={!canUndo} onClick={() => runAction('edit.undo')}>
          <Undo2 />
        </IconButton>
        <IconButton label="Redo" shortcut="Mod+Shift+Z" disabled={!canRedo} onClick={() => runAction('edit.redo')}>
          <Redo2 />
        </IconButton>
        <IconButton label={dark ? 'Light theme' : 'Dark theme'} onClick={() => setUi({ theme: dark ? 'light' : 'dark' })}>
          {dark ? <Sun /> : <Moon />}
        </IconButton>
        <div className="mx-1.5 h-5 w-px bg-line" />
        <button
          onClick={() => setUi({ aiOpen: !aiOpen })}
          className={cn(
            'group relative mr-1 flex h-7 items-center gap-1.5 overflow-hidden rounded-lg px-2.5 text-[12.5px] font-medium transition-all',
            aiOpen ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-hover',
          )}
        >
          <Sparkles className="size-[15px] text-accent transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          Generate
        </button>
        <Button variant="primary" size="sm" icon={<FileDown className="size-3.5" />} onClick={() => runAction('file.export')}>
          Export
        </Button>
      </div>

      {!IS_MAC && isTauri() && <WindowControls />}
    </header>
  );
}

function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    let off: (() => void) | undefined;
    const sync = () => windowControls.isMaximized().then(setMaximized);
    sync();
    windowControls.onResized(sync).then((f) => (off = f));
    return () => off?.();
  }, []);
  const btn = 'flex h-11 w-[46px] items-center justify-center text-muted transition-colors hover:bg-hover hover:text-fg [&_svg]:size-[15px]';
  return (
    <div className="-my-0 ml-2 -mr-1.5 flex self-stretch">
      <button className={btn} aria-label="Minimize" onClick={() => windowControls.minimize()}>
        <Minus strokeWidth={1.5} />
      </button>
      <button className={btn} aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => windowControls.toggleMaximize()}>
        {maximized ? <Copy strokeWidth={1.5} className="!size-[13px] -scale-x-100" /> : <Square strokeWidth={1.5} className="!size-[13px]" />}
      </button>
      <button className={cn(btn, 'hover:bg-[#e81123] hover:text-white')} aria-label="Close" onClick={() => windowControls.close()}>
        <X strokeWidth={1.5} />
      </button>
    </div>
  );
}

