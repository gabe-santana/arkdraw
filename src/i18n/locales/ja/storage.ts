import type en from '../../en/storage';
import type { Translation } from '../../types';

export default {
  // LibraryDialog
  'storage.title': 'ブラウザーストレージ',
  'storage.subtitle': 'このブラウザー (IndexedDB) に保存されたダイアグラム。このデバイス内にのみ保存され、どこにもアップロードされません。',
  'storage.searchPlaceholder': 'ドキュメントを検索',
  'storage.addFiles': 'ファイルを追加…',
  // button: save the open diagram into the browser library
  'storage.saveCurrent': '現在のファイルを保存',
  'storage.noMatches': '検索に一致するドキュメントはありません。',
  // “Save current” is a button and File → Save to browser a menu command
  'storage.empty': 'このブラウザーに保存されたダイアグラムはまだありません。「現在のファイルを保存」または [ファイル] → [ブラウザーに保存] を使用してください。',
  // {name} is a document name
  'storage.openDoc': '{name} を開く',
  // thumbnail placeholder for a document without content
  'storage.emptyThumb': '空',
  'storage.download': '.opendraw をダウンロード',
  'storage.docActions': 'ドキュメントの操作',
  // file-type name in the save dialog
  'storage.fileType': 'ArkDraw ダイアグラム',
  'storage.opened': '「{name}」を開きました',
  'storage.savedToBrowser': '「{name}」をブラウザーに保存しました',
  'storage.deleteTitle': '「{name}」を削除しますか?',
  'storage.deleteMessage': 'このブラウザーのストレージから削除されます。この操作は元に戻せません。',
  'storage.notADiagram': '「{name}」は ArkDraw のダイアグラムではありません。',
  // last-modified time: under a minute ago
  'storage.justNow': 'たった今',
  // last-modified time, abbreviated: minutes ago
  'storage.minutesAgo': '{count} 分前',
  // last-modified time, abbreviated: hours ago
  'storage.hoursAgo': '{count} 時間前',

  // library.ts
  'storage.saveFailed': 'ブラウザーに保存できませんでした: {error}',
  'storage.docGone': 'そのドキュメントはもうブラウザーライブラリにありません。',

  // recent.ts — errors shown when opening a recent document
  'storage.recentGone': 'この最近使ったドキュメントは利用できなくなりました。',
  'storage.recentPermission': '「{name}」の読み取り権限が拒否されました。',
  'storage.recentRemoved': '「{name}」はブラウザーライブラリから削除されました。',

  // userTemplates.ts — description of a saved template without one
  'storage.templateDescription': 'ダイアグラムから保存したテンプレートです。',
} satisfies Translation<typeof en>;
