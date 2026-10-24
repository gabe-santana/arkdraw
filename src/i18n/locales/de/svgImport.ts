import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'SVG importieren',
  'svgImport.message': '{name} als einzelnes Bild einfügen oder seine Pfade, Formen und Texte in bearbeitbare Formen umwandeln.',
  'svgImport.unnamed': 'dieses SVG',
  'svgImport.perGroup': 'Eine Form pro Gruppe (behält Farben, weniger Formen)',
  'svgImport.asImage': 'Als Bild einfügen',
  'svgImport.convert': 'In Formen umwandeln',
  'svgImport.converted': '{count, plural, one {In # Form umgewandelt (gruppiert).} other {In # Formen umgewandelt (gruppiert).}}',
  'svgImport.pickTitle': 'SVG als Formen',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': 'Diese Datei ist kein gültiges SVG-Bild.',
  'svgImport.msg.empty': 'Das SVG enthält nichts, was in Formen umgewandelt werden kann.',
  'svgImport.msg.gradient': 'Farbverläufe wurden durch ihre erste Farbe ersetzt.',
  'svgImport.msg.pattern': 'Musterfüllungen wurden durch eine Vollfarbe ersetzt.',
  'svgImport.msg.clip': 'Beschneidungspfade und Masken wurden ignoriert.',
  'svgImport.msg.filter': 'Filter (Unschärfe, Schatten) wurden ignoriert.',
  'svgImport.msg.marker': 'Pfadmarkierungen wurden ignoriert (Linien behalten einfache Pfeilspitzen).',
  'svgImport.msg.skewText': 'Verzerrte Texte und Bilder wurden durch ihren gedrehten Rahmen angenähert.',
  'svgImport.msg.foreign': 'Eingebettetes HTML (foreignObject) wurde in reinen Text umgewandelt.',
  'svgImport.msg.relativeImage': 'Bilder mit relativen Links wurden übersprungen.',
} satisfies Translation<typeof en>;
