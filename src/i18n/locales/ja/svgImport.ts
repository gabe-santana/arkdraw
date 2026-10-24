import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': 'SVG をインポート',
  // {name} is a quoted file name, or svgImport.unnamed.
  'svgImport.message': '{name} を 1 つの画像として挿入するか、パス・図形・テキストを編集可能な図形に変換します。',
  'svgImport.unnamed': 'この SVG',
  'svgImport.perGroup': 'グループごとに 1 つの図形 (色を保持、図形数を削減)',
  'svgImport.asImage': '画像として挿入',
  'svgImport.convert': '図形に変換',
  'svgImport.converted': '{count, plural, other {# 個の図形に変換しました (グループ化済み)。}}',
  'svgImport.pickTitle': 'SVG を図形として',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': 'このファイルは有効な SVG 画像ではありません。',
  'svgImport.msg.empty': 'この SVG には図形に変換できる要素がありません。',
  'svgImport.msg.gradient': 'グラデーションは最初の色に置き換えられました。',
  'svgImport.msg.pattern': 'パターンの塗りつぶしは単色に置き換えられました。',
  'svgImport.msg.clip': 'クリッピングパスとマスクは無視されました。',
  'svgImport.msg.filter': 'フィルター (ぼかし、影) は無視されました。',
  'svgImport.msg.marker': 'パスのマーカーは無視されました (線にはシンプルな矢印が残ります)。',
  'svgImport.msg.skewText': '傾斜したテキストと画像は、回転したボックスで近似されました。',
  'svgImport.msg.foreign': '埋め込み HTML (foreignObject) はプレーンテキストに変換されました。',
  'svgImport.msg.relativeImage': '相対リンクの画像はスキップされました。',
} satisfies Translation<typeof en>;
