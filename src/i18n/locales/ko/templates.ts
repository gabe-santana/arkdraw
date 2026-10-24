import type en from '../../en/templates';
import type { Translation } from '../../types';

export default {
  // TemplatesDialog
  'templates.title': '템플릿으로 시작',
  'templates.subtitle': '{categories}개 범주, {templates}개 템플릿 — 모두 자유롭게 편집할 수 있습니다.',
  'templates.categoriesNav': '템플릿 범주',
  'templates.searchPlaceholder': '템플릿 검색',
  'templates.all': '모든 템플릿',
  'templates.grid': '템플릿',
  'templates.resultsFor': '“{query}” 검색 결과',
  'templates.nothingSelected': '선택된 항목 없음',
  'templates.hint.browse': '탐색',
  'templates.doubleClickHint': '카드를 더블클릭하여 만들기',
  'templates.connectorCount': '{count, plural, other {커넥터 #개}}',
  'templates.createBlank': '빈 다이어그램 만들기',
  'templates.createNew': '새 다이어그램 만들기',
  'templates.insertIntoCurrent': '현재 다이어그램에 삽입',
  'templates.noMatch': '“{query}”와(과) 일치하는 템플릿이 없습니다',
  'templates.tryBroader': '“cloud”, “uml”, “wireframe”처럼 더 넓은 검색어를 사용해 보세요.',
  'templates.created': '“{name}”을(를) 만들었습니다',
  'templates.inserted': '“{name}”을(를) 삽입했습니다',
} satisfies Translation<typeof en>;
