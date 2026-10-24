import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': '다이어그램 로드 중…',
  'viewer.openFailed': '이 다이어그램을 열 수 없습니다',
  'viewer.viewTitle': '다이어그램 보기',
  'viewer.emptyHint': '다이어그램 파일을 여기에 놓거나 기기에서 여세요. 아무것도 업로드되지 않습니다.',
  'viewer.openFile': '파일 열기…',
  'viewer.openEditor': '편집기 열기',

  // Viewer — toolbar
  'viewer.openNewTab': '새 탭에서 열기',
  'viewer.editInArkDraw': 'ArkDraw에서 편집',
  'viewer.previousPage': '이전 페이지',
  'viewer.nextPage': '다음 페이지',
  'viewer.zoomOut': '축소',
  'viewer.zoomIn': '확대',
  'viewer.resetZoom': '100%로 초기화',
  'viewer.fit': '화면에 맞추기',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': '“{name}”(으)로 이동',
  'viewer.goToPageUnnamed': '“페이지”로 이동',
  'viewer.runAction': '클릭하여 동작 실행',
  'viewer.unsupportedLink': '지원되지 않는 링크',
} satisfies Translation<typeof en>;
