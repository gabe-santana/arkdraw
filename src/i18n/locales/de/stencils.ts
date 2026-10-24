import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': 'Form bearbeiten',
  'stencils.insertTitle': 'Form einfügen',
  'stencils.stencilXml': 'mxGraph-Schablonen-XML',
  'stencils.builtIn': '{shape} ist eine integrierte Form',
  'stencils.insertSubtitle': 'Form in mxGraph-Schablonen-XML beschreiben',
  'stencils.convertInfo':
    'Integrierte Formen werden per Code gezeichnet. Beim Anwenden wird diese in eine bearbeitbare {customShape} mit den aktuellen Proportionen umgewandelt; Text, Stil und Verbindungen bleiben erhalten.',
  'stencils.customShapeTerm': 'benutzerdefinierte Form',
  'stencils.replaceInfo': 'Sie können sie weiterhin durch eine von Grund auf neu geschriebene benutzerdefinierte Form ersetzen.',
  'stencils.startFromSample': 'Mit Beispiel beginnen',
  'stencils.fileType': 'Schablonen-XML',
  'stencils.customShape': 'Benutzerdefinierte Form',
  'stencils.addedToScratchpad': '„{name}“ zum Notizblock hinzugefügt',
  'stencils.noShape': 'Kein <shape> in dieser Datei.',
  'stencils.firstOfMany': 'Die erste von {count} Formen wurde geladen. Importieren Sie die Datei als Bibliothek, um alle zu erhalten.',
  'stencils.fixToPreview': 'XML korrigieren, um eine Vorschau zu sehen',
  'stencils.nothingToPreview': 'Keine Vorschau verfügbar',
  'stencils.aspect': 'Seitenverhältnis: {aspect}',
  'stencils.connectionPoints': '{count, plural, one {# Verbindungspunkt} other {# Verbindungspunkte}}',
  'stencils.stroke': 'Linie {width}',
  'stencils.strokeFromStyle': 'Linie aus Stil',
  'stencils.ignored': 'Ignoriert: {items}',
  'stencils.openXml': 'XML öffnen…',
  'stencils.revert': 'Zurücksetzen',
  'stencils.convertApply': 'Umwandeln & anwenden',
  'stencils.addToScratchpad': 'Zum Notizblock hinzufügen',

  // convert.ts — why a built-in shape can't become a stencil ({shape} is the shape name)
  'stencils.convert.noStencil': 'Diese benutzerdefinierte Form hat noch keine Schablone.',
  'stencils.convert.ownText': '{shape} zeichnet eigenen Text, den Schablonen nicht abbilden können.',
  'stencils.convert.unsupported': '{shape} ist eine integrierte Form mit Funktionen, die Schablonen nicht abbilden können ({why}).',
  'stencils.convert.dynamic': 'dynamisches Rendering',
  'stencils.convert.noOutline': '{shape} hat keine Kontur zum Umwandeln.',
} satisfies Translation<typeof en>;
