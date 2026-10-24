import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': '도형 편집',
  'stencils.insertTitle': '도형 삽입',
  'stencils.stencilXml': 'mxGraph 스텐실 XML',
  'stencils.builtIn': '{shape}은(는) 기본 제공 도형입니다',
  'stencils.insertSubtitle': 'mxGraph 스텐실 XML로 도형을 정의하세요',
  'stencils.convertInfo':
    '기본 제공 도형은 코드로 그려집니다. 적용하면 이 도형이 현재 비율 그대로 편집 가능한 {customShape}으로 변환되며 텍스트, 스타일, 연결은 유지됩니다.',
  'stencils.customShapeTerm': '사용자 지정 도형',
  'stencils.replaceInfo': '처음부터 작성한 사용자 지정 도형으로 바꿀 수도 있습니다.',
  'stencils.startFromSample': '샘플로 시작',
  'stencils.fileType': '스텐실 XML',
  'stencils.customShape': '사용자 지정 도형',
  'stencils.addedToScratchpad': '“{name}”을(를) 스크래치패드에 추가했습니다',
  'stencils.noShape': '이 파일에 <shape>가 없습니다.',
  'stencils.firstOfMany': '도형 {count}개 중 첫 번째 도형을 불러왔습니다. 모두 가져오려면 파일을 라이브러리로 가져오세요.',
  'stencils.fixToPreview': '미리 보려면 XML을 수정하세요',
  'stencils.nothingToPreview': '미리 볼 내용이 없습니다',
  'stencils.aspect': '비율 {aspect}',
  'stencils.connectionPoints': '{count, plural, other {연결점 #개}}',
  'stencils.stroke': '선 {width}',
  'stencils.strokeFromStyle': '스타일의 선 사용',
  'stencils.ignored': '무시됨: {items}',
  'stencils.openXml': 'XML 열기…',
  'stencils.revert': '되돌리기',
  'stencils.convertApply': '변환 및 적용',
  'stencils.addToScratchpad': '스크래치패드에 추가',

  // convert.ts — why a built-in shape can't become a stencil ({shape} is the shape name)
  'stencils.convert.noStencil': '이 사용자 지정 도형에는 아직 스텐실이 없습니다.',
  'stencils.convert.ownText': '{shape}은(는) 자체 텍스트를 그리므로 스텐실로 표현할 수 없습니다.',
  'stencils.convert.unsupported': '{shape}은(는) 스텐실로 표현할 수 없는 기능을 사용하는 기본 제공 도형입니다({why}).',
  'stencils.convert.dynamic': '동적 렌더링',
  'stencils.convert.noOutline': '{shape}에는 변환할 윤곽선이 없습니다.',
} satisfies Translation<typeof en>;
