import type en from '../../en/app';
import type { Translation } from '../../types';

export default {
  // Shared by the update / offline notices (web and desktop)
  // Verb: hide this notice
  'app.dismiss': '閉じる',
  'app.restoredUnsaved': '未保存のダイアグラムを復元しました',

  // commands.ts
  'app.style.copied': 'スタイルをコピーしました',
  'app.style.copyFirst': '先にスタイルをコピーしてください',
  'app.style.defaultSet': '新しい図形にこのスタイルが使用されます',
  'app.style.defaultReset': 'デフォルトのスタイルをリセットしました',
  'app.layout.nothing': 'レイアウトする対象がありません',
  // {format} is PNG or SVG
  'app.copyAs.done': '{format} としてコピーしました',
  'app.copyAs.failed': 'コピーに失敗しました: {error}',
  'app.image.loadFailed': 'その URL から画像を読み込めませんでした。',
  'app.image.linked': '画像は埋め込まずにリンクしました。サーバーがダウンロードをブロックしているため、表示には接続が必要です。',
  'app.image.urlTitle': 'URL から画像を挿入',
  'app.image.urlMessage': 'PNG、JPEG、GIF、WebP、SVG 画像へのリンク、または data: URI を貼り付けてください。',
  'app.image.urlInvalid': 'http(s) または data:image の URL を入力してください。',

  // fileCommands.ts — file dialog filters
  'app.filter.allDiagrams': 'すべてのダイアグラム',
  'app.filter.arkdraw': 'ArkDraw ダイアグラム',
  'app.filter.drawio': 'ダイアグラム XML (.drawio)',

  // fileCommands.ts — unsaved changes, open, save
  'app.discard.title': '「{name}」への変更を保存しますか?',
  'app.discard.message': '保存しないと変更内容は失われます。',
  'app.discard.deny': '保存しない',
  'app.file.imported': '{count, plural, other {# 個の要素}}をインポートしました',
  'app.file.importedPages': '{pages} ページに{count, plural, other {# 個の要素}}をインポートしました',
  'app.file.openFailed': 'このファイルを開けませんでした。',
  'app.file.savedToBrowser': 'ブラウザーに保存しました',
  'app.file.saveFailed': '保存に失敗しました: {error}',

  // print.ts / playback.ts
  'app.print.nothing': '印刷するものがありません',
  'app.playback.nothing': 'アニメーションするものがまだありません。コネクタを選択し、プロパティパネルでアニメーションを選んでください。',
} satisfies Translation<typeof en>;
