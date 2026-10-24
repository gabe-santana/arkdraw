import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  'web.embed.saveTitle': '저장({shortcut})',
  'web.embed.exit': '종료',

  // PwaUpdatePrompt
  'web.pwa.newVersion': '새 버전의 ArkDraw가 준비되었습니다',
  'web.pwa.offlineReady': '이제 ArkDraw를 오프라인에서 사용할 수 있습니다',
  'web.pwa.reloadHint': '다시 로드하여 업데이트하세요. 저장하지 않은 작업은 다시 로드한 후 복원됩니다.',
  'web.pwa.cached': '앱이 이 기기에 캐시되었습니다.',
  'web.pwa.updating': '업데이트 중…',
  'web.pwa.reload': '다시 로드',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': 'http(s) 다이어그램 URL만 열 수 있습니다.',
  'web.shared.askTitle': '공유된 다이어그램을 여시겠습니까?',
  'web.shared.askMessage': '이전 세션에서 저장하지 않은 작업이 있습니다. 공유된 다이어그램을 열면 이 작업이 대체됩니다.',
  'web.shared.confirm': '공유된 다이어그램 열기',
  'web.shared.deny': '내 작업 유지',
  'web.shared.openFailed': '공유된 다이어그램을 열 수 없습니다: {error}',

  // loadDiagram.ts
  'web.load.empty': '다이어그램이 비어 있습니다.',
  'web.load.noPages': '다이어그램 페이지를 찾을 수 없습니다.',
  'web.load.unrecognized': '인식할 수 없는 다이어그램 형식입니다.',
  'web.load.sharedDiagram': '공유된 다이어그램',
  'web.load.cors': '다이어그램을 다운로드할 수 없습니다. 서버에서 교차 출처 요청(CORS)을 허용하지 않을 수 있습니다.',
  'web.load.http': '다이어그램을 다운로드할 수 없습니다(HTTP {status}).',
  'web.load.tooLarge': '다이어그램이 너무 커서 열 수 없습니다.',
} satisfies Translation<typeof en>;
