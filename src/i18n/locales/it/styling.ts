import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': 'Tema',
  'styling.theme.subtitle': 'Ricolora riempimenti, linee e testo in base al ruolo. Le forme che condividevano un colore continuano a condividerne uno. Annulla con Ctrl+Z.',
  'styling.theme.wholePage': 'Pagina intera',
  'styling.theme.empty': 'Aggiungi prima qualche forma: i temi ricolorano ciò che si trova nella pagina.',
  'styling.theme.applied': 'Tema {theme} applicato',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': 'Classico',
  'styling.theme.ocean': 'Oceano',
  'styling.theme.sunset': 'Tramonto',
  'styling.theme.forest': 'Foresta',
  'styling.theme.mono': 'Monocromatico',
  'styling.theme.bold': 'Intenso',
  'styling.theme.midnight': 'Mezzanotte',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': 'Semplice',
  'styling.preset.gray': 'Grigio',
  'styling.preset.blue': 'Blu',
  'styling.preset.green': 'Verde',
  'styling.preset.orange': 'Arancione',
  'styling.preset.yellow': 'Giallo',
  'styling.preset.red': 'Rosso',
  'styling.preset.purple': 'Viola',
  'styling.preset.ink': 'Inchiostro',
  'styling.preset.indigo': 'Indaco',
  'styling.preset.teal': 'Verde acqua',
  'styling.preset.outline': 'Contorno',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': 'URL immagine di sfondo',
  'styling.bgImage.message': 'L’immagine viene disegnata dietro al diagramma, a partire dall’origine della pagina. Usa un URL https:// o data:.',
  'styling.bgImage.confirm': 'Imposta sfondo',
  'styling.bgImage.invalid': 'Inserisci un URL http(s):// o data:image.',
  'styling.bgImage.loadFailed': 'Impossibile caricare l’immagine: controlla l’URL',
} satisfies Translation<typeof en>;
