import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'Importar SVG',
  'svgImport.message': 'Insira {name} como uma única imagem ou converta seus caminhos, formas e textos em formas editáveis.',
  'svgImport.unnamed': 'este SVG',
  'svgImport.perGroup': 'Uma forma por grupo (mantém as cores, menos formas)',
  'svgImport.asImage': 'Inserir como imagem',
  'svgImport.convert': 'Converter em formas',
  'svgImport.converted': '{count, plural, =0 {Convertido em 0 formas (agrupadas).} one {Convertido em # forma (agrupada).} other {Convertido em # formas (agrupadas).}}',
  'svgImport.pickTitle': 'SVG como formas',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': 'Este arquivo não é uma imagem SVG válida.',
  'svgImport.msg.empty': 'O SVG não tem nada que possa ser convertido em formas.',
  'svgImport.msg.gradient': 'Os gradientes foram substituídos pela primeira cor.',
  'svgImport.msg.pattern': 'Os preenchimentos com padrão foram substituídos por uma cor sólida.',
  'svgImport.msg.clip': 'Caminhos de recorte e máscaras foram ignorados.',
  'svgImport.msg.filter': 'Os filtros (desfoque, sombras) foram ignorados.',
  'svgImport.msg.marker': 'Os marcadores de caminho foram ignorados (as linhas mantêm pontas de seta simples).',
  'svgImport.msg.skewText': 'Textos e imagens inclinados foram aproximados pela caixa rotacionada.',
  'svgImport.msg.foreign': 'O HTML incorporado (foreignObject) foi convertido em texto simples.',
  'svgImport.msg.relativeImage': 'Imagens com links relativos foram ignoradas.',
} satisfies Translation<typeof en>;
