import type en from '../../en/collab';
import type { Translation } from '../../types';

export default {
  'collab.justNow': '刚刚',
  'collab.connector': '连接线',
  'collab.shape': '图形',

  // Comments
  'collab.comments': '评论',
  'collab.resolved': '已解决',
  'collab.closeComments': '关闭评论',
  'collab.noComments': '还没有评论。选择一个图形，给团队留言——评论会保存在文件中。',
  'collab.commentOn': '评论“{name}”…',
  'collab.selectToComment': '选择一个元素以添加评论',
  'collab.comment': '评论',
  'collab.reply': '回复…',
  'collab.reopen': '重新打开',
  'collab.resolve': '解决',

  // Revision history
  'collab.revisions': '修订历史',
  'collab.revisionsSubtitle': '“{name}”的本地快照——每次保存及编辑过程中自动创建。',
  'collab.noRevisions': '还没有修订版本。保存图表即可创建。',
  'collab.revisionSaved': '已保存',
  'collab.revisionAuto': '自动快照',
  'collab.revisionElements': '{count, plural, other {# 个元素}}',
  'collab.deleteRevision': '删除修订版本',
  'collab.revisionPreview': '修订版本预览',
  'collab.selectRevision': '选择修订版本',
  'collab.openAsCopy': '以副本打开',
  'collab.restore': '还原',
  'collab.restoredSuffix': '{name}（已还原）',

  // Preferences
  'prefs.title': '首选项',
  'prefs.language': '语言',
  'prefs.languageAuto': '自动（系统：{language}）',
  'prefs.languageHint': '图形名称和图标搜索词保持英文。',
  'prefs.author': '你的名字（用于评论）',
  'prefs.authorPlaceholder': '例如：张三',
  'prefs.defaultFont': '新图形的默认字体',
  'prefs.fontHand': '手绘',
  'prefs.palette': '自定义调色板（十六进制颜色，以逗号分隔）',
  'prefs.autosave': '自动保存对已打开文件的更改',
  'prefs.startScreen': '启动时显示开始屏幕',
  'prefs.autosaveDesktop': '每次更改后约一秒写入文件（启用备份时，.bkp 文件会保留上一版本）。',
  'prefs.autosaveWeb': '适用于通过浏览器文件选择器打开或保存的文件，以及浏览器库中的文档。',
  'prefs.autosaveFailed': '自动保存失败：{error}',
} satisfies Translation<typeof en>;
