/**
 * Mounts the extensibility features into the app: the stencil editor and
 * Plugins dialogs, the editor UI mode (a `data-ui-mode` attribute on <html>,
 * styled in src/index.css), `window.OpenDraw`, and saved plugins.
 */
import { useEffect } from 'react';
import { StencilEditorDialog } from '@/stencils/StencilEditorDialog';
import { PluginsDialog } from './PluginsDialog';
import { useExt } from './store';
import { isTauri } from '@/lib/platform';
import { enabledPluginPaths, loadAppConfig } from '@/desktop/config';
import { installPluginGlobal, loadPluginsFrom, loadSavedPlugins } from './plugins';
import './actions';

export function ExtensibilityHost() {
  const uiMode = useExt((s) => s.uiMode);

  useEffect(() => {
    const root = document.documentElement;
    if (uiMode === 'default') delete root.dataset.uiMode;
    else root.dataset.uiMode = uiMode;
  }, [uiMode]);

  useEffect(() => {
    installPluginGlobal();
    void loadSavedPlugins();
    // Desktop: plugins listed in config.json (only with --enable-plugins / enablePlugins).
    if (isTauri())
      void loadAppConfig().then(() => {
        const paths = enabledPluginPaths();
        if (paths.length) void loadPluginsFrom(paths);
      });
  }, []);

  return (
    <>
      <StencilEditorDialog />
      <PluginsDialog />
    </>
  );
}
