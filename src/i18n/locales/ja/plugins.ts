import type en from '../../en/plugins';
import type { Translation } from '../../types';

export default {
  // PluginsDialog
  'plugins.title': 'プラグイン',
  'plugins.subtitle': 'コマンド、図形ライブラリ、ファイル形式で ArkDraw を拡張します',
  'plugins.warning':
    'プラグインは ArkDraw 内で実行され、エディターとダイアグラムに完全にアクセスできます。信頼できるプラグインのみを追加してください。有効化する前に確認を求められます。',
  // status chip (shown uppercase): the plugin is running
  'plugins.status.active': '有効',
  // {source} is a URL or file path; the browser keeps a copy of the plugin's code
  'plugins.storedCopy': '{source} (保存済みのコピー)',
  'plugins.remove': 'プラグインを削除',
  'plugins.empty': 'プラグインはまだありません。',
  'plugins.external': 'アプリまたはその構成によって読み込まれました',
  // label above the URL / path input
  'plugins.add': 'プラグインを追加',
  // input placeholder; keep the example URL and paths as they are
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js または C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js または /plugins/my-plugin.js',
  'plugins.addFromFile': 'ファイルから追加…',

  // plugins.ts — runtime messages
  // a plugin command threw: {plugin} is its name
  'plugins.commandFailed': '{plugin}: {error}',
  // {name} is a file name
  'plugins.exported': '{name} をエクスポートしました',
  // {format} is the plugin's file-format name
  'plugins.exportFailed': '{format} のエクスポートに失敗しました: {error}',
  'plugins.trustTitle': 'このプラグインを有効にしますか?',
  // {what} is the plugin's name, URL or path (shown on its own line)
  'plugins.trustMessage': '{what}\n\nプラグインは ArkDraw 内で実行され、ダイアグラムとエディターに完全にアクセスできます。信頼できる提供元のプラグインのみを有効にしてください。',
  'plugins.trustConfirm': 'プラグインを有効化',
  'plugins.duplicate': 'そのプラグインはすでにリストにあります。',
  'plugins.enabled': 'プラグインを有効にしました: {name}',
  // {id} is the plugin id
  'plugins.failed': 'プラグイン {id} でエラーが発生しました: {error}',
  // appended to a script-loading error
  'plugins.cspHint': '{error} — スクリプトを読み込めませんでした。URL を確認してください。厳格な Content-Security-Policy を設定しているホストでは、同一オリジンのプラグインしか許可されません。',
} satisfies Translation<typeof en>;
