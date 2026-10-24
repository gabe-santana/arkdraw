import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': 'Tema',
  'styling.theme.subtitle': 'Recolore preenchimentos, linhas e textos por função. Formas que compartilhavam uma cor continuam compartilhando. Desfaça com Ctrl+Z.',
  'styling.theme.wholePage': 'Página inteira',
  'styling.theme.empty': 'Adicione algumas formas primeiro — os temas recolorem o que está na página.',
  'styling.theme.applied': 'Tema {theme} aplicado',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': 'Clássico',
  'styling.theme.ocean': 'Oceano',
  'styling.theme.sunset': 'Pôr do sol',
  'styling.theme.forest': 'Floresta',
  'styling.theme.mono': 'Monocromático',
  'styling.theme.bold': 'Vibrante',
  'styling.theme.midnight': 'Meia-noite',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': 'Simples',
  'styling.preset.gray': 'Cinza',
  'styling.preset.blue': 'Azul',
  'styling.preset.green': 'Verde',
  'styling.preset.orange': 'Laranja',
  'styling.preset.yellow': 'Amarelo',
  'styling.preset.red': 'Vermelho',
  'styling.preset.purple': 'Roxo',
  'styling.preset.ink': 'Tinta',
  'styling.preset.indigo': 'Índigo',
  'styling.preset.teal': 'Verde-azulado',
  'styling.preset.outline': 'Só contorno',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': 'URL da imagem de fundo',
  'styling.bgImage.message': 'A imagem é desenhada atrás do diagrama, a partir da origem da página. Use uma URL https:// ou data:.',
  'styling.bgImage.confirm': 'Definir fundo',
  'styling.bgImage.invalid': 'Insira uma URL http(s):// ou data:image.',
  'styling.bgImage.loadFailed': 'Não foi possível carregar essa imagem — verifique a URL',
} satisfies Translation<typeof en>;
