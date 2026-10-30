import type en from '../../en/chrome';
import type { Translation } from '../../types';

export default {
  // UI kit (src/ui): search box, number fields, selects, color picker
  'chrome.ui.clearSearch': '検索をクリア',
  // shown in a field when the selected shapes have different values
  'chrome.ui.mixed': '混在',
  // color picker section: recently used colors
  'chrome.ui.recentColors': '最近使用した色',

  // Toolbar (floating tool dock) and zoom pill
  // aria-label of the tool dock
  'chrome.toolbar.label': 'ツール',
  'chrome.toolbar.playAnimation': 'アニメーションを再生',
  'chrome.toolbar.pauseAnimation': 'アニメーションを一時停止',
  'chrome.zoom.out': 'ズームアウト',
  'chrome.zoom.in': 'ズームイン',
  // button showing the zoom percentage; opens zoom presets
  'chrome.zoom.options': 'ズームオプション',

  // Outline
  // noun: the minimap panel's title
  'chrome.outline.title': 'アウトライン',
  'chrome.outline.close': 'アウトラインを閉じる',

  // PageTabs
  // context menu on a page tab: edit the page's custom data
  'chrome.pageTabs.editData': 'データを編集…',
  'chrome.pageTabs.insertPage': 'ページを挿入',
  'chrome.pageTabs.allPages': 'すべてのページ',
  'chrome.pageTabs.findPage': '名前または番号でページを検索',
  'chrome.pageTabs.noMatch': '一致するページがありません',
  'chrome.pageTabs.deleteTitle': '「{name}」を削除しますか？',
  'chrome.pageTabs.deleteMessage': '{count} 個の要素があります。ページの削除は元に戻せません。',

  // StartScreen
  'chrome.start.title': 'ArkDraw へようこそ',
  'chrome.start.subtitle': '新しいダイアグラムを作成するか、前回の続きから始めましょう。',
  'chrome.start.blank': '空白のダイアグラム',
  'chrome.start.blankSub': '空のキャンバスから開始',
  'chrome.start.templates': 'テンプレート…',
  // "My templates" is the name of the user's own template category
  'chrome.start.templatesSub': 'ギャラリーとマイテンプレートを参照',
  // verb: open a file
  'chrome.start.open': '開く…',
  'chrome.start.openSubDesktop': 'このコンピューター上のファイル',
  'chrome.start.openSubWeb': 'デバイス上のファイル',
  'chrome.start.openBrowser': 'ブラウザーから開く…',
  'chrome.start.openBrowserSub': 'このブラウザーに保存したダイアグラム',
  // section heading: a few quick templates
  'chrome.start.templatesHeading': 'テンプレート',
  // section heading: recently opened files
  'chrome.start.recentHeading': '最近使ったファイル',
  'chrome.start.recentEmpty': '開いたり保存したりしたファイルがここに表示されます。',
  'chrome.start.dontShow': '今後は表示しない',
  'chrome.start.reenableHint': '環境設定で再び有効にできます',

  // EditDialogs — Edit data
  'chrome.editData.title': 'データを編集',
  'chrome.editData.id': 'ID {id}',
  'chrome.editData.namePlaceholder': 'レイヤーパネルに表示されます',
  'chrome.editData.tooltip': 'ツールチップ',
  'chrome.editData.tooltipPlaceholder': 'ホバー時に表示されます',
  // noun: hyperlink of a shape
  'chrome.editData.link': 'リンク',
  // segmented option: link to a web address (vs. to a page)
  'chrome.editData.linkUrl': 'URL',
  'chrome.editData.tags': 'タグ',
  // example tags shown as placeholder
  'chrome.editData.tagsPlaceholder': 'フロントエンド, 重要',
  // custom key/value properties of a shape
  'chrome.editData.properties': 'プロパティ',
  // placeholder of a property's key field
  'chrome.editData.keyPlaceholder': 'キー',
  // placeholder of a property's value field
  'chrome.editData.valuePlaceholder': '値',
  'chrome.editData.addProperty': 'プロパティを追加',
  // {token} is the literal code token %property%
  'chrome.editData.placeholders': 'ラベルに {token} プレースホルダーを表示',

  // EditDialogs — Edit style
  'chrome.editStyle.title': 'スタイルを編集',
  'chrome.editStyle.subtitleDrawio': 'スタイル文字列 (key=value;)。選択範囲全体に適用されます',
  // format option: the key=value; style string syntax (vs. "ArkDraw" keys)
  'chrome.editStyle.styleString': 'スタイル文字列',
  'chrome.editStyle.subtitleArkdraw': 'ArkDraw のスタイルキー (1 行に 1 つ)。選択範囲全体に適用されます',
  'chrome.editStyle.keptKeys': 'ArkDraw が使用しないキーも保持され、.drawio へのエクスポート時に書き戻されます。',

  // EditDialogs — Edit diagram
  'chrome.editDiagram.title': 'ダイアグラムを編集',
  'chrome.editDiagram.subtitle': '現在のページを ArkDraw JSON で表示しています。変更は元に戻せます。',

  // EditDialogs — Find & Replace
  'chrome.find.toggleReplace': '置換の表示切り替え',
  'chrome.find.placeholder': 'ラベル、名前、ツールチップ、データを検索',
  'chrome.find.matchCase': '大文字と小文字を区別',
  'chrome.find.wholeWord': '単語単位',
  'chrome.find.regex': '正規表現',
  'chrome.find.allPages': 'すべてのページ',
  // tiny toggle button: search all pages (keep very short)
  'chrome.find.allPagesShort': '全体',
  'chrome.find.replaceWith': '置換後の文字列',
  // verb: replace the current match
  'chrome.find.replace': '置換',
  // button next to "Replace": replace all matches (keep short)
  'chrome.find.replaceAll': 'すべて',

  // EditDialogs — Import from text
  'chrome.import.none': 'テキストインポーターがインストールされていません。',
  'chrome.import.fromText': 'テキストからインポート',
  'chrome.import.asNewPage': '新しいページとして',

  // Dock — movable side panels
  'chrome.dock.panel.shapes': '図形',
  'chrome.dock.panel.format': '書式',
  'chrome.dock.panel.layers': 'レイヤー',
  'chrome.dock.moveLeft': '左側へ移動',
  'chrome.dock.moveRight': '右側へ移動',
  'chrome.dock.moveUp': '上へ移動',
  'chrome.dock.moveDown': '下へ移動',
  'chrome.dock.reset': 'パネルのレイアウトをリセット',
  // {panel} is a panel name: Shapes, Format or Layers.
  'chrome.dock.handleAria': '{panel} パネル: ドラッグで移動、クリックでオプション',
  'chrome.dock.handleTitle': 'ドラッグで移動 · クリックでオプション',
  // Drop zone for a dragged panel.
  'chrome.dock.dropHere': 'ここにドロップ',
  'chrome.dock.resizeLeft': '左パネルのサイズを変更',
  'chrome.dock.resizeRight': '右パネルのサイズを変更',
  'chrome.rightTabs.aria': '右パネル',
  'chrome.rightTabs.design': 'デザイン',
  'chrome.rightTabs.designHint': '選択したものの書式',
  'chrome.rightTabs.layersHint': 'レイヤーと全要素（前面から背面）',
  'chrome.rightTabs.ai': 'AI',
  'chrome.rightTabs.aiHint': '望むことを伝えるだけで、アシスタントが描画や編集をします',
} satisfies Translation<typeof en>;
