import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': 'Modifier la forme',
  'stencils.insertTitle': 'Insérer une forme',
  'stencils.stencilXml': 'XML de stencil mxGraph',
  'stencils.builtIn': '{shape} est une forme intégrée',
  'stencils.insertSubtitle': 'Décrivez une forme en XML de stencil mxGraph',
  'stencils.convertInfo':
    'Les formes intégrées sont dessinées par du code. Appliquer convertit celle-ci en {customShape} modifiable, à ses proportions actuelles ; le texte, le style et les connexions sont conservés.',
  'stencils.customShapeTerm': 'forme personnalisée',
  'stencils.replaceInfo': 'Vous pouvez aussi la remplacer par une forme personnalisée écrite de zéro.',
  'stencils.startFromSample': 'Partir d’un exemple',
  'stencils.fileType': 'XML de stencil',
  'stencils.customShape': 'Forme personnalisée',
  'stencils.addedToScratchpad': '« {name} » ajouté au Bloc-notes',
  'stencils.noShape': 'Aucun élément <shape> dans ce fichier.',
  'stencils.firstOfMany': 'Première forme sur {count} chargée. Importez le fichier en tant que bibliothèque pour les obtenir toutes.',
  'stencils.fixToPreview': 'Corrigez le XML pour afficher un aperçu',
  'stencils.nothingToPreview': 'Rien à prévisualiser',
  'stencils.aspect': 'aspect {aspect}',
  'stencils.connectionPoints': '{count, plural, one {# point de connexion} other {# points de connexion}}',
  'stencils.stroke': 'trait {width}',
  'stencils.strokeFromStyle': 'trait défini par le style',
  'stencils.ignored': 'Ignorés : {items}',
  'stencils.openXml': 'Ouvrir un XML…',
  'stencils.revert': 'Revenir à l’original',
  'stencils.convertApply': 'Convertir et appliquer',
  'stencils.addToScratchpad': 'Ajouter au Bloc-notes',

  // convert.ts
  'stencils.convert.noStencil': 'Cette forme personnalisée n’a pas encore de stencil.',
  'stencils.convert.ownText': '{shape} dessine son propre texte, ce que les stencils ne peuvent pas exprimer.',
  'stencils.convert.unsupported': '{shape} est une forme intégrée qui utilise des fonctionnalités que les stencils ne peuvent pas exprimer ({why}).',
  'stencils.convert.dynamic': 'rendu dynamique',
  'stencils.convert.noOutline': '{shape} n’a pas de contour à convertir.',
} satisfies Translation<typeof en>;
