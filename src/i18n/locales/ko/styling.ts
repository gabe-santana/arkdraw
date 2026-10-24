import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': '테마',
  'styling.theme.subtitle': '역할별로 채우기, 선, 텍스트의 색을 바꿉니다. 같은 색을 쓰던 도형은 계속 같은 색을 씁니다. Ctrl+Z로 실행 취소할 수 있습니다.',
  'styling.theme.wholePage': '전체 페이지',
  'styling.theme.empty': '먼저 도형을 추가하세요. 테마는 페이지에 있는 항목의 색을 바꿉니다.',
  'styling.theme.applied': '{theme} 테마를 적용했습니다',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': '클래식',
  'styling.theme.ocean': '오션',
  'styling.theme.sunset': '선셋',
  'styling.theme.forest': '포레스트',
  'styling.theme.mono': '모노크롬',
  'styling.theme.bold': '선명',
  'styling.theme.midnight': '미드나이트',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': '기본',
  'styling.preset.gray': '회색',
  'styling.preset.blue': '파랑',
  'styling.preset.green': '초록',
  'styling.preset.orange': '주황',
  'styling.preset.yellow': '노랑',
  'styling.preset.red': '빨강',
  'styling.preset.purple': '보라',
  'styling.preset.ink': '잉크',
  'styling.preset.indigo': '남색',
  'styling.preset.teal': '청록',
  'styling.preset.outline': '윤곽선',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': '배경 이미지 URL',
  'styling.bgImage.message': '이미지가 페이지 원점에서부터 다이어그램 뒤에 그려집니다. https:// 또는 data: URL을 사용하세요.',
  'styling.bgImage.confirm': '배경 설정',
  'styling.bgImage.invalid': 'http(s):// 또는 data:image URL을 입력하세요.',
  'styling.bgImage.loadFailed': '이미지를 로드할 수 없습니다. URL을 확인하세요',
} satisfies Translation<typeof en>;
