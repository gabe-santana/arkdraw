import type en from '../../en/automation';
import type { Translation } from '../../types';

export default {
  // formUi (key/value editor)
  // placeholder of the property-name input (a data key, not a keyboard key)
  'automation.kv.keyPlaceholder': 'キー',
  // placeholder of the property-value input
  'automation.kv.valuePlaceholder': '値',
  'automation.kv.remove': 'プロパティを削除',
  'automation.kv.add': 'プロパティを追加',

  // ConfigurationBody
  'automation.config.title': '構成',
  'automation.config.subtitle': 'アプリ全体の設定 (JSON): デフォルトのスタイルとフォント、プリセットカラー、図形ライブラリ、グリッド、自動保存。',
  'automation.config.insertExample': '例を挿入',
  // the key names are JSON keys: keep them in English
  'automation.config.keys': 'キー: defaultVertexStyle、defaultEdgeStyle、defaultFont、customPresetColors、defaultLibraries、libraries、gridSize、autosave。',
  'automation.config.applied': '構成を適用しました',
  // configuration.ts — validation messages listed under the JSON editor; quoted names are JSON keys (keep them)
  'automation.config.invalidJson': '無効な JSON: {error}',
  'automation.config.notObject': '構成は JSON オブジェクトである必要があります。',
  'automation.config.unknownKey': '不明なキー "{key}" です。',
  'automation.config.styleNotObject': '"{key}" はスタイルプロパティのオブジェクトである必要があります。',
  'automation.config.notStyleProperty': '"{key}" はスタイルプロパティではありません。',
  'automation.config.stylePrimitive': '"{key}" は string、number、boolean のいずれかである必要があります。',
  // {type} is a JavaScript type name: string, number or boolean
  'automation.config.styleType': '"{key}" は {type} である必要があります。',
  'automation.config.defaultFont': '"defaultFont" は {fonts} のいずれかである必要があります。',
  'automation.config.customPresetColors': '"customPresetColors" は "#0ea5e9" のような 16 進カラーのリストである必要があります。',
  'automation.config.defaultLibraries': '"defaultLibraries" は "general;uml" のような文字列である必要があります。',
  'automation.config.libraries': '"libraries" は http(s) URL のリストである必要があります。',
  'automation.config.gridSize': '"gridSize" は 1 ～ 200 の数値である必要があります。',
  'automation.config.autosave': '"autosave" は true または false である必要があります。',
  'automation.config.librarySelectionNote': '図形ライブラリの選択は、次に図形パネルを開いたときに適用されます。',
  'automation.config.librariesLoaded': '{count, plural, other {# 個のカスタムライブラリ}}を読み込みました。',
  // shape libraries loaded from URLs (Configuration and the ?clibs= URL parameter)
  'automation.librariesFailed': '{count, plural, other {# 個のライブラリ}}を読み込めませんでした (ネットワークまたは CORS)。',
  // urlParams.ts — toast after loading ?clibs= shape libraries
  'automation.urlParams.librariesLoaded': '{count, plural, other {# 個のカスタムライブラリ}}を読み込みました',

  // LayoutJsonBody
  'automation.layoutJson.title': 'JSON からレイアウトを適用',
  'automation.layoutJson.subtitle':
    'mxGraph レイアウト JSON: mxHierarchicalLayout、mxCompactTreeLayout、mxRadialTreeLayout、mxFastOrganicLayout、mxCircleLayout、mxOrgChartLayout、mxParallelEdgeLayout。選択範囲、またはページ全体に適用されます。',
  // button: fills the editor with sample JSON
  'automation.layoutJson.example': '例',
  'automation.layoutJson.apply': 'レイアウトを適用',
  'automation.layoutJson.nothing': 'レイアウトする対象がありません',

  // PrintBody
  'automation.print.title': '印刷',
  'automation.print.subtitle': 'この設定でシステムの印刷ダイアログを開きます。',
  // page choice: all pages, with the page count
  'automation.print.all': 'すべて ({count})',
  // page choice: the current page only
  'automation.print.current': '現在',
  // page choice: a range of pages
  'automation.print.range': '範囲',
  // {from} and {to} are number inputs
  'automation.print.fromTo': '{from} ～ {to}',
  'automation.print.scaling': '拡大縮小',
  'automation.print.fitOne': '1 枚に収める',
  'automation.print.fitSheets': '用紙枚数に合わせる',
  // scaling option: print at a percentage
  'automation.print.scale': '倍率',
  // {cols} and {rows} are number inputs: number of sheets across and down
  'automation.print.sheets': '横 {cols} × 縦 {rows}',
  // {percent} is a number input followed by "%"
  'automation.print.scaleHint': '{percent} で印刷。大きなページは複数の用紙に分割されます。',
  // paper size
  'automation.print.paper': '用紙',
  'automation.print.orientation': '向き',
  'automation.print.portrait': '縦',
  'automation.print.landscape': '横',
  'automation.print.background': 'ページの背景を含める',
  // button: opens the system print dialog
  'automation.print.print': '印刷…',

  // EmbedBody
  'automation.embed.title': '埋め込み',
  'automation.embed.subtitle': 'Web ページ、Wiki、Markdown 用のスニペット。ダイアグラムはリンク内に含まれるため、何もアップロードされません。',
  'automation.embed.allPages': 'すべてのページ',
  'automation.embed.currentPage': '現在のページ',
  // switch: show the viewer toolbar in the embedded diagram
  'automation.embed.toolbar': 'ツールバー',
  'automation.embed.iframe': 'インタラクティブ (iframe)',
  // {count} is thousands of characters
  'automation.embed.longLink': '長いリンク ({count}k 文字)',
  'automation.embed.viewerLink': 'ビューアーリンク',
  'automation.embed.markdownLink': 'Markdown リンク',
  'automation.embed.imageHtml': '画像 (HTML、現在のページ)',
  'automation.embed.imageMarkdown': '画像 (Markdown、現在のページ)',
  'automation.embed.dataUriSize': '{size} KB のデータ URI',
  // copy button; {label} is the snippet name, e.g. "Viewer link"
  'automation.embed.copy': '{label}をコピー',

  // MermaidBody / mermaidRegen.ts
  'automation.mermaid.title': 'Mermaid を編集',
  'automation.mermaid.subtitle': 'ソースを変更して適用すると、ダイアグラムがその場で再生成されます (1 回の操作で元に戻せます)。',
  'automation.mermaid.noShapes': 'Mermaid ソースから図形が生成されませんでした。',
  'automation.mermaid.gone': 'この Mermaid ダイアグラムはもうページ上にありません。',

  // ReplayBody
  // dialog title: plays the revision history back as an animation
  'automation.replay.title': 'リプレイ',
  'automation.replay.subtitle': 'このドキュメントの変更履歴 (現在のページ) を古い順に再生します。',
  'automation.replay.loading': 'リビジョンを読み込み中…',
  'automation.replay.emptyPage': 'この時点では空のページです',
  // button: jump to the first revision
  'automation.replay.first': '最初',
  // button: jump to the last revision
  'automation.replay.last': '最後',
  'automation.replay.play': '再生',
  'automation.replay.pause': '一時停止',
  // slider: the revision shown
  'automation.replay.revision': 'リビジョン',
  // the current (unsaved) state, shown instead of a date
  'automation.replay.now': '現在',
  'automation.replay.noRevisions': 'リビジョンはまだありません。保存するたび、および未保存の作業中は数分ごとに記録されます。',

  // DataBody (Edit Data for layers, pages, the document)
  'automation.data.layerTitle': 'レイヤーのデータを編集',
  'automation.data.pageTitle': 'ページのデータを編集',
  'automation.data.documentTitle': 'ドキュメントのデータを編集',
  'automation.data.id': 'ID {id}',
  // %placeholders% is literal syntax: keep the percent signs
  'automation.data.documentSubtitle': 'すべてのページで %placeholders% として使える値です。',
  'automation.data.properties': 'プロパティ',
  // %key% is literal placeholder syntax
  'automation.data.propertiesHint': 'このスコープ内でプレースホルダーが有効なラベルに %key% の値が表示されます',

  // PropertiesBody (File → Properties)
  'automation.props.title': 'ファイルのプロパティ',
  'automation.props.author': '作成者',
  'automation.props.authorPlaceholder': 'このダイアグラムの作成者',
  'automation.props.descriptionPlaceholder': 'このダイアグラムの内容',
  // date the file was created
  'automation.props.created': '作成日時',
  'automation.props.lastSaved': '最終保存日時',
  // statistic: number of text labels
  'automation.props.labels': 'ラベル',
  'automation.props.images': '画像とアイコン',
  'automation.props.comments': 'コメント',
  // statistic: number of document-level data properties
  'automation.props.docData': 'ドキュメントデータ',
  // %title%, %author%, %description% are literal placeholders: keep them
  'automation.props.note': 'タイトル、作成者、説明は .arkdraw ファイルに保存され、ラベル内で %title%、%author%、%description% として使用できます。',

  // TemplateTools (My templates, Save as template)
  'automation.templates.imported': 'テンプレート「{name}」をインポートしました',
  'automation.templates.importFailed': 'テンプレートをインポートできませんでした: {error}',
  'automation.templates.importFile': 'テンプレートファイルをインポート',
  // {ext} is a file extension
  'automation.templates.importTooltip': '.{ext} または .arkdraw ファイルをインポート',
  // file-type name in the save dialog
  'automation.templates.fileType': 'ArkDraw テンプレート',
  'automation.templates.deleteTitle': '「{name}」を削除しますか?',
  'automation.templates.deleteMessage': 'テンプレートはこのデバイスから削除されます。このテンプレートから作成したダイアグラムには影響しません。',
  'automation.templates.nothingToSave': 'テンプレートとして保存するものがありません。',
  // "My templates" is the name of the template category
  'automation.templates.saved': '「{name}」をマイテンプレートに保存しました',
  'automation.templates.saveFailed': 'テンプレートを保存できませんでした: {error}',
  'automation.templates.saveTitle': 'テンプレートとして保存',
  // "My templates" is the template category; "File → New from template…" is a menu path
  'automation.templates.saveSubtitle': 'このデバイスの [ファイル] → [テンプレートから新規作成…] のマイテンプレートに表示されます。',
  // placeholder of an optional description field
  'automation.templates.optional': '任意',
  // what the template contains: whole diagram / this page / selection
  'automation.templates.contents': '内容',
  'automation.templates.wholeDiagram': '{count, plural, =1 {ダイアグラム全体} other {ダイアグラム全体 (# ページ)}}',
  'automation.templates.thisPage': 'このページ',
  'automation.templates.save': 'テンプレートを保存',

  // actions.tsx
  'automation.parallelEdgesNone': '同じ 2 つの図形を共有するコネクタはありません。',
  'automation.savedToBrowser': '「{name}」をブラウザーに保存しました',

  // plugins.ts (Explore, Anonymize, Dictate)
  'automation.explore.selectFirst': '探索の起点となる要素を選択してください。',
  // Esc is the Escape key
  'automation.explore.hint': '探索: 隣接する要素を選択して移動、Esc で終了します。',
  'automation.anonymize.title': 'このページを匿名化しますか?',
  'automation.anonymize.message':
    'すべてのラベル、名前、ツールチップ、データ値が x/X のプレースホルダーに置き換えられ、コメントは削除されます。これにより、内容を伏せたままダイアグラムを共有できます。この操作は元に戻せます。',
  // confirm button (verb)
  'automation.anonymize.confirm': '匿名化',
  'automation.anonymize.done': 'ページを匿名化しました',
  'automation.dictate.unavailable': 'このブラウザーでは音声認識を利用できません。',
  'automation.dictate.selectFirst': 'ラベルを音声入力する図形またはコネクタを選択してください。',
  // echoes what was recognized
  'automation.dictate.said': '「{text}」',
  'automation.dictate.denied': 'マイクへのアクセスが拒否されました。',
  'automation.dictate.failed': '音声入力に失敗しました ({error})。',
  'automation.dictate.listening': '聞き取り中… ラベルを話してください',
} satisfies Translation<typeof en>;
