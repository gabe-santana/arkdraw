import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': 'Stockage du navigateur',
  'storage.subtitle': 'Diagrammes conservés dans ce navigateur (IndexedDB). Ils restent sur cet appareil et ne sont envoyés nulle part.',
  'storage.searchPlaceholder': 'Rechercher des documents',
  'storage.addFiles': 'Ajouter des fichiers…',
  'storage.saveCurrent': 'Enregistrer l’actuel',
  'storage.noMatches': 'Aucun document ne correspond à votre recherche.',
  'storage.empty': 'Aucun diagramme enregistré dans ce navigateur pour l’instant. Utilisez « Enregistrer l’actuel » ou Fichier → Enregistrer dans le navigateur.',
  'storage.openDoc': 'Ouvrir {name}',
  'storage.emptyThumb': 'Vide',
  'storage.download': 'Télécharger le .opendraw',
  'storage.docActions': 'Actions sur le document',
  'storage.fileType': 'Diagramme OpenDraw',
  'storage.opened': '« {name} » ouvert',
  'storage.savedToBrowser': '« {name} » enregistré dans le navigateur',
  'storage.deleteTitle': 'Supprimer « {name} » ?',
  'storage.deleteMessage': 'Il sera supprimé du stockage de ce navigateur. Cette action est irréversible.',
  'storage.notADiagram': '« {name} » n’est pas un diagramme OpenDraw.',
  'storage.justNow': 'à l’instant',
  'storage.minutesAgo': 'il y a {count} min',
  'storage.hoursAgo': 'il y a {count} h',

  // library.ts
  'storage.saveFailed': 'Impossible d’enregistrer dans le navigateur : {error}',
  'storage.docGone': 'Ce document ne se trouve plus dans la bibliothèque du navigateur.',

  // recent.ts
  'storage.recentGone': 'Ce document récent n’est plus disponible.',
  'storage.recentPermission': 'L’autorisation de lire « {name} » a été refusée.',
  'storage.recentRemoved': '« {name} » a été retiré de la bibliothèque du navigateur.',

  // userTemplates.ts
  'storage.templateDescription': 'Enregistré à partir de l’un de vos diagrammes.',
} satisfies Translation<typeof en>;
