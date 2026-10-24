import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices
  'app.dismiss': 'Ignorer',
  'app.restoredUnsaved': 'Votre diagramme non enregistré a été restauré',

  // commands.ts
  'app.style.copied': 'Style copié',
  'app.style.copyFirst': 'Copiez d’abord un style',
  'app.style.defaultSet': 'Les nouvelles formes utiliseront ce style',
  'app.style.defaultReset': 'Style par défaut réinitialisé',
  'app.layout.nothing': 'Rien à disposer',
  'app.copyAs.done': 'Copié en {format}',
  'app.copyAs.failed': 'Échec de la copie : {error}',
  'app.image.loadFailed': 'Impossible de charger une image depuis cette URL.',
  'app.image.linked': 'Image liée, non incorporée : le serveur bloque les téléchargements, une connexion est donc nécessaire pour l’afficher.',
  'app.image.urlTitle': 'Insérer une image depuis une URL',
  'app.image.urlMessage': 'Collez un lien vers une image PNG, JPEG, GIF, WebP ou SVG, ou une URI data:.',
  'app.image.urlInvalid': 'Saisissez une URL http(s) ou data:image.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'Tous les diagrammes',
  'app.filter.opendraw': 'Diagramme OpenDraw',
  'app.filter.drawio': 'Diagramme XML (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': 'Enregistrer les modifications de « {name} » ?',
  'app.discard.message': 'Vos modifications seront perdues si vous ne les enregistrez pas.',
  'app.discard.deny': 'Ne pas enregistrer',
  'app.file.imported': '{count, plural, one {# élément importé} other {# éléments importés}}',
  'app.file.importedPages': '{count, plural, one {# élément importé} other {# éléments importés}} sur {pages} pages',
  'app.file.openFailed': 'Impossible d’ouvrir ce fichier.',
  'app.file.savedToBrowser': 'Enregistré dans le navigateur',
  'app.file.saveFailed': 'Échec de l’enregistrement : {error}',

  // print.ts / playback.ts
  'app.print.nothing': 'Rien à imprimer',
  'app.playback.nothing': 'Rien à animer pour l’instant. Sélectionnez un connecteur et choisissez une animation dans le panneau des propriétés.',
} satisfies Translation<typeof en>;
