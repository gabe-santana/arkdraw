/**
 * English UI strings — title-bar menus, context menu, command palette and the
 * keyboard-shortcuts sheet. Command labels themselves come from the action
 * registry (src/app/actions.tsx) and are translated by id (src/i18n/catalog.ts).
 */
export default {
  // Title-bar menus
  'menu.file': 'File',
  'menu.edit': 'Edit',
  'menu.view': 'View',
  'menu.arrange': 'Arrange',
  'menu.extras': 'Extras',
  'menu.help': 'Help',
  'menu.openRecent': 'Open recent',
  'menu.clearRecent': 'Clear recent',
  'menu.select': 'Select',
  'menu.data': 'Data',
  'menu.style': 'Style',
  'menu.text': 'Text',
  'menu.copyAs': 'Copy as',
  'menu.units': 'Units',
  'menu.pages': 'Pages',
  'menu.theme': 'Theme',
  'menu.navigate': 'Navigate',
  'menu.align': 'Align',
  'menu.distribute': 'Distribute',
  'menu.size': 'Size',
  'menu.rotateFlip': 'Rotate & flip',
  'menu.layout': 'Layout',
  'menu.insert': 'Insert',
  'menu.table': 'Table',
  'menu.connector': 'Connector',
  'menu.tree': 'Tree',
  'menu.appearance': 'Appearance',
  'menu.tools': 'Tools',
  'menu.order': 'Order',
  'menu.moveToLayer': 'Move to layer',
  'menu.units.px': 'Pixels',
  'menu.units.pt': 'Points',
  'menu.units.in': 'Inches',
  'menu.units.mm': 'Millimeters',
  'menu.units.m': 'Meters',

  // Title bar
  'titlebar.export': 'Export',
  'titlebar.undo': 'Undo',
  'titlebar.redo': 'Redo',
  'titlebar.lightTheme': 'Light theme',
  'titlebar.darkTheme': 'Dark theme',

  // Command groups (palette, shortcuts sheet)
  'group.File': 'File',
  'group.Edit': 'Edit',
  'group.View': 'View',
  'group.Arrange': 'Arrange',
  'group.Tools': 'Tools',
  'group.Help': 'Help',
  'group.AI': 'AI',
  'group.Layout': 'Layout',

  // Command palette
  'palette.placeholder': 'Type a command, or search shapes and cloud icons…',
  'palette.commands': 'Commands',
  'palette.tools': 'Tools',
  'palette.insertShape': 'Insert shape',
  'palette.insertIcon': 'Insert icon',

  // Keyboard shortcuts sheet
  'shortcuts.title': 'Keyboard shortcuts',
  'shortcuts.canvas': 'Canvas',
  'shortcuts.pan': 'Pan the canvas',
  'shortcuts.zoom': 'Zoom',
  'shortcuts.duplicateDrag': 'Duplicate while dragging',
  'shortcuts.keepProportions': 'Keep proportions',
  'shortcuts.selectInGroup': 'Select inside a group',
  'shortcuts.editText': 'Edit text',
  'shortcuts.nudge': 'Nudge',
  'shortcuts.nextShape': 'Next / previous shape',
  'shortcuts.followConnection': 'Follow a connection',
  'shortcuts.editFreehand': 'Edit freehand points',
  'shortcuts.doubleClick': 'Double-click',
} as const;
