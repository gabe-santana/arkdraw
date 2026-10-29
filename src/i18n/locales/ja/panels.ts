import type en from '../../en/panels';
import type { Translation } from '../../types';

export default {
  // Shared within the panels
  // Shown when the selection has different values for a property.
  'panels.mixed': '混在',
  // Button that opens an editor dialog.
  'panels.editEllipsis': '編集…',
  // Verb (button / menu item): lock the element(s).
  'panels.lock': 'ロック',
  // Verb (button / menu item): unlock the element(s).
  'panels.unlock': 'ロック解除',
  // Number-field prefix (max ~2 letters): abbreviation of "Width".
  'panels.abbr.width': 'W',
  // Number-field prefix (max ~2 letters): abbreviation of "Height".
  'panels.abbr.height': 'H',
  // Number-field prefix (max ~2 letters): abbreviation of "Size".
  'panels.abbr.size': 'Sz',
  // Switch: hand-drawn (rough.js) rendering.
  'panels.sketch': 'スケッチ (手書き風)',
  'panels.alignLeft': '左揃え',
  'panels.alignCenter': '中央揃え',
  'panels.alignRight': '右揃え',

  // PropertiesPanel
  'panels.formatPanel': '書式パネル',
  // Header title when nothing is selected.
  'panels.header.canvas': 'キャンバス',
  'panels.header.nothingSelected': '何も選択されていません',
  'panels.header.icon': 'アイコン',
  'panels.header.elements': '{count, plural, other {# 個の要素}}',
  'panels.header.connectorCount': '{count, plural, other {# 本のコネクタ}}',
  'panels.canvas.adaptColors': 'ダークモードでダイアグラムの色を調整',
  // Section title: canvas settings (grid, snapping…).
  'panels.canvas.title': 'キャンバス',
  'panels.canvas.showGrid': 'グリッドを表示',
  'panels.canvas.snapToGrid': 'グリッドにスナップ',
  'panels.canvas.smartGuides': 'スマートガイド',
  'panels.canvas.gridSize': 'グリッドサイズ',
  'panels.tips.title': 'ヒント',
  // {dot} is rendered as the highlighted words of 'panels.tips.blueDot'.
  'panels.tips.connect': '図形にカーソルを合わせ、{dot}からドラッグして接続します。',
  'panels.tips.blueDot': '青い点',
  // {key} is the key name "Ctrl".
  'panels.tips.duplicate': '{key} を押しながらドラッグすると複製できます。',
  // {key} is the shortcut "Ctrl K".
  'panels.tips.palette': '{key} を押すとすべてのコマンドを表示します。',
  'panels.canvas.elementCount': '{count, plural, other {キャンバス上に # 個の要素}}',
  // Section title: noun (fill color of shapes).
  'panels.fill': '塗りつぶし',
  'panels.fillColor': '塗りつぶしの色',
  'panels.dropShadow': '影',
  // Section title: noun (outline of shapes / connector line).
  'panels.stroke': '線',
  'panels.strokeColor': '線の色',
  'panels.stroke.solid': '実線',
  'panels.stroke.dashed': '破線',
  'panels.stroke.dotted': '点線',
  'panels.text.bold': '太字',
  'panels.text.italic': '斜体',
  // Vertical text alignment.
  'panels.text.top': '上',
  // Vertical text alignment.
  'panels.text.middle': '中央',
  // Vertical text alignment.
  'panels.text.bottom': '下',
  'panels.text.color': '文字の色',
  'panels.animation.title': 'アニメーション',
  // Button: pause the animation preview.
  'panels.animation.pause': '一時停止',
  // Button: play the animations on the canvas.
  'panels.animation.preview': 'プレビュー',
  'panels.animation.none': 'アニメーションなし',
  'panels.animation.flow': 'フロー (流れる破線)',
  'panels.animation.dots': '移動するドット',
  'panels.animation.pulse': 'パルス',
  // Shape animation option "none" (emphasis effects: pulse, glow, bounce).
  'panels.animation.noEmphasis': '強調なし',
  'panels.animation.glow': 'グロー',
  'panels.animation.bounce': 'バウンド',
  'panels.animation.speed': '速度',
  'panels.animation.reverse': '方向を反転',
  // Row label: reveal step number in presentation/animation order.
  'panels.animation.step': 'ステップ',
  'panels.animation.hideStep': '消えるステップ',
  'panels.animation.revealInOrder': '選択順に表示',
  'panels.animation.hint': 'ステップ 0 = 常に表示、消えるステップ 0 = 消えません。[ファイル] → [エクスポート] で GIF または MP4 動画として書き出せます。',
  // Section title (several shapes selected).
  'panels.arrange.align': '整列',
  // Section title (one element selected): z-order, grouping, locking.
  'panels.arrange.title': '配置',
  'panels.arrange.sendToBack': '最背面へ移動',
  'panels.arrange.sendBackward': '背面へ移動',
  'panels.arrange.bringForward': '前面へ移動',
  'panels.arrange.bringToFront': '最前面へ移動',
  // Verb: group the selected shapes.
  'panels.arrange.group': 'グループ化',
  'panels.arrange.ungroup': 'グループ解除',

  // PropertiesExtras
  'panels.transform.title': '変形',
  'panels.transform.rotate90': '90° 回転',
  'panels.transform.flipH': '左右反転',
  'panels.transform.flipV': '上下反転',
  'panels.effects.title': '効果',
  'panels.effects.gradient': 'グラデーション',
  'panels.effects.gradientColor': 'グラデーションの色',
  // Gradient direction.
  'panels.effects.down': '下',
  // Gradient direction.
  'panels.effects.up': '上',
  // Gradient direction.
  'panels.effects.right': '右',
  // Gradient direction.
  'panels.effects.left': '左',
  // Gradient direction.
  'panels.effects.radial': '放射状',
  // Row label (64px): fill opacity (α = alpha).
  'panels.effects.fillAlpha': '塗り α',
  // Row label (64px): stroke opacity (α = alpha).
  'panels.effects.strokeAlpha': '線 α',
  // Row label (64px): fill pattern of hand-drawn shapes.
  'panels.effects.fillStyle': '塗りの種類',
  // Hand-drawn fill pattern.
  'panels.sketchFill.hachure': 'ハッチング',
  'panels.sketchFill.solid': '単色',
  'panels.sketchFill.zigzag': 'ジグザグ',
  'panels.sketchFill.crossHatch': 'クロスハッチ',
  'panels.sketchFill.dots': 'ドット',
  'panels.sketchFill.dashed': '破線',
  'panels.sketchFill.zigzagLine': 'ジグザグ線',
  // Switch: glossy glass effect on shapes.
  'panels.effects.glass': 'ガラス',
  // Section title: text label styling.
  'panels.label.title': 'ラベル',
  'panels.label.underline': '下線',
  'panels.label.strikethrough': '取り消し線',
  'panels.label.verticalText': '縦書き',
  // Switch: label is rich (HTML) text.
  'panels.label.formatted': '書式付き',
  // Switch: label contains LaTeX/AsciiMath formulas.
  'panels.label.math': '数式',
  // Switch: wrap the label text.
  'panels.label.wrap': '折り返し',
  // Row label (64px): text opacity (α = alpha).
  'panels.label.textAlpha': '文字 α',
  // Row label (64px): background color behind the label text.
  'panels.label.highlight': 'ハイライト',
  'panels.label.background': 'ラベルの背景',
  'panels.data.title': 'データ',
  // Placeholder: hover tooltip text of the element.
  'panels.data.tooltip': 'ツールチップ',
  // Read-only field showing a link to another page.
  'panels.data.pageLink': 'ページ: {name}',
  'panels.data.linkPlaceholder': 'リンク (https://…)',
  'panels.data.removeLink': 'リンクを削除',
  'panels.data.propertyCount': '{count, plural, other {# 個のプロパティ}}',
  'panels.page.title': 'ページ · {name}',
  // Row label (64px): page background color.
  'panels.page.background': '背景',
  'panels.page.backgroundColor': 'ページの背景',
  // Button: replace the page background image.
  'panels.page.replaceImage': '置き換え',
  // Button: pick a background image file.
  'panels.page.chooseImage': '選択…',
  'panels.page.removeImage': '画像を削除',
  'panels.page.pageView': 'ページビュー',
  // Row label (64px): paper size (A4, Letter…).
  'panels.page.paper': '用紙',
  'panels.page.portrait': '縦',
  'panels.page.landscape': '横',
  'panels.page.shadowAll': 'すべての図形に影を付ける',
  // Row label (64px): measurement units.
  'panels.page.units': '単位',

  // StyleSection
  // Section title: quick style presets.
  'panels.style.title': 'スタイル',
  'panels.style.setDefault': 'デフォルトに設定',
  'panels.style.setDefaultHint': '新しい図形にこの図形のスタイルを使用します',
  'panels.style.myDefault': 'マイデフォルト',
  // Accessible name of a style preset swatch; {name} is the preset name.
  'panels.style.presetAria': '{name} スタイル',
  'panels.shadow.options': '影のオプション',
  'panels.shadow.color': '影の色',
  // Number-field prefix (28px box, ~4 letters max): shadow blur radius.
  'panels.shadow.blur': 'ぼかし',
  'panels.shadow.reset': '影をリセット',
  // Row label (64px): how rough the hand-drawn strokes are.
  'panels.sketch.roughness': '粗さ',
  'panels.dark.title': 'ダークモード',
  'panels.dark.custom': 'ダークモードのカスタム色',
  // Row label (64px): dark-mode fill color.
  'panels.dark.fill': '塗り',
  'panels.dark.fillAria': 'ダークモードの塗りつぶし',
  // Row label (64px): dark-mode line (stroke) color.
  'panels.dark.line': '線',
  'panels.dark.lineAria': 'ダークモードの線',
  // Row label (64px): dark-mode text color.
  'panels.dark.text': '文字',
  'panels.dark.textAria': 'ダークモードの文字',
  'panels.dark.hintOn': 'ダークモードで自動の色合いの代わりに使用されます。空欄 = 自動。',
  'panels.dark.hintOff': 'これらを使用するには「ダークモードでダイアグラムの色を調整」([表示] → [テーマ]) をオンにしてください。',
  'panels.grid.color': 'グリッドの色',
  'panels.grid.scrollbars': 'スクロールバー',
  'panels.grid.hint': 'グリッド、スナップ、グリッドの色はこのページと一緒に保存されます。',
  'panels.bgUrl.title': 'URL から背景画像を設定',
  // Button: load the background image from a URL.
  'panels.bgUrl.button': 'URL…',

  // TextSection
  'panels.font.aria': 'フォント',
  'panels.font.searchPlaceholder': 'フォント名を検索または入力…',
  'panels.font.custom': 'カスタムフォント',
  // {name} is a font name the user typed.
  'panels.font.useCustom': '「{name}」を使用',
  // Hint next to a typed font name: a font installed on this computer.
  'panels.font.installed': 'インストール済み',
  // Group of built-in font stacks.
  'panels.font.builtIn': '組み込み',
  // Group of the operating system's fonts.
  'panels.font.system': 'システム',
  // Group showing the font currently in use.
  'panels.font.current': '現在',
  'panels.labelPos.aria': 'ラベルの位置',
  'panels.labelPos.top-left': '左上',
  'panels.labelPos.top': '上',
  'panels.labelPos.top-right': '右上',
  'panels.labelPos.left': '左',
  'panels.labelPos.inside': '内側',
  'panels.labelPos.right': '右',
  'panels.labelPos.bottom-left': '左下',
  'panels.labelPos.bottom': '下',
  'panels.labelPos.bottom-right': '右下',
  // Row label (64px): writing direction.
  'panels.textDir.title': '方向',
  'panels.textDir.ltr': '左から右',
  'panels.textDir.rtl': '右から左',
  // Writing direction detected from the text itself.
  'panels.textDir.auto': 'テキストに従う',
  'panels.spacing.perSide': '辺ごとの間隔',
  // Number-field prefix (1 letter): Top.
  'panels.spacing.top': '上',
  // Number-field prefix (1 letter): Right.
  'panels.spacing.right': '右',
  // Number-field prefix (1 letter): Bottom.
  'panels.spacing.bottom': '下',
  // Number-field prefix (1 letter): Left.
  'panels.spacing.left': '左',
  // Row label (64px): label border color.
  'panels.label.border': '枠線',
  'panels.label.borderColor': 'ラベルの枠線',
  'panels.translations.title': '翻訳',
  'panels.translations.addLanguage': '言語を追加',
  'panels.translations.hint': '言語ごとに翻訳したラベルを追加します。表示されるラベルはページのダイアグラム言語で決まります。',
  // {language} is a language name.
  'panels.translations.remove': '{language} を削除',
  'panels.language.defaultOption': 'デフォルト (基本ラベル)',
  // Row label (64px): the page's diagram language.
  'panels.language.title': '言語',

  // ConnectorSection
  // Row label (64px): arrowhead at the connector's start.
  'panels.connector.start': '始点',
  // Row label (64px): arrowhead at the connector's end.
  'panels.connector.end': '終点',
  // Switch: draw the arrowhead filled.
  'panels.connector.arrowFill': '塗りつぶし',
  // {name} is a connector style preset name.
  'panels.connector.presetAria': 'スタイルプリセット: {name}',
  'panels.connector.swap': '方向を入れ替え',
  // Section title: connector routing.
  'panels.route.title': 'ルート',
  // Row label (64px): routing style.
  'panels.route.style': 'スタイル',
  // Row label (64px): connector shape (line, pipe, arrow…).
  'panels.route.shape': '形状',
  'panels.route.orthogonal': '直交 (自動)',
  'panels.route.straight': '直線',
  'panels.route.curved': '曲線',
  'panels.route.elbowH': 'カギ線 (水平)',
  'panels.route.elbowV': 'カギ線 (垂直)',
  'panels.route.entity': 'エンティティ関係',
  'panels.route.isometric': 'アイソメトリック',
  'panels.connShape.line': '線',
  'panels.connShape.link': 'リンク (二重線)',
  'panels.connShape.arrow': 'シンプルな矢印',
  'panels.connShape.flexArrow': 'フレックス / 太い矢印',
  'panels.connShape.pipe': 'パイプ',
  'panels.connShape.wire': 'ワイヤー',
  'panels.connShape.filledEdge': '塗りつぶしエッジ',
  // Row label (64px): line jumps where connectors cross.
  'panels.route.jumps': 'ジャンプ',
  // Line-jump style.
  'panels.jumps.arc': '円弧',
  // Line-jump style.
  'panels.jumps.gap': '隙間',
  // Line-jump style.
  'panels.jumps.sharp': '鋭角',
  // Row label (64px): gap between connector end and shape outline.
  'panels.route.spacing': '間隔',
  'panels.route.clearWaypoints': 'ウェイポイントをクリア',
  'panels.connLabels.title': 'ラベル',
  'panels.connLabels.hint': 'コネクタに沿った追加のラベルです。オレンジのハンドルをドラッグして移動し、ダブルクリックで編集します。',
  'panels.connLabels.textAria': 'ラベル {n} のテキスト',
  'panels.connLabels.remove': 'ラベルを削除',
  // Connector style presets (display names).
  'panels.connectorPreset.straight': '直線',
  'panels.connectorPreset.orthogonal': '直交',
  'panels.connectorPreset.curved': '曲線',
  'panels.connectorPreset.entity': 'エンティティ関係',
  'panels.connectorPreset.isometric': 'アイソメトリック',
  'panels.connectorPreset.dependency': '破線の依存関係',
  'panels.connectorPreset.inheritance': '継承',
  'panels.connectorPreset.association': '関連 (矢印なし)',
  'panels.connectorPreset.simple-arrow': 'シンプルな矢印',
  'panels.connectorPreset.link': 'リンク',
  // Arrowhead names (mxGraph markers).
  'panels.arrow.none': 'なし',
  'panels.arrow.arrow': '開いた矢印',
  'panels.arrow.openThin': '開いた矢印 (細)',
  'panels.arrow.triangle': 'ブロック',
  'panels.arrow.triangleOpen': '白抜きブロック',
  'panels.arrow.blockThin': 'ブロック (細)',
  'panels.arrow.classic': 'クラシック',
  'panels.arrow.classicThin': 'クラシック (細)',
  'panels.arrow.doubleBlock': '二重ブロック',
  'panels.arrow.diamond': 'ひし形',
  'panels.arrow.diamondOpen': '白抜きひし形',
  'panels.arrow.diamondThin': 'ひし形 (細)',
  'panels.arrow.circle': '楕円',
  'panels.arrow.circleOpen': '白抜き楕円',
  'panels.arrow.circlePlus': 'プラス付き円',
  'panels.arrow.halfCircle': '半円',
  // ER = entity-relationship (crow's foot) notation.
  'panels.arrow.erOne': 'ER: 1',
  'panels.arrow.erOnlyOne': 'ER: 必ず 1',
  'panels.arrow.erMany': 'ER: 多',
  'panels.arrow.erOneMany': 'ER: 1 以上',
  'panels.arrow.erZeroMany': 'ER: 0 以上',
  'panels.arrow.erZeroOne': 'ER: 0 または 1',
  'panels.arrow.dash': 'ダッシュ',
  'panels.arrow.cross': 'クロス',
  'panels.arrow.halfArrow': '片矢印 (非同期・オープン)',
  'panels.arrow.async': '非同期',
  'panels.arrow.box': 'ボックス',
  'panels.arrow.boxOpen': '白抜きボックス',

  // BehaviorSection
  'panels.aspect.on': '縦横比を固定中',
  'panels.aspect.off': '縦横比を固定',
  // Switch: the shape acts as a container for other shapes.
  'panels.container': 'コンテナー',
  'panels.group.enter': 'グループに入る',
  'panels.group.exit': 'グループを終了',
  'panels.group.selectContainer': 'コンテナーを選択',
  'panels.behavior.title': '動作',
  // Shown when some interactions are disabled on the selection.
  'panels.behavior.restricted': '制限あり',
  'panels.behavior.mixed': '(混在)',
  'panels.behavior.exportHint': 'エクスポート時に mxGraph のスタイルキー (movable=0 など) として保存されます。',
  'panels.behavior.restrictedCount': '{count, plural, other {制限のある要素: # 個}}',
  'panels.behavior.summary': '移動、サイズ変更、編集など',
  'panels.table.title': '表',
  'panels.table.rangeMulti': '行 {top}–{bottom}、列 {left}–{right}',
  'panels.table.rangeOne': '行 {row}、列 {col}',
  'panels.table.noCell': 'セルが選択されていません。編集は末尾またはすべてのセルに適用されます',
  // Button: insert a row above.
  'panels.table.rowAbove': '上に行',
  // Button: insert a row below.
  'panels.table.rowBelow': '下に行',
  // Button: insert a column to the left.
  'panels.table.colLeft': '左に列',
  // Button: insert a column to the right.
  'panels.table.colRight': '右に列',
  'panels.table.deleteRow': '行を削除',
  'panels.table.deleteCol': '列を削除',
  // Verb: merge the selected cells.
  'panels.table.merge': '結合',
  'panels.table.unmerge': '結合解除',
  'panels.table.headerRow': 'ヘッダー行',
  'panels.table.selectedCells': '選択したセル',
  'panels.table.allCells': 'すべてのセル',
  'panels.table.cellFill': 'セルの塗りつぶし',
  'panels.table.cellText': 'セルの文字',
  'panels.table.boldCells': 'セルを太字',
  'panels.table.italicCells': 'セルを斜体',
  'panels.table.hint': 'セルをクリックして選択、Shift+クリックで範囲選択、ダブルクリックまたは Enter で入力します。',
  'panels.freehand.title': 'フリーハンド',
  'panels.freehand.points': '{count, plural, other {# 個の点}}',
  'panels.freehand.doneEditing': '点の編集を完了',
  'panels.freehand.editPoints': '点を編集',
  'panels.freehand.hint': '点をドラッグして移動します。線分をダブルクリックすると点を追加し、点をダブルクリックするか Delete キーを押すと削除します。Esc で終了します。',

  // ShapeParamsSection
  'panels.params.reset': '図形のパラメーターをリセット',
  // Button: reset the color to automatic.
  'panels.params.automatic': '自動',

  // ImageSection
  'panels.image.cropTop': '上をトリミング',
  'panels.image.cropRight': '右をトリミング',
  'panels.image.cropBottom': '下をトリミング',
  'panels.image.cropLeft': '左をトリミング',
  'panels.image.resetCrop': 'トリミングをリセット',
  'panels.image.originalSize': '元のサイズ',
  'panels.image.sizeError': '画像のサイズを読み取れませんでした。',

  // LayersPanel
  'panels.layers.panel': 'レイヤーパネル',
  'panels.layers.resize': 'レイヤーパネルのサイズを変更',
  'panels.layers.elements': '要素',
  'panels.layers.filterPlaceholder': '要素を絞り込み',
  'panels.layers.noMatch': '一致する要素はありません。',
  'panels.layers.empty': '図形を追加すると、ここに要素が表示されます。',
  // Tree toggle of a container row.
  'panels.layers.expand': '展開',
  'panels.layers.collapse': '折りたたむ',

  // LayersManager
  'panels.layers.editData': 'データを編集…',
  'panels.layers.selectAll': 'レイヤー内をすべて選択',
  'panels.layers.moveHere': '選択範囲をここへ移動',
  'panels.layers.delete': 'レイヤーを削除',
  'panels.layers.documentLayers': 'ドキュメントのレイヤー',
  'panels.layers.moveToActive': '選択範囲をアクティブなレイヤーへ移動',
  'panels.layers.moveToLayer': '選択範囲をレイヤーへ移動',
  'panels.layers.add': 'レイヤーを追加',
  'panels.layers.hide': 'レイヤーを非表示',
  'panels.layers.show': 'レイヤーを表示',
  'panels.layers.lock': 'レイヤーをロック',
  'panels.layers.unlock': 'レイヤーのロックを解除',
  'panels.layers.actions': 'レイヤーの操作',
  'panels.layers.tags': 'タグ',
  // Button: clear the tag filter.
  'panels.layers.showAll': 'すべて表示',

  // LeftPanel
  'panels.left.aria': '図形パネル',
  // Heading over the cloud & vendor icon packs (AWS, Azure…), and their search results.
  'panels.left.cloud': 'クラウドとブランドのアイコン',
  'panels.left.searchShapes': '図形とアイコンを検索',
  'panels.left.bestMatches': '最も一致',
  'panels.left.noShapes': '「{query}」に一致するものはありません。',
  'panels.left.hintConnect': 'クリックで選択中の図形に接続して追加 (Alt+クリック: 接続なし) · 図形の上で Shift+ドロップして置き換え',
  'panels.left.hintInsert': 'キャンバスにドラッグ、またはクリックして挿入 · 図形の上で Shift+ドロップして置き換え',
  'panels.left.removeFavorite': 'お気に入りから削除',
  'panels.left.addFavorite': 'お気に入りに追加',
  'panels.left.favorites': 'お気に入り',
  'panels.left.recent': '最近使用した項目',
  'panels.icons.none': 'アイコンパックがインストールされていません。',
  'panels.icons.groups': 'グループ',
  // Hover-card fallback; {provider} is a vendor (AWS…), {category} an icon category.
  'panels.icons.description': 'アーキテクチャ図用の {provider} {category} アイコン。',
  // {name} is the icon pack (AWS…), {version} its version.
  'panels.icons.footer': '{name} アイコン · {version}。各商標はそれぞれの所有者に帰属します。アーキテクチャ図用に提供されています。',
  // Badge on the drag ghost while Shift-dropping onto a shape to replace it.
  'panels.libraryDrag.replace': '置き換え',
  // Built-in shape library names (Shapes panel section titles).
  'panels.library.general': '一般',
  'panels.library.flowchart': 'フローチャート',
  'panels.library.erd': 'エンティティ関係',
  'panels.library.c4': 'C4 モデル',
  'panels.library.network': 'ネットワーク',
  'panels.library.agile': 'Atlassian スタイル (Jira / Confluence)',
  'panels.library.arrows': '矢印',
  'panels.library.basic': '基本',
  'panels.library.misc': 'その他 / 高度',
  'panels.library.cisco': 'ネットワーク (Cisco スタイル)',
  'panels.library.citrix': 'Citrix スタイル (VDI)',
  'panels.library.clipart': 'クリップアート',
  'panels.library.containers': 'スイムレーンとコンテナー',
  'panels.library.crm': 'Salesforce スタイル (CRM)',
  'panels.library.eip': 'エンタープライズ統合パターン',
  'panels.library.electrical': '電気',
  'panels.library.floorplan': '間取り図',
  'panels.library.infographic': 'インフォグラフィック',
  'panels.library.isometric': 'アイソメトリック',
  'panels.library.lean': 'リーン / バリューストリーム',
  'panels.library.mindmap': 'マインドマップ',
  'panels.library.mockups': 'モックアップ',
  'panels.library.pid': 'プロセスエンジニアリング (P&ID)',
  'panels.library.venn': 'ベン図とマトリックス',
  'panels.library.kanban': 'カンバン',
  'panels.library.orgchart': '組織図',
  'panels.library.timeline': 'タイムラインとガント',
  'panels.library.rack': 'ラック',
  'panels.library.signs': '標識とクリップアート',
  'panels.library.sitemap': 'サイトマップ',
  'panels.library.drawioGlyphs': 'グリフ',
  'panels.library.veeam': 'Veeam スタイル (バックアップ)',

  // UserLibrariesSection
  // Default name of a new user library; {n} is a number.
  'panels.userLib.defaultName': 'ライブラリ {n}',
  // The built-in user library for keeping shapes for reuse.
  'panels.userLib.scratchpad': 'スクラッチパッド',
  'panels.userLib.new': '新しいライブラリ',
  'panels.userLib.open': 'ライブラリを開く…',
  // File-dialog filter name.
  'panels.userLib.filterName': 'ライブラリ',
  // File-dialog filter name.
  'panels.userLib.fileType': 'ArkDraw ライブラリ',
  'panels.userLib.loaded': '{count, plural, other {「{name}」から # 個の項目を読み込みました}}',
  'panels.userLib.notALibrary': 'ArkDraw のライブラリではありません。',
  'panels.userLib.unsupported': 'サポートされていないライブラリファイルです。',
  // Verb: add the selected shapes to this library.
  'panels.userLib.addSelection': '選択範囲を追加',
  'panels.userLib.selectToAdd': '追加する図形を選択してください',
  'panels.userLib.export': 'ライブラリをエクスポート',
  'panels.userLib.delete': 'ライブラリを削除',
  'panels.userLib.scratchpadEmpty': '図形を選択して + を押すと、再利用できるようにここに保存されます。',
  'panels.userLib.empty': '空のライブラリです。+ で選択範囲を追加してください。',
  'panels.userLib.removeItem': '項目を削除',

  // ConnectionPointsDialog
  'panels.points.title': '接続ポイントを編集',
  'panels.points.subtitle': '図形に対する比率で位置を指定 (0 = 左/上、1 = 右/下)',
  'panels.points.removeN': 'ポイント {n} を削除',
  'panels.points.remove': 'ポイントを削除',
  'panels.points.none': 'ポイントがありません。コネクタは図形の輪郭にのみ接続されます。',
  'panels.points.add': 'ポイントを追加',
  'panels.points.resetDefault': 'デフォルトにリセット',
  'panels.points.section': '接続ポイント',
  // {custom} is "yes" when the shape has its own points (adds " (custom)").
  'panels.points.summary': '{count, plural, other {# 個のポイント}}{custom, select, yes { (カスタム)} other {}}。コネクタの端をポイントの上にドロップするとそこに固定されます。Shift キーを押しながらドロップすると輪郭上の任意の位置に固定できます。',
} satisfies Translation<typeof en>;
