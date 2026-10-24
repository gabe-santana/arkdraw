import type en from '../../en/export';
import type { Translation } from '../../types';

export default {
  // ExportDialog
  'export.subtitle': 'ローカルでレンダリングされます。データが端末の外に送信されることはありません。',
  // aria-label of the file-format picker
  'export.formatGroup': '形式',
  // format card label for a shareable URL (the other cards are format names)
  'export.format.url': 'リンク',
  'export.format.png.desc': '可逆圧縮の画像',
  'export.format.jpeg.desc': '軽量な写真画像',
  'export.format.webp.desc': '小さな Web 画像',
  'export.format.svg.desc': '拡大縮小可能なベクター',
  'export.format.gif.desc': 'アニメーション',
  'export.format.pdf.desc': 'ベクタードキュメント',
  'export.format.html.desc': 'インタラクティブビューアー',
  'export.format.drawio.desc': '編集可能な XML',
  'export.format.vsdx.desc': 'VSDX 図面',
  'export.format.url.desc': '共有可能な URL',
  'export.previewAlt': 'エクスポートのプレビュー',
  'export.empty': 'このページにはまだエクスポートするものがありません。',
  'export.rendering': 'プレビューをレンダリング中…',
  // badge on an animated GIF preview: its duration
  'export.gifLoop': '{seconds} 秒ループ',
  'export.prevPage': '前のページ',
  'export.nextPage': '次のページ',
  // page scope options (narrow segmented control)
  'export.scope.current': '現在',
  'export.scope.all': 'すべて',
  'export.scope.selection': '選択',
  'export.scope.range': '範囲',
  // page range: first page (very narrow label)
  'export.rangeFrom': '開始',
  // page range: last page (very narrow label)
  'export.rangeTo': '終了',
  'export.zipHint': 'ページごとに 1 つの {format} を作成し、.zip にまとめます。',
  // noun: export scale factor
  'export.scale': '拡大率',
  'export.scaleResolution': '拡大率 · 解像度',
  // dots per inch (narrow field label)
  'export.dpi': 'DPI',
  'export.quality': '品質',
  // which part of the page to export
  'export.area': '範囲',
  'export.cropToContent': 'コンテンツに合わせて切り抜く',
  'export.wholePage': 'ページ全体',
  'export.wholePageTitlePageView': 'ページサイズの範囲',
  'export.wholePageTitle': 'ページ設定のページサイズを使用します',
  // margin around the exported content, in px (narrow field label)
  'export.border': '余白',
  'export.background': '背景',
  // background option: plain white
  'export.bg.white': '白',
  'export.bg.transparent': '透明',
  'export.appearance': '外観',
  // light color theme
  'export.light': 'ライト',
  // dark color theme
  'export.dark': 'ダーク',
  'export.autoTitle': '閲覧者のライト/ダーク設定に従います',
  'export.autoHint': '閲覧者のシステムテーマ (prefers-color-scheme) に合わせて切り替わります。',
  // PDF sheet size
  'export.sheetSize': '用紙サイズ',
  // PDF sheet size option: as large as the diagram
  'export.fitContent': 'コンテンツに合わせる',
  'export.paperSize': '用紙サイズ',
  'export.paperHint': '各ページをその用紙形式 (ページ設定) に合わせて拡大縮小します。',
  'export.contentHint': 'PDF の各ページはダイアグラムに合わせたサイズになります。',
  'export.frameRate': 'フレームレート',
  'export.loopForever': '無限ループ',
  // {flow} and {dots} are the connector animation names below, shown in bold
  'export.gifNoAnimation': 'このダイアグラムにはまだアニメーションがありません。コネクタを選択してプロパティパネルで {flow} または {dots} を選ぶか、表示ステップを設定してください。',
  // connector animation style (as named in the Format panel)
  'export.gifFlow': 'フロー',
  // connector animation style (as named in the Format panel)
  'export.gifDots': 'ドット',
  'export.includeGrid': 'グリッドを含める',
  'export.embedFonts': 'フォントを埋め込む',
  'export.embedImages': '画像を埋め込む',
  // switch label; {hint} is export.editableHint, shown dimmed
  'export.editable': '編集可能 {hint}',
  'export.editableHint': '(ダイアグラムデータを含める)',
  'export.compressedXml': '圧縮 XML',
  'export.hint.svg': 'テキストはネイティブの SVG テキストとして書き出されるため、選択や検索が可能です。',
  'export.hint.html': 'オフラインで使える単一ファイル: ページタブ、ズームとパン、レイヤーの切り替え、ツールチップ、リンク。',
  'export.hint.vsdx': '標準の VSDX パッケージ。図形は四角形・楕円・ひし形に変換され、アイコンは画像になります。',
  'export.hint.drawio': 'すべてのページを含む mxGraph XML。',
  'export.shareLink': '共有リンク',
  // length of the share URL
  'export.shareChars': '{count, plural, other {# 文字}}',
  'export.shareEmpty': 'まだ共有するものがありません。',
  'export.shareTooLong': 'このリンクは {max} 文字を超えています。一部のアプリやブラウザーでは途中で切れる可能性があります。大きなダイアグラムはファイルで共有してください。',
  'export.shareHint': 'ダイアグラムはリンク自体に圧縮して埋め込まれます。アップロードもアカウントも不要です。',
  // footer: size of the share link in kilobytes
  'export.linkSize': '{size} KB のリンク',
  // footer: estimated file size
  'export.estimate': '≈ {size}',
  'export.estimateZip': '≈ {size} · {count, plural, other {# ファイル}} (.zip)',
  // file-type name in the save dialog
  'export.zipArchive': 'ZIP アーカイブ',
  'export.linkCopied': 'リンクをクリップボードにコピーしました',
  'export.exported': '{name} をエクスポートしました',
  'export.failed': 'エクスポートに失敗しました: {error}',
  'export.exporting': 'エクスポート中…',
  'export.copyLink': 'リンクをコピー',
  'export.exportFiles': '{count, plural, other {# ファイルをエクスポート}}',
  // {format} is a file-format name: PNG, SVG, PDF…
  'export.exportFormat': '{format} をエクスポート',
} satisfies Translation<typeof en>;
