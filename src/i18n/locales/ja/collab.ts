import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': 'たった今',
  'collab.connector': 'コネクタ',
  'collab.shape': '図形',

  // Comments
  'collab.comments': 'コメント',
  'collab.resolved': '解決済み',
  'collab.closeComments': 'コメントを閉じる',
  'collab.noComments': 'コメントはまだありません。図形を選択してチームへのメモを残しましょう。コメントはファイルに保存されます。',
  'collab.commentOn': '「{name}」にコメント…',
  'collab.selectToComment': 'コメントする要素を選択してください',
  'collab.comment': 'コメント',
  'collab.reply': '返信…',
  'collab.reopen': '再オープン',
  'collab.resolve': '解決',

  // Revision history
  'collab.revisions': '変更履歴',
  'collab.revisionsSubtitle': '「{name}」のローカルスナップショット。保存のたびと作業中に作成されます。',
  'collab.noRevisions': 'リビジョンはまだありません。ダイアグラムを保存すると作成されます。',
  'collab.revisionSaved': '保存',
  'collab.revisionAuto': '自動スナップショット',
  'collab.revisionElements': '{count, plural, other {# 個の要素}}',
  'collab.deleteRevision': 'リビジョンを削除',
  'collab.revisionPreview': 'リビジョンのプレビュー',
  'collab.selectRevision': 'リビジョンを選択してください',
  'collab.openAsCopy': 'コピーとして開く',
  'collab.restore': '復元',
  'collab.restoredSuffix': '{name} (復元)',

  // Preferences
  'prefs.title': '環境設定',
  'prefs.language': '言語',
  'prefs.languageAuto': '自動 (システム: {language})',
  'prefs.languageHint': '図形名とアイコンの検索語は英語のままです。',
  'prefs.author': 'あなたの名前 (コメント用)',
  'prefs.authorPlaceholder': '例: 山田 太郎',
  'prefs.defaultFont': '新しい図形のデフォルトフォント',
  'prefs.fontHand': '手書き風',
  'prefs.palette': 'カスタムパレット (16 進カラー、カンマ区切り)',
  'prefs.autosave': '開いているファイルに変更を自動保存',
  'prefs.startScreen': '起動時にスタート画面を表示',
  'prefs.autosaveDesktop': '保存済みのファイルは変更のたびに約 1 秒後に書き込まれます (バックアップが有効な場合、.bkp に以前のバージョンが残ります)。',
  'prefs.autosaveWeb': 'ブラウザーのファイル選択で開いた/保存したファイルと、ブラウザーライブラリ内のドキュメントで機能します。',
  'prefs.autosaveFailed': '自動保存に失敗しました: {error}',
} satisfies Translation<typeof en>;
