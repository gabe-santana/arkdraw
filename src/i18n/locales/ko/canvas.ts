import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  'canvas.roleDescription': '다이어그램 캔버스',
  'canvas.ariaLabel': '다이어그램 캔버스. Tab 키로 도형 간 이동, Alt+화살표 키로 연결 따라가기, Shift+F10으로 상황에 맞는 메뉴를 엽니다.',

  // Canvas → empty-page hint
  'canvas.empty.title': '빈 캔버스로 시작하기',
  'canvas.empty.body': '라이브러리에서 도형을 드래그하거나, 도구 모음으로 그리거나, 다이어그램을 설명하면 AI가 대신 그려 드립니다.',
  'canvas.empty.rectangle': '사각형',
  'canvas.empty.connector': '커넥터',
  'canvas.empty.ai': 'AI',

  // ShapePicker (quick shape picker on double-click)
  'canvas.picker.replaceWith': '다음으로 바꾸기…',
  'canvas.picker.insertShape': '도형 삽입…',
  'canvas.picker.noMatch': '일치하는 도형이 없습니다.',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': '들어간 그룹',
  'canvas.group.backToDiagram': '전체 다이어그램으로 돌아가기(Home)',
  'canvas.group.group': '그룹',
  'canvas.group.subgroup': '하위 그룹',
  'canvas.group.exit': '그룹에서 나가기',
  'canvas.group.nothingNested': '선택 영역에 중첩된 항목이 없습니다',

  // OverlayLayer (brief badge after grouping / ungrouping)
  'canvas.flash.grouped': '그룹화됨 · {count}',
  'canvas.flash.ungrouped': '그룹 해제됨 · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  'canvas.param.corner': '모서리 {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': '이 링크 동작은 올바른 JSON이 아닙니다.',
  'canvas.link.pageMissing': '해당 페이지가 더 이상 존재하지 않습니다.',
  'canvas.link.unsupportedScheme': '웹, 메일, 전화 링크만 열 수 있습니다.',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': '아이콘',
  'canvas.aria.connectorRole': '커넥터',
  'canvas.aria.labeled': '{kind}: {text}',
  'canvas.aria.connectorFromTo': '{from}에서 {to}(으)로 가는 커넥터',
  'canvas.aria.connectorNamedFromTo': '{from}에서 {to}(으)로 가는 커넥터 “{text}”',
  'canvas.aria.nothing': '없음',
  'canvas.aria.nothingSelected': '선택된 항목 없음',
  'canvas.aria.selectedOne': '{description} 선택됨',
  'canvas.aria.selectedMany': '{count, plural, other {요소 #개 선택됨}}',

  // TableCellLayer
  'canvas.table.cellLabel': '셀 {row}행, {column}열',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': '더블클릭하여 점 추가',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': '브러시 옵션',
  'canvas.brush.title': '브러시',
  'canvas.brush.color': '브러시 색',
  'canvas.brush.smooth': '매끄럽게',
  'canvas.brush.pressure': '펜 압력(가변 두께)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': '이동 가능',
  'canvas.behavior.movableHint': '드래그하거나 미세 이동할 수 있습니다',
  'canvas.behavior.resizable': '크기 조정 가능',
  'canvas.behavior.resizableHint': '크기 조정 핸들을 표시합니다',
  'canvas.behavior.rotatable': '회전 가능',
  'canvas.behavior.rotatableHint': '회전 핸들을 표시합니다',
  'canvas.behavior.deletable': '삭제 가능',
  'canvas.behavior.deletableHint': 'Delete 키로 제거할 수 있습니다',
  'canvas.behavior.editable': '편집 가능',
  'canvas.behavior.editableHint': '더블클릭하여 레이블을 편집할 수 있습니다',
  'canvas.behavior.connectable': '연결 가능',
  'canvas.behavior.connectableHint': '커넥터를 연결할 수 있습니다',
  'canvas.behavior.selectable': '선택 가능',
  'canvas.behavior.selectableHint': '클릭이나 드래그 선택으로 선택할 수 있습니다',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': '텍스트 서식',
  'canvas.format.bold': '굵게({shortcut})',
  'canvas.format.italic': '기울임꼴({shortcut})',
  'canvas.format.underline': '밑줄({shortcut})',
  'canvas.format.strikethrough': '취소선',
  'canvas.format.smaller': '작게({shortcut})',
  'canvas.format.larger': '크게({shortcut})',
  'canvas.format.textColor': '텍스트 색',
  'canvas.format.highlight': '형광펜',
  'canvas.format.subscript': '아래 첨자',
  'canvas.format.superscript': '위 첨자',
  'canvas.format.link': '링크',
  'canvas.format.removeLink': '링크 제거',
  'canvas.format.clearFormatting': '서식 지우기',
} satisfies Translation<typeof en>;
