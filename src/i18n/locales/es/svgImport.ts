import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'Importar SVG',
  'svgImport.message': 'Inserta {name} como una sola imagen o convierte sus trazados, formas y texto en formas editables.',
  'svgImport.unnamed': 'este SVG',
  'svgImport.perGroup': 'Una forma por grupo (conserva los colores, menos formas)',
  'svgImport.asImage': 'Insertar como imagen',
  'svgImport.convert': 'Convertir en formas',
  'svgImport.converted': '{count, plural, one {Convertido en # forma (agrupada).} other {Convertido en # formas (agrupadas).}}',
  'svgImport.pickTitle': 'SVG como formas',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': 'Este archivo no es una imagen SVG válida.',
  'svgImport.msg.empty': 'El SVG no contiene nada que se pueda convertir en formas.',
  'svgImport.msg.gradient': 'Los degradados se sustituyeron por su primer color.',
  'svgImport.msg.pattern': 'Los rellenos de patrón se sustituyeron por un color liso.',
  'svgImport.msg.clip': 'Se ignoraron los trazados de recorte y las máscaras.',
  'svgImport.msg.filter': 'Se ignoraron los filtros (desenfoque, sombras).',
  'svgImport.msg.marker': 'Se ignoraron los marcadores de trazado (las líneas conservan puntas de flecha simples).',
  'svgImport.msg.skewText': 'El texto y las imágenes sesgados se aproximaron mediante su cuadro girado.',
  'svgImport.msg.foreign': 'El HTML incrustado (foreignObject) se convirtió en texto sin formato.',
  'svgImport.msg.relativeImage': 'Se omitieron las imágenes con enlaces relativos.',
} satisfies Translation<typeof en>;
