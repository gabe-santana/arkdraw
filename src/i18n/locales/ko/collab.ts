import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': '방금',
  'collab.connector': '커넥터',
  'collab.shape': '도형',

  // Comments
  'collab.comments': '댓글',
  'collab.resolved': '해결됨',
  'collab.closeComments': '댓글 닫기',
  'collab.noComments': '아직 댓글이 없습니다. 도형을 선택하고 팀에게 메모를 남기세요. 댓글은 파일에 저장됩니다.',
  'collab.commentOn': '“{name}”에 댓글 달기…',
  'collab.selectToComment': '댓글을 달 요소를 선택하세요',
  'collab.comment': '댓글',
  'collab.reply': '답글…',
  'collab.reopen': '다시 열기',
  'collab.resolve': '해결',

  // Revision history
  'collab.revisions': '수정 기록',
  'collab.revisionsSubtitle': '“{name}”의 로컬 스냅샷입니다. 저장할 때마다, 그리고 작업하는 동안 생성됩니다.',
  'collab.noRevisions': '아직 수정 기록이 없습니다. 다이어그램을 저장하면 생성됩니다.',
  'collab.revisionSaved': '저장됨',
  'collab.revisionAuto': '자동 스냅샷',
  'collab.revisionElements': '{count, plural, other {요소 #개}}',
  'collab.deleteRevision': '수정본 삭제',
  'collab.revisionPreview': '수정본 미리 보기',
  'collab.selectRevision': '수정본을 선택하세요',
  'collab.openAsCopy': '사본으로 열기',
  'collab.restore': '복원',
  'collab.restoredSuffix': '{name}(복원됨)',

  // Preferences
  'prefs.title': '환경 설정',
  'prefs.language': '언어',
  'prefs.languageAuto': '자동(시스템: {language})',
  'prefs.languageHint': '도형 이름과 아이콘 검색어는 영어로 유지됩니다.',
  'prefs.author': '이름(댓글용)',
  'prefs.authorPlaceholder': '예: 홍길동',
  'prefs.defaultFont': '새 도형의 기본 글꼴',
  'prefs.fontHand': '손글씨',
  'prefs.palette': '사용자 지정 팔레트(16진수 색상, 쉼표로 구분)',
  'prefs.autosave': '열린 파일에 변경 사항 자동 저장',
  'prefs.startScreen': '시작할 때 시작 화면 표시',
  'prefs.autosaveDesktop': '변경할 때마다 약 1초 후 파일에 저장됩니다(백업이 켜져 있으면 .bkp 파일에 이전 버전이 보관됩니다).',
  'prefs.autosaveWeb': '브라우저의 파일 선택기로 열거나 저장한 파일과 브라우저 라이브러리의 문서에서 작동합니다.',
  'prefs.autosaveFailed': '자동 저장 실패: {error}',
} satisfies Translation<typeof en>;
