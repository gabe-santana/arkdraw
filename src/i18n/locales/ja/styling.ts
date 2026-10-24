import type en from '../../en/styling';
import type { Translation } from '../../types';

export default {
  // ThemeDialog
  // dialog title: a color theme for the diagram
  'styling.theme.title': 'テーマ',
  'styling.theme.subtitle': '塗りつぶし、線、テキストを役割ごとに配色し直します。同じ色だった図形は同じ色のままです。Ctrl+Z で元に戻せます。',
  // scope: recolor the whole page (vs. the selection)
  'styling.theme.wholePage': 'ページ全体',
  'styling.theme.empty': '先に図形を追加してください。テーマはページ上の図形の色を変更します。',
  // {theme} is a theme name, e.g. "Ocean"
  'styling.theme.applied': '「{theme}」テーマを適用しました',

  // Diagram theme names (themes.ts)
  'styling.theme.classic': 'クラシック',
  'styling.theme.ocean': 'オーシャン',
  'styling.theme.sunset': 'サンセット',
  'styling.theme.forest': 'フォレスト',
  'styling.theme.mono': 'モノクロ',
  // theme name: strong, saturated colors (not bold text)
  'styling.theme.bold': 'ビビッド',
  'styling.theme.midnight': 'ミッドナイト',

  // Style preset names (presets.ts; Format panel → Style swatches)
  'styling.preset.plain': 'プレーン',
  'styling.preset.gray': 'グレー',
  'styling.preset.blue': 'ブルー',
  'styling.preset.green': 'グリーン',
  'styling.preset.orange': 'オレンジ',
  'styling.preset.yellow': 'イエロー',
  'styling.preset.red': 'レッド',
  'styling.preset.purple': 'パープル',
  // dark preset: near-black fill with white text
  'styling.preset.ink': 'インク',
  'styling.preset.indigo': 'インディゴ',
  'styling.preset.teal': 'ティール',
  // preset with no fill, only an outline
  'styling.preset.outline': '枠線のみ',

  // commands.ts — Page background image from URL
  'styling.bgImage.title': '背景画像の URL',
  'styling.bgImage.message': '画像はページの原点を基準に、ダイアグラムの背後に描画されます。https:// または data: の URL を使用してください。',
  'styling.bgImage.confirm': '背景を設定',
  'styling.bgImage.invalid': 'http(s):// または data:image の URL を入力してください。',
  'styling.bgImage.loadFailed': '画像を読み込めませんでした。URL を確認してください',
} satisfies Translation<typeof en>;
