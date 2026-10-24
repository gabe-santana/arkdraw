import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': 'à l’instant',
  'collab.connector': 'Connecteur',
  'collab.shape': 'Forme',

  // Comments
  'collab.comments': 'Commentaires',
  'collab.resolved': 'Résolus',
  'collab.closeComments': 'Fermer les commentaires',
  'collab.noComments': 'Aucun commentaire pour l’instant. Sélectionnez une forme et laissez une note à votre équipe — les commentaires sont enregistrés dans le fichier.',
  'collab.commentOn': 'Commenter « {name} »…',
  'collab.selectToComment': 'Sélectionnez un élément pour le commenter',
  'collab.comment': 'Commenter',
  'collab.reply': 'Répondre…',
  'collab.reopen': 'Rouvrir',
  'collab.resolve': 'Résoudre',

  // Revision history
  'collab.revisions': 'Historique des révisions',
  'collab.revisionsSubtitle': 'Instantanés locaux de « {name} », pris à chaque enregistrement et pendant que vous travaillez.',
  'collab.noRevisions': 'Aucune révision pour l’instant. Enregistrez le diagramme pour en créer une.',
  'collab.revisionSaved': 'Enregistrée',
  'collab.revisionAuto': 'Instantané auto',
  'collab.revisionElements': '{count, plural, one {# élément} other {# éléments}}',
  'collab.deleteRevision': 'Supprimer la révision',
  'collab.revisionPreview': 'Aperçu de la révision',
  'collab.selectRevision': 'Sélectionnez une révision',
  'collab.openAsCopy': 'Ouvrir une copie',
  'collab.restore': 'Restaurer',
  'collab.restoredSuffix': '{name} (restauré)',

  // Preferences
  'prefs.title': 'Préférences',
  'prefs.language': 'Langue',
  'prefs.languageAuto': 'Auto (système : {language})',
  'prefs.languageHint': 'Les noms de formes et les termes de recherche d’icônes restent en anglais.',
  'prefs.author': 'Votre nom (pour les commentaires)',
  'prefs.authorPlaceholder': 'p. ex. Ada Lovelace',
  'prefs.defaultFont': 'Police par défaut des nouvelles formes',
  'prefs.fontHand': 'Manuscrite',
  'prefs.palette': 'Palette personnalisée (couleurs hexadécimales séparées par des virgules)',
  'prefs.autosave': 'Enregistrer automatiquement les modifications du fichier ouvert',
  'prefs.startScreen': 'Afficher l’écran d’accueil au démarrage',
  'prefs.autosaveDesktop': 'Les fichiers sont enregistrés environ une seconde après chaque modification (un fichier .bkp conserve la version précédente si les sauvegardes sont activées).',
  'prefs.autosaveWeb': 'Fonctionne pour les fichiers ouverts ou enregistrés via le sélecteur de fichiers du navigateur, ainsi que pour les documents de la bibliothèque du navigateur.',
  'prefs.autosaveFailed': 'Échec de l’enregistrement automatique : {error}',
} satisfies Translation<typeof en>;
