import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  'styling.theme.title': '主题',
  'styling.theme.subtitle': '按角色重新着色填充、线条和文本。原本颜色相同的图形仍保持一致。按 Ctrl+Z 撤销。',
  'styling.theme.wholePage': '整个页面',
  'styling.theme.empty': '请先添加一些图形——主题会为页面上的内容重新着色。',
  'styling.theme.applied': '已应用“{theme}”主题',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': '经典',
  'styling.theme.ocean': '海洋',
  'styling.theme.sunset': '日落',
  'styling.theme.forest': '森林',
  'styling.theme.mono': '单色',
  'styling.theme.bold': '鲜明',
  'styling.theme.midnight': '午夜',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': '朴素',
  'styling.preset.gray': '灰色',
  'styling.preset.blue': '蓝色',
  'styling.preset.green': '绿色',
  'styling.preset.orange': '橙色',
  'styling.preset.yellow': '黄色',
  'styling.preset.red': '红色',
  'styling.preset.purple': '紫色',
  'styling.preset.ink': '墨色',
  'styling.preset.indigo': '靛蓝',
  'styling.preset.teal': '青色',
  'styling.preset.outline': '轮廓',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': '背景图像 URL',
  'styling.bgImage.message': '图像从页面原点开始绘制在图表下方。请使用 https:// 或 data: URL。',
  'styling.bgImage.confirm': '设置背景',
  'styling.bgImage.invalid': '请输入 http(s):// 或 data:image URL。',
  'styling.bgImage.loadFailed': '无法加载该图像——请检查 URL',
} satisfies Translation<typeof en>;
