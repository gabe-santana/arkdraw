import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': 'Tema',
  'styling.theme.subtitle': 'Cambia el color de rellenos, líneas y texto según su función. Las formas que compartían un color siguen compartiéndolo. Deshaz con Ctrl+Z.',
  'styling.theme.wholePage': 'Página completa',
  'styling.theme.empty': 'Añade primero algunas formas: los temas cambian el color de lo que hay en la página.',
  'styling.theme.applied': 'Se aplicó el tema {theme}',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': 'Clásico',
  'styling.theme.ocean': 'Océano',
  'styling.theme.sunset': 'Atardecer',
  'styling.theme.forest': 'Bosque',
  'styling.theme.mono': 'Monocromo',
  'styling.theme.bold': 'Intenso',
  'styling.theme.midnight': 'Medianoche',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': 'Simple',
  'styling.preset.gray': 'Gris',
  'styling.preset.blue': 'Azul',
  'styling.preset.green': 'Verde',
  'styling.preset.orange': 'Naranja',
  'styling.preset.yellow': 'Amarillo',
  'styling.preset.red': 'Rojo',
  'styling.preset.purple': 'Morado',
  'styling.preset.ink': 'Tinta',
  'styling.preset.indigo': 'Índigo',
  'styling.preset.teal': 'Verde azulado',
  'styling.preset.outline': 'Contorno',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': 'URL de la imagen de fondo',
  'styling.bgImage.message': 'La imagen se dibuja detrás del diagrama, desde el origen de la página. Usa una URL https:// o data:.',
  'styling.bgImage.confirm': 'Establecer fondo',
  'styling.bgImage.invalid': 'Introduce una URL http(s):// o data:image.',
  'styling.bgImage.loadFailed': 'No se pudo cargar esa imagen: comprueba la URL',
} satisfies Translation<typeof en>;
