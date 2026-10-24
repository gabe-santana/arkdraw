import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'ArkDraw {version}을(를) 사용할 수 있습니다',
  'desktop.update.downloading': '다운로드 중…',
  'desktop.update.downloadingPercent': '다운로드 중 · {percent}%',
  'desktop.update.installing': '설치 중… OpenDraw가 다시 시작됩니다.',
  'desktop.update.restartHint': '다시 시작하여 업데이트하세요. 먼저 저장하지 않은 변경 사항을 저장할지 묻습니다.',
  'desktop.update.restart': '다시 시작하여 업데이트',

  // updater.ts
  'desktop.update.webAuto': '웹 버전에서는 업데이트가 자동으로 설치됩니다.',
  'desktop.update.upToDate': 'OpenDraw가 최신 버전입니다.',
  'desktop.update.checkFailed': '업데이트를 확인할 수 없습니다: {error}',
  'desktop.update.failed': '업데이트 실패: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'config.json을 편집한 다음 OpenDraw를 다시 시작하면 적용됩니다.',
  'desktop.config.noFolder': '구성 폴더 없음',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': '“{name}”을(를) 새 창에서 여시겠습니까?',
  'desktop.openWhere.message': '“{name}”에 저장하지 않은 변경 사항이 있습니다. 여기서 계속 작업하면서 파일을 새 창에서 열 수 있습니다.',
  'desktop.openWhere.confirm': '새 창에서 열기',
  'desktop.openWhere.deny': '이 다이어그램 바꾸기',
} satisfies Translation<typeof en>;
