import type en from '../../en/canvas';
import type { Translation } from '../../types';

export default {
  // Canvas (screen-reader description of the drawing area)
  // context: aria-roledescription, read by screen readers instead of "application"; lowercase
  'canvas.roleDescription': 'ダイアグラムキャンバス',
  'canvas.ariaLabel': 'ダイアグラムキャンバス。Tab で図形間を移動、Alt+矢印キーで接続をたどり、Shift+F10 でコンテキストメニューを開きます。',

  // Canvas → empty-page hint
  'canvas.empty.title': '空白のキャンバスから始めましょう',
  'canvas.empty.body': 'ライブラリから図形をドラッグするか、ツールバーで描画するか、ダイアグラムの内容を説明して AI に描かせることができます。',
  // context: shown after the "R" key cap — the R key draws a rectangle; lowercase noun
  'canvas.empty.rectangle': '四角形',
  // context: shown after the "L" key cap — the L key draws a connector (line/arrow); lowercase noun
  'canvas.empty.connector': 'コネクタ',
  // context: shown after the "Ctrl I" key caps — opens the AI diagram generator; abbreviation of artificial intelligence
  'canvas.empty.ai': 'AI',

  // ShapePicker (quick shape picker on double-click)
  // context: search placeholder when swapping the selected shapes for another shape
  'canvas.picker.replaceWith': '置き換える図形…',
  // context: search placeholder when adding a new shape at the clicked point
  'canvas.picker.insertShape': '図形を挿入…',
  'canvas.picker.noMatch': '一致する図形はありません。',

  // GroupIsolation (breadcrumb bar while inside a group)
  'canvas.group.breadcrumbLabel': '編集中のグループ',
  // context: tooltip; "Home" is the keyboard key name
  'canvas.group.backToDiagram': 'ダイアグラム全体に戻る (Home)',
  // context: breadcrumb item — noun, the outermost entered group
  'canvas.group.group': 'グループ',
  // context: breadcrumb item — noun, a group nested inside another group
  'canvas.group.subgroup': 'サブグループ',
  // context: button — verb, leave the current group
  'canvas.group.exit': 'グループを終了',
  'canvas.group.nothingNested': '選択範囲内に入れ子の要素はありません',

  // OverlayLayer (brief badge after grouping / ungrouping)
  // context: badge with the number of grouped shapes, e.g. "Grouped · 3"
  'canvas.flash.grouped': 'グループ化 · {count}',
  // context: badge with the number of released shapes, e.g. "Ungrouped · 3"
  'canvas.flash.ungrouped': 'グループ解除 · {count}',

  // ParamHandles (tooltip while dragging a yellow handle)
  // context: value tooltip while dragging the corner-radius handle, e.g. "Corner 12"
  'canvas.param.corner': '角 {value}',

  // links (following a shape's link)
  'canvas.link.invalidAction': 'このリンクアクションは有効な JSON ではありません。',
  'canvas.link.pageMissing': 'そのページはもう存在しません。',
  'canvas.link.unsupportedScheme': '開けるのは Web、メール、電話のリンクのみです。',

  // Screen-reader labels (aria.ts, navigation.ts live region)
  'canvas.aria.icon': 'アイコン',
  // context: aria-roledescription of a connector element; lowercase
  'canvas.aria.connectorRole': 'コネクタ',
  // context: element label for screen readers — {kind} is the shape type (e.g. "Rectangle"), {text} its label
  'canvas.aria.labeled': '{kind}: {text}',
  // context: {from}/{to} are the labels of the connected shapes
  'canvas.aria.connectorFromTo': '{from} から {to} へのコネクタ',
  // context: {text} is the connector's own label; {from}/{to} the connected shapes
  'canvas.aria.connectorNamedFromTo': '{from} から {to} へのコネクタ「{text}」',
  // context: stands in for a missing endpoint in "Connector from {from} to {to}"
  'canvas.aria.nothing': 'なし',
  'canvas.aria.nothingSelected': '何も選択されていません',
  // context: {description} is e.g. "Rectangle: Login" or "Connector from A to B"
  'canvas.aria.selectedOne': '{description} を選択',
  'canvas.aria.selectedMany': '{count, plural, other {# 個の要素}}を選択',

  // TableCellLayer
  // context: screen-reader label of the table cell being edited (1-based numbers)
  'canvas.table.cellLabel': 'セル: {row} 行目、{column} 列目',

  // PointEditor (freehand vertex editing)
  'canvas.points.addHint': 'ダブルクリックで点を追加',

  // BrushPopover (freehand tool options)
  'canvas.brush.options': 'ブラシのオプション',
  // context: heading — noun, the freehand drawing brush
  'canvas.brush.title': 'ブラシ',
  'canvas.brush.color': 'ブラシの色',
  // context: slider label in a narrow column — noun/adjective, stroke smoothing amount
  'canvas.brush.smooth': '滑らかさ',
  'canvas.brush.pressure': '筆圧 (線幅を可変)',

  // behavior.ts (Format panel → Behavior switches and their tooltips)
  'canvas.behavior.movable': '移動可能',
  'canvas.behavior.movableHint': 'ドラッグや微調整で移動できます',
  'canvas.behavior.resizable': 'サイズ変更可能',
  'canvas.behavior.resizableHint': 'サイズ変更ハンドルを表示します',
  'canvas.behavior.rotatable': '回転可能',
  'canvas.behavior.rotatableHint': '回転ハンドルを表示します',
  'canvas.behavior.deletable': '削除可能',
  // context: "Delete" is the keyboard key / command
  'canvas.behavior.deletableHint': 'Delete キーで削除できます',
  'canvas.behavior.editable': '編集可能',
  'canvas.behavior.editableHint': 'ダブルクリックでラベルを編集できます',
  'canvas.behavior.connectable': '接続可能',
  'canvas.behavior.connectableHint': 'コネクタを接続できます',
  'canvas.behavior.selectable': '選択可能',
  // context: "rubber bands" = the drag-to-select marquee rectangle
  'canvas.behavior.selectableHint': 'クリックや範囲選択で選択できます',

  // FormatBar (floating toolbar of the rich-text label editor; {shortcut} is a key combo)
  'canvas.format.toolbar': 'テキストの書式',
  'canvas.format.bold': '太字 ({shortcut})',
  'canvas.format.italic': '斜体 ({shortcut})',
  'canvas.format.underline': '下線 ({shortcut})',
  'canvas.format.strikethrough': '取り消し線',
  // context: button — make the selected text smaller
  'canvas.format.smaller': '縮小 ({shortcut})',
  // context: button — make the selected text larger
  'canvas.format.larger': '拡大 ({shortcut})',
  'canvas.format.textColor': '文字の色',
  // context: button — text background highlight colour (noun/verb as in a highlighter pen)
  'canvas.format.highlight': '蛍光ペン',
  'canvas.format.subscript': '下付き',
  'canvas.format.superscript': '上付き',
  // context: button — insert a hyperlink
  'canvas.format.link': 'リンク',
  'canvas.format.removeLink': 'リンクを削除',
  'canvas.format.clearFormatting': '書式をクリア',
} satisfies Translation<typeof en>;
