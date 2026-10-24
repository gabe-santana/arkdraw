import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  'app.dismiss': '닫기',
  'app.restoredUnsaved': '저장하지 않은 다이어그램을 복원했습니다',

  // commands.ts
  'app.style.copied': '스타일이 복사되었습니다',
  'app.style.copyFirst': '먼저 스타일을 복사하세요',
  'app.style.defaultSet': '새 도형에 이 스타일이 사용됩니다',
  'app.style.defaultReset': '기본 스타일이 초기화되었습니다',
  'app.layout.nothing': '배치할 항목이 없습니다',
  'app.copyAs.done': '{format}(으)로 복사했습니다',
  'app.copyAs.failed': '복사 실패: {error}',
  'app.image.loadFailed': '해당 URL에서 이미지를 로드할 수 없습니다.',
  'app.image.linked': '이미지가 포함되지 않고 링크되었습니다. 서버에서 다운로드를 차단하므로 표시하려면 인터넷 연결이 필요합니다.',
  'app.image.urlTitle': 'URL에서 이미지 삽입',
  'app.image.urlMessage': 'PNG, JPEG, GIF, WebP, SVG 이미지 링크 또는 data: URI를 붙여 넣으세요.',
  'app.image.urlInvalid': 'http(s) 또는 data:image URL을 입력하세요.',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': '모든 다이어그램',
  'app.filter.opendraw': 'ArkDraw 다이어그램',
  'app.filter.drawio': '다이어그램 XML(.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': '“{name}”의 변경 사항을 저장하시겠습니까?',
  'app.discard.message': '저장하지 않으면 변경 사항이 손실됩니다.',
  'app.discard.deny': '저장 안 함',
  'app.file.imported': '{count, plural, other {요소 #개를 가져왔습니다}}',
  'app.file.importedPages': '{pages}개 페이지에서 {count, plural, other {요소 #개}}를 가져왔습니다',
  'app.file.openFailed': '이 파일을 열 수 없습니다.',
  'app.file.savedToBrowser': '브라우저에 저장했습니다',
  'app.file.saveFailed': '저장 실패: {error}',

  // print.ts / playback.ts
  'app.print.nothing': '인쇄할 항목이 없습니다',
  'app.playback.nothing': '아직 애니메이션이 없습니다. 커넥터를 선택하고 속성 패널에서 애니메이션을 선택하세요.',
} satisfies Translation<typeof en>;
