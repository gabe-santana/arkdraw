/**
 * The English dictionary: source of truth and fallback for every language.
 * One module per UI area; keys carry their namespace ('panels.fill') so the
 * merged dictionary stays flat. Translations mirror this layout in
 * src/i18n/locales/<code>/<namespace>.ts.
 */
import common from './common';
import menu from './menu';
import collab from './collab';
import chrome from './chrome';
import exportNs from './export';
import templates from './templates';
import panels from './panels';
import canvas from './canvas';
import automation from './automation';
import plugins from './plugins';
import stencils from './stencils';
import styling from './styling';
import storage from './storage';
import ai from './ai';
import viewer from './viewer';
import web from './web';
import desktop from './desktop';
import app from './app';

/** Namespace → its English strings (the coverage test walks this). */
export const EN_NAMESPACES = {
  common,
  menu,
  collab,
  chrome,
  export: exportNs,
  templates,
  panels,
  canvas,
  automation,
  plugins,
  stencils,
  styling,
  storage,
  ai,
  viewer,
  web,
  desktop,
  app,
} as const;

export const EN = {
  ...common,
  ...menu,
  ...collab,
  ...chrome,
  ...exportNs,
  ...templates,
  ...panels,
  ...canvas,
  ...automation,
  ...plugins,
  ...stencils,
  ...styling,
  ...storage,
  ...ai,
  ...viewer,
  ...web,
  ...desktop,
  ...app,
};

export type MessageKey = keyof typeof EN;
