/**
 * Web launch parameters: which mode to start in (editor / viewer / embed) and
 * where the initial diagram comes from. Pure parsing — no side effects — so it
 * can be unit tested and reused by the viewer's "Edit" button.
 *
 *   #R<data>              compressed diagram (see shareLink.ts)
 *   #U<url>               fetch a diagram from a URL (URI-encoded)
 *   ?url=<url>            same, as a query parameter
 *   ?viewer=1 | ?lightbox=1   read-only viewer
 *   ?embed=1              editor driven by a parent window over postMessage
 */

export type LaunchMode = 'editor' | 'viewer' | 'embed';

export type DiagramSource =
  /** Compressed `#R…` fragment (decode with decodeShareHash). */
  | { kind: 'inline'; hash: string }
  /** Absolute http(s) URL to fetch. */
  | { kind: 'url'; url: string };

export interface LaunchParams {
  mode: LaunchMode;
  source: DiagramSource | null;
  /** Problem with the requested source (e.g. a non-http URL); shown to the user. */
  error: string | null;
  /** Document title override (`?title=`). */
  title: string | null;
  /** Initial page: 1-based index, page id or page name (`?page=`). */
  page: string | null;
  /** Theme override (`?theme=dark|light`, or `?dark=1`). */
  theme: 'light' | 'dark' | null;
  /** Embed: post `autosave` events on changes (`?autosave=1`). */
  autosave: boolean;
  /** Embed: the only parent origin we talk to (`?origin=https://host`). */
  parentOrigin: string | null;
  /** Embed: reply with JSON strings instead of objects (`?proto=json`). */
  jsonProtocol: boolean;
  /** Embed: show the Save / Exit buttons (`?saveBtn=0`, `?exitBtn=0`, or draw.io's `noSaveBtn` / `noExitBtn`). */
  saveButton: boolean;
  exitButton: boolean;
  /** Viewer: show the toolbar chrome (`?toolbar=0` hides it, e.g. for tiny embeds). */
  toolbar: boolean;
}

const FALSY = new Set(['0', 'false', 'no', 'off']);

function flag(params: URLSearchParams, ...names: string[]): boolean {
  return names.some((n) => params.has(n) && !FALSY.has((params.get(n) ?? '').toLowerCase()));
}

function optOut(params: URLSearchParams, name: string): boolean {
  return params.has(name) && FALSY.has((params.get(name) ?? '').toLowerCase());
}

/**
 * Validates a diagram URL: resolves it against `base`, only allows http(s),
 * and rewrites GitHub "blob" pages to their raw file.
 */
export function normalizeSourceUrl(raw: string, base: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim(), base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  const gh = url.hostname === 'github.com' && url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (gh) return `https://raw.githubusercontent.com/${gh[1]}/${gh[2]}/${gh[3]}`;
  return url.toString();
}

export function parseLaunchParams(href: string): LaunchParams {
  const url = new URL(href);
  const q = url.searchParams;
  const hash = url.hash.replace(/^#/, '');

  let source: DiagramSource | null = null;
  let error: string | null = null;
  const useUrl = (raw: string) => {
    const norm = normalizeSourceUrl(raw, url.origin + url.pathname);
    if (norm) source = { kind: 'url', url: norm };
    else error = 'Only http(s) diagram URLs can be opened.';
  };

  if (hash.startsWith('R') && hash.length > 1) source = { kind: 'inline', hash: `#${hash}` };
  else if (hash.startsWith('U') && hash.length > 1) {
    let raw = hash.slice(1);
    try {
      raw = decodeURIComponent(raw);
    } catch {
      /* use as-is */
    }
    useUrl(raw);
  } else if (q.get('url')) useUrl(q.get('url')!);

  const themeParam = (q.get('theme') ?? '').toLowerCase();
  const theme = themeParam === 'dark' || themeParam === 'light' ? themeParam : flag(q, 'dark') ? 'dark' : null;

  const mode: LaunchMode = flag(q, 'embed') ? 'embed' : flag(q, 'viewer', 'lightbox') ? 'viewer' : 'editor';

  return {
    mode,
    source,
    error,
    title: q.get('title')?.trim() || null,
    page: q.get('page')?.trim() || null,
    theme,
    autosave: flag(q, 'autosave'),
    parentOrigin: parseOrigin(q.get('origin')),
    jsonProtocol: (q.get('proto') ?? '').toLowerCase() === 'json',
    saveButton: !optOut(q, 'saveBtn') && !flag(q, 'noSaveBtn'),
    exitButton: !optOut(q, 'exitBtn') && !flag(q, 'noExitBtn'),
    toolbar: !optOut(q, 'toolbar'),
  };
}

function parseOrigin(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null;
  } catch {
    return null;
  }
}

/** Params that describe the initial document; stripped once it's loaded so a reload doesn't re-open it. */
const DOCUMENT_PARAMS = ['url', 'title', 'page'];

/** The current URL without the share fragment and document params. */
export function urlWithoutSource(href: string): string {
  const url = new URL(href);
  for (const p of DOCUMENT_PARAMS) url.searchParams.delete(p);
  url.hash = '';
  return url.toString();
}

/** Picks the initial page from a `?page=` value (1-based index, id or name). */
export function resolvePageParam<P extends { id: string; name: string }>(pages: P[], page: string | null): P | undefined {
  if (!page) return undefined;
  if (/^\d+$/.test(page)) return pages[Number(page) - 1];
  return pages.find((p) => p.id === page) ?? pages.find((p) => p.name.toLowerCase() === page.toLowerCase());
}
