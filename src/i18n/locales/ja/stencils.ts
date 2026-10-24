import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': '図形を編集',
  'stencils.insertTitle': '図形を挿入',
  // "stencil XML" is mxGraph's XML format for shapes
  'stencils.stencilXml': 'mxGraph ステンシル XML',
  // {shape} is a shape name, e.g. "Rectangle"
  'stencils.builtIn': '{shape} は組み込みの図形です',
  'stencils.insertSubtitle': 'mxGraph ステンシル XML で図形を記述します',
  // {customShape} is the bold term from stencils.customShapeTerm
  'stencils.convertInfo':
    '組み込みの図形はコードで描画されています。適用すると、現在の縦横比のまま編集可能な{customShape}に変換されます。テキスト、スタイル、接続は保持されます。',
  'stencils.customShapeTerm': 'カスタム図形',
  'stencils.replaceInfo': 'ゼロから記述したカスタム図形に置き換えることもできます。',
  'stencils.startFromSample': 'サンプルから開始',
  // file-type name in the open dialog; also the editor's accessible name
  'stencils.fileType': 'ステンシル XML',
  // default name of a stencil without a name attribute
  'stencils.customShape': 'カスタム図形',
  // "Scratchpad" is the name of the user's scratch shape library
  'stencils.addedToScratchpad': '「{name}」をスクラッチパッドに追加しました',
  // <shape> is an XML tag: keep it
  'stencils.noShape': 'このファイルには <shape> がありません。',
  'stencils.firstOfMany': '{count} 個の図形のうち最初の 1 つを読み込みました。すべて取り込むには、ファイルをライブラリとしてインポートしてください。',
  'stencils.fixToPreview': 'プレビューを表示するには XML を修正してください',
  'stencils.nothingToPreview': 'プレビューするものがありません',
  // {aspect} is a stencil XML value ("variable" or "fixed"); keep it
  'stencils.aspect': '縦横比: {aspect}',
  'stencils.connectionPoints': '{count, plural, other {# 個の接続ポイント}}',
  // stroke width of the stencil outline
  'stencils.stroke': '線 {width}',
  // the stroke width comes from the shape's style
  'stencils.strokeFromStyle': '線はスタイルに従う',
  // {items} lists XML tags the renderer skips
  'stencils.ignored': '無視: {items}',
  'stencils.openXml': 'XML を開く…',
  // button: restore the XML the dialog opened with
  'stencils.revert': '元に戻す',
  'stencils.convertApply': '変換して適用',
  'stencils.addToScratchpad': 'スクラッチパッドに追加',

  // convert.ts — why a built-in shape can't become a stencil ({shape} is the shape name)
  'stencils.convert.noStencil': 'このカスタム図形にはまだステンシルがありません。',
  'stencils.convert.ownText': '{shape} は独自にテキストを描画するため、ステンシルでは表現できません。',
  // {why} is a short technical reason (in English)
  'stencils.convert.unsupported': '{shape} は、ステンシルでは表現できない機能を使う組み込みの図形です ({why})。',
  'stencils.convert.dynamic': '動的レンダリング',
  'stencils.convert.noOutline': '{shape} には変換できるアウトラインがありません。',
} satisfies Translation<typeof en>;
