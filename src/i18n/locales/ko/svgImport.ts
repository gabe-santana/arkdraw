import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'SVG 가져오기',
  'svgImport.message': '{name}을(를) 단일 이미지로 삽입하거나, 경로와 도형, 텍스트를 편집 가능한 도형으로 변환하세요.',
  'svgImport.unnamed': '이 SVG',
  'svgImport.perGroup': '그룹당 도형 하나(색상 유지, 도형 수 감소)',
  'svgImport.asImage': '이미지로 삽입',
  'svgImport.convert': '도형으로 변환',
  'svgImport.converted': '{count, plural, other {도형 #개로 변환했습니다(그룹화됨).}}',
  'svgImport.pickTitle': 'SVG를 도형으로',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': '이 파일은 올바른 SVG 이미지가 아닙니다.',
  'svgImport.msg.empty': '이 SVG에는 도형으로 변환할 수 있는 항목이 없습니다.',
  'svgImport.msg.gradient': '그라데이션은 첫 번째 색으로 대체되었습니다.',
  'svgImport.msg.pattern': '패턴 채우기는 단색으로 대체되었습니다.',
  'svgImport.msg.clip': '클리핑 경로와 마스크는 무시되었습니다.',
  'svgImport.msg.filter': '필터(흐림, 그림자)는 무시되었습니다.',
  'svgImport.msg.marker': '경로 마커는 무시되었습니다(선에는 단순 화살촉이 유지됨).',
  'svgImport.msg.skewText': '기울어진 텍스트와 이미지는 회전된 상자로 근사 처리되었습니다.',
  'svgImport.msg.foreign': '포함된 HTML(foreignObject)은 일반 텍스트로 변환되었습니다.',
  'svgImport.msg.relativeImage': '상대 링크가 있는 이미지는 건너뛰었습니다.',
} satisfies Translation<typeof en>;
