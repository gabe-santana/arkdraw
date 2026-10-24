import type en from '../../en/viewer';
import type { Translation } from '../../types';

export default {
  // Viewer — loading / empty / error
  'viewer.loadingDiagram': 'ダイアグラムを読み込み中…',
  'viewer.openFailed': 'このダイアグラムを開けませんでした',
  'viewer.viewTitle': 'ダイアグラムを表示',
  'viewer.emptyHint': 'ここにダイアグラムファイルをドロップするか、デバイスから開いてください。何もアップロードされません。',
  'viewer.openFile': 'ファイルを開く…',
  'viewer.openEditor': 'エディターを開く',

  // Viewer — toolbar
  'viewer.openNewTab': '新しいタブで開く',
  'viewer.editInOpenDraw': 'OpenDraw で編集',
  'viewer.previousPage': '前のページ',
  'viewer.nextPage': '次のページ',
  'viewer.zoomOut': 'ズームアウト',
  'viewer.zoomIn': 'ズームイン',
  'viewer.resetZoom': '100% にリセット',
  'viewer.fit': '画面に合わせる',

  // Viewer — hover card on linked shapes
  'viewer.goToPage': '「{name}」へ移動',
  'viewer.goToPageUnnamed': '「ページ」へ移動',
  'viewer.runAction': 'クリックしてアクションを実行',
  'viewer.unsupportedLink': 'サポートされていないリンク',
} satisfies Translation<typeof en>;
