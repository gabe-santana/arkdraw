import type en from '../../en/svgImport';
import type { Translation } from '../../types';

export default {
  'svgImport.title': '导入 SVG',
  'svgImport.message': '将{name}作为单个图像插入，或将其路径、图形和文本转换为可编辑的图形。',
  'svgImport.unnamed': '此 SVG 文件',
  'svgImport.perGroup': '每个组生成一个图形（保留颜色，图形更少）',
  'svgImport.asImage': '作为图像插入',
  'svgImport.convert': '转换为图形',
  'svgImport.converted': '{count, plural, other {已转换为 # 个图形（已组合）。}}',
  'svgImport.pickTitle': 'SVG 转图形',

  // Conversion notes (shown after the "Converted to…" sentence)
  'svgImport.msg.invalid': '此文件不是有效的 SVG 图像。',
  'svgImport.msg.empty': '此 SVG 中没有可转换为图形的内容。',
  'svgImport.msg.gradient': '渐变已替换为其第一种颜色。',
  'svgImport.msg.pattern': '图案填充已替换为纯色。',
  'svgImport.msg.clip': '已忽略剪切路径和蒙版。',
  'svgImport.msg.filter': '已忽略滤镜（模糊、阴影）。',
  'svgImport.msg.marker': '已忽略路径标记（线条保留简单箭头）。',
  'svgImport.msg.skewText': '倾斜的文本和图像已按其旋转边框近似处理。',
  'svgImport.msg.foreign': '嵌入的 HTML（foreignObject）已转换为纯文本。',
  'svgImport.msg.relativeImage': '已跳过使用相对链接的图像。',
} satisfies Translation<typeof en>;
