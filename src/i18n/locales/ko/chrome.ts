import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': '검색 지우기',
  // shown in a field when the selected shapes have different values
  'chrome.ui.mixed': '혼합',
  // color picker section: recently used colors
  'chrome.ui.recentColors': '최근 사용',

  // Toolbar (floating tool dock) and zoom pill
  'chrome.toolbar.label': '도구',
  'chrome.toolbar.playAnimation': '애니메이션 재생',
  'chrome.toolbar.pauseAnimation': '애니메이션 일시 중지',
  'chrome.zoom.out': '축소',
  'chrome.zoom.in': '확대',
  'chrome.zoom.options': '확대/축소 옵션',

  // Outline
  'chrome.outline.title': '개요',
  'chrome.outline.close': '개요 닫기',

  // PageTabs
  'chrome.pageTabs.editData': '데이터 편집…',
  'chrome.pageTabs.insertPage': '페이지 삽입',
  'chrome.pageTabs.allPages': '모든 페이지',
  'chrome.pageTabs.findPage': '페이지 찾기',
  'chrome.pageTabs.noMatch': '일치하는 페이지 없음',
  'chrome.pageTabs.deleteTitle': '“{name}”을(를) 삭제할까요?',
  'chrome.pageTabs.deleteMessage': '요소가 {count}개 있습니다. 페이지 삭제는 되돌릴 수 없습니다.',

  // StartScreen
  'chrome.start.title': 'ArkDraw에 오신 것을 환영합니다',
  'chrome.start.subtitle': '새 다이어그램을 시작하거나 이전 작업을 이어서 하세요.',
  'chrome.start.blank': '빈 다이어그램',
  'chrome.start.blankSub': '빈 캔버스에서 시작',
  'chrome.start.templates': '템플릿…',
  'chrome.start.templatesSub': '갤러리와 내 템플릿 둘러보기',
  'chrome.start.open': '열기…',
  'chrome.start.openSubDesktop': '이 컴퓨터의 파일',
  'chrome.start.openSubWeb': '기기의 파일',
  'chrome.start.openBrowser': '브라우저에서 열기…',
  'chrome.start.openBrowserSub': '이 브라우저에 저장된 다이어그램',
  'chrome.start.templatesHeading': '템플릿',
  'chrome.start.recentHeading': '최근 항목',
  'chrome.start.recentEmpty': '열거나 저장한 파일이 여기에 표시됩니다.',
  'chrome.start.dontShow': '다시 표시 안 함',
  'chrome.start.reenableHint': '환경 설정에서 다시 켤 수 있습니다',

  // EditDialogs — Edit data
  'chrome.editData.title': '데이터 편집',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': '레이어 패널에 표시됨',
  'chrome.editData.tooltip': '도구 설명',
  'chrome.editData.tooltipPlaceholder': '마우스를 올리면 표시됨',
  'chrome.editData.link': '링크',
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': '태그',
  'chrome.editData.tagsPlaceholder': '프런트엔드, 중요',
  'chrome.editData.properties': '속성',
  'chrome.editData.keyPlaceholder': '키',
  'chrome.editData.valuePlaceholder': '값',
  'chrome.editData.addProperty': '속성 추가',
  'chrome.editData.placeholders': '레이블에 {token} 자리 표시자 표시',

  // EditDialogs — Edit style
  'chrome.editStyle.title': '스타일 편집',
  'chrome.editStyle.subtitleDrawio': '스타일 문자열(key=value;) — 선택 영역 전체에 적용됩니다',
  'chrome.editStyle.styleString': '스타일 문자열',
  'chrome.editStyle.subtitleArkdraw': 'ArkDraw 스타일 키를 한 줄에 하나씩 입력 — 선택 영역 전체에 적용됩니다',
  'chrome.editStyle.keptKeys': 'ArkDraw에서 사용하지 않는 키는 유지되며 .drawio로 내보낼 때 다시 기록됩니다.',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': '다이어그램 편집',
  'chrome.editDiagram.subtitle': '현재 페이지의 ArkDraw JSON입니다. 변경 사항은 실행 취소할 수 있습니다.',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': '바꾸기 전환',
  'chrome.find.placeholder': '레이블, 이름, 도구 설명, 데이터에서 찾기',
  'chrome.find.matchCase': '대/소문자 구분',
  'chrome.find.wholeWord': '단어 단위로',
  'chrome.find.regex': '정규식',
  'chrome.find.allPages': '모든 페이지',
  'chrome.find.allPagesShort': '전체',
  'chrome.find.replaceWith': '바꿀 내용',
  'chrome.find.replace': '바꾸기',
  'chrome.find.replaceAll': '전체',

  // EditDialogs — Import from text
  'chrome.import.none': '설치된 텍스트 가져오기 도구가 없습니다.',
  'chrome.import.fromText': '텍스트에서 가져오기',
  'chrome.import.asNewPage': '새 페이지로',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': '도형',
  'chrome.dock.panel.format': '서식',
  'chrome.dock.panel.layers': '레이어',
  'chrome.dock.moveLeft': '왼쪽으로 이동',
  'chrome.dock.moveRight': '오른쪽으로 이동',
  'chrome.dock.moveUp': '위로 이동',
  'chrome.dock.moveDown': '아래로 이동',
  'chrome.dock.reset': '패널 레이아웃 초기화',
  // {panel} is a panel name: Shapes, Format or Layers.
  'chrome.dock.handleAria': '{panel} 패널: 드래그하여 이동, 클릭하여 옵션 보기',
  'chrome.dock.handleTitle': '드래그하여 이동 · 클릭하여 옵션 보기',
  'chrome.dock.dropHere': '여기에 놓기',
  'chrome.dock.resizeLeft': '왼쪽 패널 크기 조정',
  'chrome.dock.resizeRight': '오른쪽 패널 크기 조정',
  'chrome.rightTabs.aria': '오른쪽 패널',
  'chrome.rightTabs.design': '디자인',
  'chrome.rightTabs.designHint': '선택한 항목의 스타일',
  'chrome.rightTabs.layersHint': '레이어와 모든 요소(앞에서 뒤로)',
  'chrome.rightTabs.ai': 'AI',
  'chrome.rightTabs.aiHint': '원하는 것을 말하면 어시스턴트가 그리거나 편집합니다',
} satisfies Translation<typeof en>;
