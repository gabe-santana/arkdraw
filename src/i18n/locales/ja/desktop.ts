import type en from '../../en/desktop';
import type { Translation } from '../../types';

export default {
  // UpdatePrompt
  'desktop.update.available': 'OpenDraw {version} を利用できます',
  'desktop.update.downloading': 'ダウンロード中…',
  'desktop.update.downloadingPercent': 'ダウンロード中 · {percent}%',
  'desktop.update.installing': 'インストール中… OpenDraw が再起動します。',
  'desktop.update.restartHint': '再起動して更新してください。未保存の変更がある場合は、先に保存するよう求められます。',
  // Button: restart the app to install the update
  'desktop.update.restart': '再起動して更新',

  // updater.ts
  'desktop.update.webAuto': 'Web 版では更新が自動的にインストールされます。',
  'desktop.update.upToDate': 'OpenDraw は最新です。',
  'desktop.update.checkFailed': '更新を確認できませんでした: {error}',
  'desktop.update.failed': '更新に失敗しました: {error}',

  // startup.ts — Extras → Configuration file…
  'desktop.config.editHint': 'config.json を編集してから OpenDraw を再起動すると適用されます。',
  'desktop.config.noFolder': '構成フォルダーがありません',

  // windows.ts — opening a file while the current one has unsaved changes
  'desktop.openWhere.title': '「{name}」を新しいウィンドウで開きますか?',
  'desktop.openWhere.message': '「{name}」には未保存の変更があります。ここで作業を続けながら、ファイルを新しいウィンドウで開くことができます。',
  'desktop.openWhere.confirm': '新しいウィンドウで開く',
  'desktop.openWhere.deny': 'このダイアグラムを置き換える',
} satisfies Translation<typeof en>;
