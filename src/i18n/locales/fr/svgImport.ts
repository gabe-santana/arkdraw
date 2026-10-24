import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'Importer un SVG',
  'svgImport.message': 'Insérez {name} comme image unique, ou convertissez ses tracés, formes et textes en formes modifiables.',
  'svgImport.unnamed': 'ce SVG',
  'svgImport.perGroup': 'Une forme par groupe (conserve les couleurs, moins de formes)',
  'svgImport.asImage': 'Insérer comme image',
  'svgImport.convert': 'Convertir en formes',
  'svgImport.converted': '{count, plural, one {Converti en # forme (groupée).} other {Converti en # formes (groupées).}}',
  'svgImport.pickTitle': 'SVG en tant que formes',

  // Conversion notes
  'svgImport.msg.invalid': 'Ce fichier n’est pas une image SVG valide.',
  'svgImport.msg.empty': 'Ce SVG ne contient rien qui puisse être converti en formes.',
  'svgImport.msg.gradient': 'Les dégradés ont été remplacés par leur première couleur.',
  'svgImport.msg.pattern': 'Les remplissages à motif ont été remplacés par une couleur unie.',
  'svgImport.msg.clip': 'Les tracés de détourage et les masques ont été ignorés.',
  'svgImport.msg.filter': 'Les filtres (flou, ombres) ont été ignorés.',
  'svgImport.msg.marker': 'Les marqueurs de tracé ont été ignorés (les lignes conservent des pointes de flèche simples).',
  'svgImport.msg.skewText': 'Les textes et images inclinés ont été approximés par leur cadre pivoté.',
  'svgImport.msg.foreign': 'Le HTML incorporé (foreignObject) a été converti en texte brut.',
  'svgImport.msg.relativeImage': 'Les images avec des liens relatifs ont été ignorées.',
} satisfies Translation<typeof en>;
