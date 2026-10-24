import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': '编辑图形',
  'stencils.insertTitle': '插入图形',
  'stencils.stencilXml': 'mxGraph 模具 XML',
  'stencils.builtIn': '{shape}是内置图形',
  'stencils.insertSubtitle': '用 mxGraph 模具 XML 描述图形',
  'stencils.convertInfo':
    '内置图形由代码绘制。应用后，此图形将按当前比例转换为可编辑的{customShape}；文本、样式和连接都会保留。',
  'stencils.customShapeTerm': '自定义图形',
  'stencils.replaceInfo': '你仍可以将其替换为从头编写的自定义图形。',
  'stencils.startFromSample': '从示例开始',
  'stencils.fileType': '模具 XML',
  'stencils.customShape': '自定义图形',
  'stencils.addedToScratchpad': '已将“{name}”添加到便笺本',
  'stencils.noShape': '此文件中没有 <shape>。',
  'stencils.firstOfMany': '已加载 {count} 个图形中的第一个。将文件作为库导入即可获取全部图形。',
  'stencils.fixToPreview': '修正 XML 后即可预览',
  'stencils.nothingToPreview': '没有可预览的内容',
  'stencils.aspect': '宽高比：{aspect}',
  'stencils.connectionPoints': '{count, plural, other {# 个连接点}}',
  'stencils.stroke': '线宽 {width}',
  'stencils.strokeFromStyle': '线宽取自样式',
  'stencils.ignored': '已忽略：{items}',
  'stencils.openXml': '打开 XML…',
  'stencils.revert': '还原',
  'stencils.convertApply': '转换并应用',
  'stencils.addToScratchpad': '添加到便笺本',

  // convert.ts
  'stencils.convert.noStencil': '此自定义图形还没有模具。',
  'stencils.convert.ownText': '{shape}会自行绘制文本，模具无法表达这一点。',
  'stencils.convert.unsupported': '{shape}是内置图形，使用了模具无法表达的功能（{why}）。',
  'stencils.convert.dynamic': '动态渲染',
  'stencils.convert.noOutline': '{shape}没有可转换的轮廓。',
} satisfies Translation<typeof en>;
