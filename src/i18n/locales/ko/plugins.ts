import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': '플러그인',
  'plugins.subtitle': '명령, 도형 라이브러리, 파일 형식으로 OpenDraw 확장',
  'plugins.warning':
    '플러그인은 OpenDraw 안에서 실행되며 편집기와 다이어그램에 대한 모든 권한을 가집니다. 신뢰할 수 있는 플러그인만 추가하세요. 플러그인을 사용하도록 설정하기 전에 확인을 요청합니다.',
  'plugins.status.active': '활성',
  'plugins.storedCopy': '{source}(저장된 사본)',
  'plugins.remove': '플러그인 제거',
  'plugins.empty': '아직 플러그인이 없습니다.',
  'plugins.external': '앱 또는 앱 구성에서 로드됨',
  'plugins.add': '플러그인 추가',
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js 또는 C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js 또는 /plugins/my-plugin.js',
  'plugins.addFromFile': '파일에서 추가…',

  // plugins.ts — runtime messages
  'plugins.commandFailed': '{plugin}: {error}',
  'plugins.exported': '{name}을(를) 내보냈습니다',
  'plugins.exportFailed': '{format} 내보내기 실패: {error}',
  'plugins.trustTitle': '이 플러그인을 사용하시겠습니까?',
  'plugins.trustMessage': '{what}\n\n플러그인은 OpenDraw 안에서 실행되며 다이어그램과 편집기에 대한 모든 권한을 가집니다. 신뢰할 수 있는 출처의 플러그인만 사용하세요.',
  'plugins.trustConfirm': '플러그인 사용',
  'plugins.duplicate': '이 플러그인은 이미 목록에 있습니다.',
  'plugins.enabled': '플러그인 사용 설정됨: {name}',
  'plugins.failed': '플러그인 {id} 실패: {error}',
  'plugins.cspHint': '{error} — 스크립트를 로드할 수 없습니다. URL을 확인하세요. 엄격한 Content-Security-Policy를 사용하는 호스트는 자체 출처의 플러그인만 허용합니다.',
} satisfies Translation<typeof en>;
