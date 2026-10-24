import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas
  'canvas.roleDescription': 'canevas de diagramme',
  'canvas.ariaLabel': 'Canevas du diagramme. Tab passe d’une forme à l’autre, Alt+Flèche suit les connexions, Shift+F10 ouvre le menu contextuel.',

  // Canvas → empty-page hint
  'canvas.empty.title': 'Commencez avec un canevas vide',
  'canvas.empty.body': 'Faites glisser des formes depuis la bibliothèque, dessinez avec la barre d’outils ou décrivez un diagramme et laissez l’IA l’esquisser pour vous.',
  'canvas.empty.rectangle': 'rectangle',
  'canvas.empty.connector': 'connecteur',
  'canvas.empty.ai': 'IA',

  // ShapePicker
  'canvas.picker.replaceWith': 'Remplacer par…',
  'canvas.picker.insertShape': 'Insérer une forme…',
  'canvas.picker.noMatch': 'Aucune forme ne correspond.',

  // GroupIsolation
  'canvas.group.breadcrumbLabel': 'Groupes ouverts',
  'canvas.group.backToDiagram': 'Revenir au diagramme entier (Home)',
  'canvas.group.group': 'Groupe',
  'canvas.group.subgroup': 'Sous-groupe',
  'canvas.group.exit': 'Quitter le groupe',
  'canvas.group.nothingNested': 'Rien d’imbriqué dans la sélection',

  // OverlayLayer
  'canvas.flash.grouped': 'Groupé · {count}',
  'canvas.flash.ungrouped': 'Dissocié · {count}',

  // ParamHandles
  'canvas.param.corner': 'Coin {value}',

  // links
  'canvas.link.invalidAction': 'L’action de ce lien n’est pas du JSON valide.',
  'canvas.link.pageMissing': 'Cette page n’existe plus.',
  'canvas.link.unsupportedScheme': 'Seuls les liens web, e-mail et téléphone peuvent être ouverts.',

  // Screen-reader labels
  'canvas.aria.icon': 'Icône',
  'canvas.aria.connectorRole': 'connecteur',
  'canvas.aria.labeled': '{kind} : {text}',
  'canvas.aria.connectorFromTo': 'Connecteur de {from} à {to}',
  'canvas.aria.connectorNamedFromTo': 'Connecteur « {text} » de {from} à {to}',
  'canvas.aria.nothing': 'rien',
  'canvas.aria.nothingSelected': 'Aucune sélection',
  'canvas.aria.selectedOne': 'Sélection : {description}',
  'canvas.aria.selectedMany': 'Sélection : {count, plural, one {# élément} other {# éléments}}',

  // TableCellLayer
  'canvas.table.cellLabel': 'Cellule ligne {row}, colonne {column}',

  // PointEditor
  'canvas.points.addHint': 'Double-cliquez pour ajouter un point',

  // BrushPopover
  'canvas.brush.options': 'Options du pinceau',
  'canvas.brush.title': 'Pinceau',
  'canvas.brush.color': 'Couleur du pinceau',
  'canvas.brush.smooth': 'Lissage',
  'canvas.brush.pressure': 'Pression du stylet (largeur variable)',

  // behavior.ts
  'canvas.behavior.movable': 'Déplaçable',
  'canvas.behavior.movableHint': 'Peut être glissé ou déplacé au clavier',
  'canvas.behavior.resizable': 'Redimensionnable',
  'canvas.behavior.resizableHint': 'Affiche les poignées de redimensionnement',
  'canvas.behavior.rotatable': 'Pivotable',
  'canvas.behavior.rotatableHint': 'Affiche la poignée de rotation',
  'canvas.behavior.deletable': 'Supprimable',
  'canvas.behavior.deletableHint': 'La touche Suppr le supprime',
  'canvas.behavior.editable': 'Modifiable',
  'canvas.behavior.editableHint': 'Double-clic pour modifier l’étiquette',
  'canvas.behavior.connectable': 'Connectable',
  'canvas.behavior.connectableHint': 'Les connecteurs peuvent s’y attacher',
  'canvas.behavior.selectable': 'Sélectionnable',
  'canvas.behavior.selectableHint': 'Sélectionnable par clic ou rectangle de sélection',

  // FormatBar
  'canvas.format.toolbar': 'Format du texte',
  'canvas.format.bold': 'Gras ({shortcut})',
  'canvas.format.italic': 'Italique ({shortcut})',
  'canvas.format.underline': 'Souligné ({shortcut})',
  'canvas.format.strikethrough': 'Barré',
  'canvas.format.smaller': 'Réduire ({shortcut})',
  'canvas.format.larger': 'Agrandir ({shortcut})',
  'canvas.format.textColor': 'Couleur du texte',
  'canvas.format.highlight': 'Surligner',
  'canvas.format.subscript': 'Indice',
  'canvas.format.superscript': 'Exposant',
  'canvas.format.link': 'Lien',
  'canvas.format.removeLink': 'Supprimer le lien',
  'canvas.format.clearFormatting': 'Effacer la mise en forme',
} satisfies Translation<typeof en>;
