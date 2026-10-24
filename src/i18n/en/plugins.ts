/**
 * English UI strings — plugins (src/extensibility: Extras → Plugins… dialog and
 * the plugin runtime's toasts / trust prompt). Plugin API errors meant for
 * plugin authors stay in English. Keys: 'plugins.<key>'.
 */
export default {
  // PluginsDialog
  'plugins.title': 'Plugins',
  'plugins.subtitle': 'Extend ArkDraw with commands, shape libraries and file formats',
  'plugins.warning':
    'Plugins run inside ArkDraw with full access to the editor and your diagrams. Only add plugins you trust. You’ll be asked to confirm before one is enabled.',
  // status chip (shown uppercase): the plugin is running
  'plugins.status.active': 'Active',
  // {source} is a URL or file path; the browser keeps a copy of the plugin's code
  'plugins.storedCopy': '{source} (stored copy)',
  'plugins.remove': 'Remove plugin',
  'plugins.empty': 'No plugins yet.',
  'plugins.external': 'Loaded by the app or its configuration',
  // label above the URL / path input
  'plugins.add': 'Add plugin',
  // input placeholder; keep the example URL and paths as they are
  'plugins.sourcePlaceholderDesktop': 'https://…/plugin.js or C:\\path\\plugin.js',
  'plugins.sourcePlaceholderWeb': 'https://…/plugin.js or /plugins/my-plugin.js',
  'plugins.addFromFile': 'Add from file…',

  // plugins.ts — runtime messages
  // a plugin command threw: {plugin} is its name
  'plugins.commandFailed': '{plugin}: {error}',
  // {name} is a file name
  'plugins.exported': 'Exported {name}',
  // {format} is the plugin's file-format name
  'plugins.exportFailed': '{format} export failed: {error}',
  'plugins.trustTitle': 'Enable this plugin?',
  // {what} is the plugin's name, URL or path (shown on its own line)
  'plugins.trustMessage': '{what}\n\nPlugins run inside ArkDraw with full access to your diagrams and the editor. Only enable plugins from sources you trust.',
  'plugins.trustConfirm': 'Enable plugin',
  'plugins.duplicate': 'That plugin is already in the list.',
  'plugins.enabled': 'Plugin enabled: {name}',
  // {id} is the plugin id
  'plugins.failed': 'Plugin {id} failed: {error}',
  // appended to a script-loading error
  'plugins.cspHint': '{error} — the script could not be loaded. Check the URL; hosts with a strict Content-Security-Policy only allow plugins from their own origin.',
} as const;
