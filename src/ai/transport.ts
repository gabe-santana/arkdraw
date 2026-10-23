/**
 * Key storage and authenticated HTTP.
 *
 * Desktop (Tauri): keys live in the OS keychain and every provider request is
 * executed by Rust (`ai_request`), which injects the auth header itself — the
 * key never comes back to the webview. Rust only talks to the provider's own
 * host, or to the endpoint the key was saved for (Ollama / custom).
 *
 * Browser (`npm run dev` without Tauri): keys are kept in memory for this tab
 * only and requests go straight from the page. The UI shows a warning.
 */
import { invoke } from '@tauri-apps/api/core';
import { ADAPTERS, AiError, type HttpRequest, type HttpResponse, type ModelInfo, type ProviderConfig, type ProviderId, type ChatRequest, type ChatResponse } from './providers';
import { ANTHROPIC_VERSION } from './providers/anthropic';
import type { CustomAuthStyle } from './settings';
import { t } from '@/i18n';

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface MemoryKey {
  key: string;
  origin?: string;
  auth: CustomAuthStyle;
}
const memoryKeys = new Map<ProviderId, MemoryKey>();

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    throw new AiError(t('ai.error.invalidUrl', { url }));
  }
};

export interface SaveKeyOptions {
  /** Endpoint the key is bound to (Ollama / custom). */
  baseUrl?: string;
  auth?: CustomAuthStyle;
}

/** Saves a key (and, for Ollama / custom, authorizes the endpoint). An empty key is allowed for those two. */
export async function saveKey(provider: ProviderId, key: string, opts: SaveKeyOptions = {}): Promise<void> {
  const trimmed = key.trim();
  if (isTauri()) {
    await invoke('ai_set_key', { provider, key: trimmed, baseUrl: opts.baseUrl ?? null, auth: opts.auth ?? null });
    return;
  }
  memoryKeys.set(provider, { key: trimmed, origin: opts.baseUrl ? originOf(opts.baseUrl) : undefined, auth: opts.auth ?? 'bearer' });
}

export async function hasKey(provider: ProviderId): Promise<boolean> {
  if (isTauri()) return invoke<boolean>('ai_has_key', { provider });
  return !!memoryKeys.get(provider)?.key;
}

export async function deleteKey(provider: ProviderId): Promise<void> {
  if (isTauri()) {
    await invoke('ai_delete_key', { provider });
    return;
  }
  memoryKeys.delete(provider);
}

function authHeaders(provider: ProviderId, mk: MemoryKey | undefined): Record<string, string> {
  const key = mk?.key;
  switch (provider) {
    case 'anthropic':
      if (!key) throw new AiError(t('ai.error.addKey', { provider: 'Anthropic' }));
      return { 'x-api-key': key, 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' };
    case 'openai':
      if (!key) throw new AiError(t('ai.error.addKey', { provider: 'OpenAI' }));
      return { Authorization: `Bearer ${key}` };
    case 'gemini':
      if (!key) throw new AiError(t('ai.error.addKey', { provider: 'Gemini' }));
      return { 'x-goog-api-key': key };
    default:
      if (!key) return {};
      return mk?.auth === 'api-key' ? { 'api-key': key } : { Authorization: `Bearer ${key}` };
  }
}

function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

/** Executes a provider request with auth injected. */
export async function sendRequest(provider: ProviderId, req: HttpRequest, signal?: AbortSignal): Promise<HttpResponse> {
  const body = req.body === undefined ? undefined : JSON.stringify(req.body);
  if (isTauri()) {
    const p = invoke<HttpResponse>('ai_request', {
      provider,
      url: req.url,
      method: req.method,
      body: body ?? null,
      headers: req.headers ?? null,
    }).catch((e: unknown) => {
      throw new AiError(typeof e === 'string' ? e : e instanceof Error ? e.message : t('ai.error.requestFailed'));
    });
    return abortable(p, signal);
  }
  const headers: Record<string, string> = {
    ...(body ? { 'content-type': 'application/json' } : {}),
    ...(req.headers ?? {}),
    ...authHeaders(provider, memoryKeys.get(provider)),
  };
  let res: Response;
  try {
    res = await fetch(req.url, { method: req.method, headers, body, signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    const host = new URL(req.url).host;
    throw new AiError(provider === 'ollama' ? t('ai.error.unreachableOllama', { host }) : t('ai.error.unreachable', { host }));
  }
  return { status: res.status, body: await res.text() };
}

/** Turns an HTTP error body into a readable message. */
export function describeHttpError(status: number, body: string): string {
  let detail = '';
  try {
    const j = JSON.parse(body) as { error?: string | { message?: string }; message?: string };
    detail = typeof j.error === 'string' ? j.error : (j.error?.message ?? j.message ?? '');
  } catch {
    detail = body.slice(0, 200);
  }
  const prefix =
    status === 401 || status === 403
      ? t('ai.http.rejected')
      : status === 404
        ? t('ai.http.notFound')
        : status === 429
          ? t('ai.http.rateLimited')
          : status === 529 || status === 503
            ? t('ai.http.overloaded')
            : t('ai.http.failed', { status: String(status) });
  return detail ? t('ai.http.withDetail', { message: prefix, detail }) : t('ai.http.noDetail', { message: prefix });
}

export async function requestJson(provider: ProviderId, req: HttpRequest, signal?: AbortSignal): Promise<unknown> {
  const res = await sendRequest(provider, req, signal);
  if (res.status < 200 || res.status >= 300) throw new AiError(describeHttpError(res.status, res.body), res.status);
  try {
    return JSON.parse(res.body);
  } catch {
    throw new AiError(t('ai.error.invalidResponse'));
  }
}

export async function chat(config: ProviderConfig, req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  if (!config.model) throw new AiError(t('ai.error.chooseModel'));
  const adapter = ADAPTERS[config.provider];
  const json = await requestJson(config.provider, adapter.buildChat(config, req), signal);
  return adapter.parseChat(json);
}

/** Verifies the key/endpoint by listing models. Resolves with the available models. */
export async function testConnection(config: ProviderConfig, signal?: AbortSignal): Promise<ModelInfo[]> {
  const adapter = ADAPTERS[config.provider];
  const json = await requestJson(config.provider, adapter.buildListModels(config), signal);
  return adapter.parseListModels(json);
}
