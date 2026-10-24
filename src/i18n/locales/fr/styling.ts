import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': 'Thème',
  'styling.theme.subtitle': 'Recolore les remplissages, les lignes et le texte selon leur rôle. Les formes qui partageaient une couleur la partagent toujours. Annulez avec Ctrl+Z.',
  'styling.theme.wholePage': 'Page entière',
  'styling.theme.empty': 'Ajoutez d’abord des formes — les thèmes recolorent le contenu de la page.',
  'styling.theme.applied': 'Thème {theme} appliqué',

  // Diagram theme names
  'styling.theme.classic': 'Classique',
  'styling.theme.ocean': 'Océan',
  'styling.theme.sunset': 'Coucher de soleil',
  'styling.theme.forest': 'Forêt',
  'styling.theme.mono': 'Monochrome',
  'styling.theme.bold': 'Vif',
  'styling.theme.midnight': 'Minuit',

  // Style preset names
  'styling.preset.plain': 'Simple',
  'styling.preset.gray': 'Gris',
  'styling.preset.blue': 'Bleu',
  'styling.preset.green': 'Vert',
  'styling.preset.orange': 'Orange',
  'styling.preset.yellow': 'Jaune',
  'styling.preset.red': 'Rouge',
  'styling.preset.purple': 'Violet',
  'styling.preset.ink': 'Encre',
  'styling.preset.indigo': 'Indigo',
  'styling.preset.teal': 'Bleu canard',
  'styling.preset.outline': 'Contour',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': 'URL de l’image d’arrière-plan',
  'styling.bgImage.message': 'L’image est dessinée derrière le diagramme, à partir de l’origine de la page. Utilisez une URL https:// ou data:.',
  'styling.bgImage.confirm': 'Définir l’arrière-plan',
  'styling.bgImage.invalid': 'Saisissez une URL http(s):// ou data:image.',
  'styling.bgImage.loadFailed': 'Impossible de charger cette image — vérifiez l’URL',
} satisfies Translation<typeof en>;
