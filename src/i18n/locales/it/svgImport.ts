import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'Importa SVG',
  'svgImport.message': 'Inserisci {name} come singola immagine oppure converti tracciati, forme e testo in forme modificabili.',
  'svgImport.unnamed': 'questo SVG',
  'svgImport.perGroup': 'Una forma per gruppo (mantiene i colori, meno forme)',
  'svgImport.asImage': 'Inserisci come immagine',
  'svgImport.convert': 'Converti in forme',
  'svgImport.converted': '{count, plural, one {Convertito in # forma (raggruppata).} other {Convertito in # forme (raggruppate).}}',
  'svgImport.pickTitle': 'SVG come forme',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': 'Questo file non è un’immagine SVG valida.',
  'svgImport.msg.empty': 'L’SVG non contiene nulla che si possa convertire in forme.',
  'svgImport.msg.gradient': 'I gradienti sono stati sostituiti dal loro primo colore.',
  'svgImport.msg.pattern': 'I riempimenti a motivo sono stati sostituiti da un colore uniforme.',
  'svgImport.msg.clip': 'Tracciati di ritaglio e maschere sono stati ignorati.',
  'svgImport.msg.filter': 'I filtri (sfocatura, ombre) sono stati ignorati.',
  'svgImport.msg.marker': 'I marcatori dei tracciati sono stati ignorati (le linee mantengono punte di freccia semplici).',
  'svgImport.msg.skewText': 'Testo e immagini inclinati sono stati approssimati con il riquadro ruotato.',
  'svgImport.msg.foreign': 'L’HTML incorporato (foreignObject) è stato convertito in testo semplice.',
  'svgImport.msg.relativeImage': 'Le immagini con collegamenti relativi sono state ignorate.',
} satisfies Translation<typeof en>;
