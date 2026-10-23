/**
 * English UI strings — styling (src/styling: Theme dialog, style presets,
 * background image from URL). Keys: 'styling.<key>'.
 */
export default {
  // ThemeDialog
  // dialog title: a color theme for the diagram
  'styling.theme.title': 'Theme',
  'styling.theme.subtitle': 'Recolors fills, lines and text by role. Shapes that shared a color keep sharing one. Undo with Ctrl+Z.',
  // scope: recolor the whole page (vs. the selection)
  'styling.theme.wholePage': 'Whole page',
  'styling.theme.empty': "Add some shapes first — themes recolor what's on the page.",
  // {theme} is a theme name, e.g. "Ocean"
  'styling.theme.applied': 'Applied the {theme} theme',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': 'Classic',
  'styling.theme.ocean': 'Ocean',
  'styling.theme.sunset': 'Sunset',
  'styling.theme.forest': 'Forest',
  'styling.theme.mono': 'Monochrome',
  // theme name: strong, saturated colors (not bold text)
  'styling.theme.bold': 'Bold',
  'styling.theme.midnight': 'Midnight',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': 'Plain',
  'styling.preset.gray': 'Gray',
  'styling.preset.blue': 'Blue',
  'styling.preset.green': 'Green',
  'styling.preset.orange': 'Orange',
  'styling.preset.yellow': 'Yellow',
  'styling.preset.red': 'Red',
  'styling.preset.purple': 'Purple',
  // dark preset: near-black fill with white text
  'styling.preset.ink': 'Ink',
  'styling.preset.indigo': 'Indigo',
  'styling.preset.teal': 'Teal',
  // preset with no fill, only an outline
  'styling.preset.outline': 'Outline',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': 'Background image URL',
  'styling.bgImage.message': 'The image is drawn behind the diagram, from the page origin. Use an https:// or data: URL.',
  'styling.bgImage.confirm': 'Set background',
  'styling.bgImage.invalid': 'Enter an http(s):// or data:image URL.',
  'styling.bgImage.loadFailed': "Couldn't load that image — check the URL",
} as const;
