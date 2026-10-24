import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': '브라우저 저장소',
  'storage.subtitle': '이 브라우저(IndexedDB)에 보관된 다이어그램입니다. 이 기기에만 저장되며 어디에도 업로드되지 않습니다.',
  'storage.searchPlaceholder': '문서 검색',
  'storage.addFiles': '파일 추가…',
  'storage.saveCurrent': '현재 문서 저장',
  'storage.noMatches': '검색과 일치하는 문서가 없습니다.',
  'storage.empty': '이 브라우저에 저장된 다이어그램이 아직 없습니다. “현재 문서 저장” 또는 파일 → 브라우저에 저장을 사용하세요.',
  'storage.openDoc': '{name} 열기',
  'storage.emptyThumb': '비어 있음',
  'storage.download': '.opendraw 다운로드',
  'storage.docActions': '문서 작업',
  'storage.fileType': 'OpenDraw 다이어그램',
  'storage.opened': '“{name}”을(를) 열었습니다',
  'storage.savedToBrowser': '“{name}”을(를) 브라우저에 저장했습니다',
  'storage.deleteTitle': '“{name}”을(를) 삭제하시겠습니까?',
  'storage.deleteMessage': '이 브라우저의 저장소에서 제거됩니다. 이 작업은 되돌릴 수 없습니다.',
  'storage.notADiagram': '“{name}”은(는) OpenDraw 다이어그램이 아닙니다.',
  'storage.justNow': '방금',
  'storage.minutesAgo': '{count}분 전',
  'storage.hoursAgo': '{count}시간 전',

  // library.ts
  'storage.saveFailed': '브라우저에 저장할 수 없습니다: {error}',
  'storage.docGone': '해당 문서가 더 이상 브라우저 라이브러리에 없습니다.',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': '이 최근 문서를 더 이상 사용할 수 없습니다.',
  'storage.recentPermission': '“{name}”을(를) 읽을 권한이 거부되었습니다.',
  'storage.recentRemoved': '“{name}”이(가) 브라우저 라이브러리에서 제거되었습니다.',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': '내 다이어그램에서 저장한 템플릿입니다.',
} satisfies Translation<typeof en>;
