import type en from '../../en/web';
import type { Translation } from '../../types';

export default {
  // EmbedBar (editor embedded in another site)
  // {shortcut} is a key combo, e.g. Ctrl+S
  'web.embed.saveTitle': '保存 ({shortcut})',
  // Verb: leave the embedded editor
  'web.embed.exit': '終了',

  // PwaUpdatePrompt
  'web.pwa.newVersion': 'OpenDraw の新しいバージョンを利用できます',
  'web.pwa.offlineReady': 'OpenDraw をオフラインで使用できるようになりました',
  'web.pwa.reloadHint': '再読み込みして更新してください。未保存の作業は再読み込み後に復元されます。',
  'web.pwa.cached': 'アプリはこのデバイスにキャッシュされています。',
  'web.pwa.updating': '更新中…',
  // Verb: reload the page
  'web.pwa.reload': '再読み込み',

  // Launch (boot.tsx, launch.ts)
  'web.launch.onlyHttpUrls': '開けるのは http(s) のダイアグラム URL のみです。',
  'web.shared.askTitle': '共有されたダイアグラムを開きますか?',
  'web.shared.askMessage': '前回のセッションの未保存の作業があります。共有されたダイアグラムを開くと置き換えられます。',
  'web.shared.confirm': '共有ダイアグラムを開く',
  'web.shared.deny': '作業を保持',
  'web.shared.openFailed': '共有されたダイアグラムを開けませんでした: {error}',

  // loadDiagram.ts
  'web.load.empty': 'ダイアグラムは空です。',
  'web.load.noPages': 'ダイアグラムのページが見つかりませんでした。',
  'web.load.unrecognized': '認識できないダイアグラム形式です。',
  // Default document name for a diagram opened from a link
  'web.load.sharedDiagram': '共有ダイアグラム',
  'web.load.cors': 'ダイアグラムをダウンロードできませんでした。サーバーがクロスオリジンリクエスト (CORS) を許可していない可能性があります。',
  'web.load.http': 'ダイアグラムをダウンロードできませんでした (HTTP {status})。',
  'web.load.tooLarge': 'ダイアグラムが大きすぎて開けません。',
} satisfies Translation<typeof en>;
