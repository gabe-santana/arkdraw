import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': 'Design',
  'styling.theme.subtitle': 'Färbt Füllungen, Linien und Text nach Rolle neu ein. Formen mit gleicher Farbe behalten eine gemeinsame Farbe. Rückgängig mit Ctrl+Z.',
  'styling.theme.wholePage': 'Ganze Seite',
  'styling.theme.empty': 'Fügen Sie zuerst Formen hinzu – Designs färben ein, was auf der Seite ist.',
  'styling.theme.applied': 'Design „{theme}“ angewendet',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': 'Klassisch',
  'styling.theme.ocean': 'Ozean',
  'styling.theme.sunset': 'Sonnenuntergang',
  'styling.theme.forest': 'Wald',
  'styling.theme.mono': 'Monochrom',
  'styling.theme.bold': 'Kräftig',
  'styling.theme.midnight': 'Mitternacht',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': 'Schlicht',
  'styling.preset.gray': 'Grau',
  'styling.preset.blue': 'Blau',
  'styling.preset.green': 'Grün',
  'styling.preset.orange': 'Orange',
  'styling.preset.yellow': 'Gelb',
  'styling.preset.red': 'Rot',
  'styling.preset.purple': 'Lila',
  'styling.preset.ink': 'Tinte',
  'styling.preset.indigo': 'Indigo',
  'styling.preset.teal': 'Petrol',
  'styling.preset.outline': 'Kontur',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': 'URL des Hintergrundbilds',
  'styling.bgImage.message': 'Das Bild wird hinter dem Diagramm ab dem Seitenursprung gezeichnet. Verwenden Sie eine https://- oder data:-URL.',
  'styling.bgImage.confirm': 'Hintergrund festlegen',
  'styling.bgImage.invalid': 'Geben Sie eine http(s)://- oder data:image-URL ein.',
  'styling.bgImage.loadFailed': 'Bild konnte nicht geladen werden – prüfen Sie die URL',
} satisfies Translation<typeof en>;
