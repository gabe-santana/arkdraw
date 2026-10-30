import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit
  'chrome.ui.clearSearch': 'Effacer la recherche',
  'chrome.ui.mixed': 'Mixte',
  'chrome.ui.recentColors': 'Récentes',

  // Toolbar and zoom pill
  'chrome.toolbar.label': 'Outils',
  'chrome.toolbar.playAnimation': 'Lire l’animation',
  'chrome.toolbar.pauseAnimation': 'Mettre l’animation en pause',
  'chrome.zoom.out': 'Zoom arrière',
  'chrome.zoom.in': 'Zoom avant',
  'chrome.zoom.options': 'Options de zoom',

  // Outline
  'chrome.outline.title': 'Vue d’ensemble',
  'chrome.outline.close': 'Fermer la vue d’ensemble',

  // PageTabs
  'chrome.pageTabs.editData': 'Modifier les données…',
  'chrome.pageTabs.insertPage': 'Insérer une page',
  'chrome.pageTabs.allPages': 'Toutes les pages',
  'chrome.pageTabs.findPage': 'Chercher une page',
  'chrome.pageTabs.noMatch': 'Aucune page ne correspond',
  'chrome.pageTabs.deleteTitle': 'Supprimer « {name} » ?',
  'chrome.pageTabs.deleteMessage': '{count, plural, one {Elle contient # élément} other {Elle contient # éléments}}. La suppression d’une page est définitive.',

  // StartScreen
  'chrome.start.title': 'Bienvenue dans ArkDraw',
  'chrome.start.subtitle': 'Créez un diagramme ou reprenez là où vous vous étiez arrêté.',
  'chrome.start.blank': 'Diagramme vierge',
  'chrome.start.blankSub': 'Partir d’un canevas vide',
  'chrome.start.templates': 'Modèles…',
  'chrome.start.templatesSub': 'Parcourir la galerie et Mes modèles',
  'chrome.start.open': 'Ouvrir…',
  'chrome.start.openSubDesktop': 'Un fichier sur cet ordinateur',
  'chrome.start.openSubWeb': 'Un fichier de votre appareil',
  'chrome.start.openBrowser': 'Ouvrir depuis le navigateur…',
  'chrome.start.openBrowserSub': 'Diagrammes enregistrés dans ce navigateur',
  'chrome.start.templatesHeading': 'Modèles',
  'chrome.start.recentHeading': 'Récents',
  'chrome.start.recentEmpty': 'Les fichiers que vous ouvrez ou enregistrez apparaîtront ici.',
  'chrome.start.dontShow': 'Ne plus afficher',
  'chrome.start.reenableHint': 'Réactivez-le dans les Préférences',

  // EditDialogs — Edit data
  'chrome.editData.title': 'Modifier les données',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'Affiché dans le panneau Calques',
  'chrome.editData.tooltip': 'Info-bulle',
  'chrome.editData.tooltipPlaceholder': 'Affichée au survol',
  'chrome.editData.link': 'Lien',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'Balises',
  'chrome.editData.tagsPlaceholder': 'frontend, critique',
  'chrome.editData.properties': 'Propriétés',
  'chrome.editData.keyPlaceholder': 'clé',
  'chrome.editData.valuePlaceholder': 'valeur',
  'chrome.editData.addProperty': 'Ajouter une propriété',
  'chrome.editData.placeholders': 'Remplacer les espaces réservés {token} dans l’étiquette',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'Modifier le style',
  'chrome.editStyle.subtitleDrawio': 'Chaîne de style (key=value;) — appliquée à toute la sélection',
  'chrome.editStyle.styleString': 'Chaîne de style',
  'chrome.editStyle.subtitleArkdraw': 'Clés de style ArkDraw, une par ligne — appliquées à toute la sélection',
  'chrome.editStyle.keptKeys': 'Les clés non utilisées par ArkDraw sont conservées et réécrites lors de l’export .drawio.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'Modifier le diagramme',
  'chrome.editDiagram.subtitle': 'La page actuelle au format JSON ArkDraw. Les modifications peuvent être annulées.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': 'Afficher/masquer le remplacement',
  'chrome.find.placeholder': 'Rechercher dans les étiquettes, noms, info-bulles et données',
  'chrome.find.matchCase': 'Respecter la casse',
  'chrome.find.wholeWord': 'Mot entier',
  'chrome.find.regex': 'Expression régulière',
  'chrome.find.allPages': 'Toutes les pages',
  'chrome.find.allPagesShort': 'Tout',
  'chrome.find.replaceWith': 'Remplacer par',
  'chrome.find.replace': 'Remplacer',
  'chrome.find.replaceAll': 'Tout',

  // EditDialogs — Import from text
  'chrome.import.none': 'Aucun importateur de texte n’est installé.',
  'chrome.import.fromText': 'Importer depuis du texte',
  'chrome.import.asNewPage': 'Dans une nouvelle page',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': 'Formes',
  'chrome.dock.panel.format': 'Format',
  'chrome.dock.panel.layers': 'Calques',
  'chrome.dock.moveLeft': 'Placer à gauche',
  'chrome.dock.moveRight': 'Placer à droite',
  'chrome.dock.moveUp': 'Monter',
  'chrome.dock.moveDown': 'Descendre',
  'chrome.dock.reset': 'Réinitialiser la disposition des panneaux',
  'chrome.dock.handleAria': 'Panneau {panel} : faites glisser pour déplacer, cliquez pour les options',
  'chrome.dock.handleTitle': 'Faire glisser pour déplacer · cliquer pour les options',
  'chrome.dock.dropHere': 'Déposer ici',
  'chrome.dock.resizeLeft': 'Redimensionner les panneaux de gauche',
  'chrome.dock.resizeRight': 'Redimensionner les panneaux de droite',
  'chrome.rightTabs.aria': 'Panneau de droite',
  'chrome.rightTabs.design': 'Design',
  'chrome.rightTabs.designHint': 'Style de la sélection',
  'chrome.rightTabs.layersHint': 'Calques et tous les éléments, de l’avant vers l’arrière',
  'chrome.rightTabs.ai': 'IA',
  'chrome.rightTabs.aiHint': 'Dites ce que vous voulez : l\'assistant le dessine ou le modifie',
} satisfies Translation<typeof en>;
