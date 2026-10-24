/**
 * Non-secret AI settings (provider, model, endpoint), persisted in
 * localStorage. API keys are NOT stored here — see `transport.ts`.
 */
import { useSyncExternalStore } from 'react';
import { PROVIDER_META, type ProviderConfig, type ProviderId } from './providers';

export type CustomAuthStyle = 'bearer' | 'api-key';

export interface AiSettings {
  provider: ProviderId;
  /** Selected model per provider. */
  models: Partial<Record<ProviderId, string>>;
  /** Endpoint per provider (Ollama / custom). */
  baseUrls: Partial<Record<ProviderId, string>>;
  /** Auth header style for the custom endpoint. */
  customAuth: CustomAuthStyle;
  /** Auth header style for Azure (`api-key` unless the resource uses Entra ID tokens). */
  azureAuth: CustomAuthStyle;
  /** Extra per-provider settings (ProviderMeta.fields): Bedrock `region`, Cloudflare `accountId`. */
  params: Partial<Record<ProviderId, Record<string, string>>>;
  /** Endpoint each Ollama/custom key entry was saved for (UI hint only; Rust enforces it). */
  authorizedBaseUrls: Partial<Record<ProviderId, string>>;
  /** Browser build: keep keys across reloads, encrypted in this browser (keyVault.ts). */
  rememberKeys: boolean;
}

const STORAGE_KEY = 'opendraw.ai.settings.v1';
const PROVIDER_IDS: ProviderId[] = ['anthropic', 'openai', 'gemini', 'xai', 'deepseek', 'mistral', 'openrouter', 'groq', 'moonshot', 'qwen', 'zai', 'together', 'fireworks', 'cerebras', 'azure', 'bedrock', 'vertex', 'cloudflare', 'ollama', 'custom'];

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'anthropic',
  models: {},
  baseUrls: {},
  customAuth: 'bearer',
  azureAuth: 'api-key',
  params: {},
  authorizedBaseUrls: {},
  rememberKeys: true,
};

function load(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      provider: PROVIDER_IDS.includes(parsed.provider as ProviderId) ? (parsed.provider as ProviderId) : 'anthropic',
      models: typeof parsed.models === 'object' && parsed.models ? parsed.models : {},
      baseUrls: typeof parsed.baseUrls === 'object' && parsed.baseUrls ? parsed.baseUrls : {},
      customAuth: parsed.customAuth === 'api-key' ? 'api-key' : 'bearer',
      azureAuth: parsed.azureAuth === 'bearer' ? 'bearer' : 'api-key',
      params: typeof parsed.params === 'object' && parsed.params ? parsed.params : {},
      authorizedBaseUrls: typeof parsed.authorizedBaseUrls === 'object' && parsed.authorizedBaseUrls ? parsed.authorizedBaseUrls : {},
      rememberKeys: parsed.rememberKeys !== false,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

let current: AiSettings | null = null;
const listeners = new Set<() => void>();

export function getAiSettings(): AiSettings {
  if (!current) current = load();
  return current;
}

export function updateAiSettings(patch: Partial<AiSettings>): AiSettings {
  current = { ...getAiSettings(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAiSettings(): AiSettings {
  return useSyncExternalStore(subscribe, getAiSettings, getAiSettings);
}

export function modelFor(s: AiSettings, provider: ProviderId = s.provider): string {
  return s.models[provider] || PROVIDER_META[provider].models[0]?.id || '';
}

export function baseUrlFor(s: AiSettings, provider: ProviderId = s.provider): string | undefined {
  return s.baseUrls[provider] || PROVIDER_META[provider].defaultBaseUrl;
}

/** A provider field's value (ProviderMeta.fields), falling back to its default. */
export function paramFor(s: AiSettings, provider: ProviderId, field: string): string {
  return s.params[provider]?.[field] || PROVIDER_META[provider].fields?.find((f) => f.id === field)?.default || '';
}

/** Header style used with the stored key (custom endpoints and Azure let the user choose). */
export function authStyleFor(s: AiSettings, provider: ProviderId = s.provider): CustomAuthStyle | undefined {
  return provider === 'custom' ? s.customAuth : provider === 'azure' ? s.azureAuth : undefined;
}

export function providerConfig(s: AiSettings, provider: ProviderId = s.provider): ProviderConfig {
  const fields = PROVIDER_META[provider].fields;
  const params = fields ? Object.fromEntries(fields.map((f) => [f.id, paramFor(s, provider, f.id)])) : undefined;
  return { provider, model: modelFor(s, provider), baseUrl: baseUrlFor(s, provider), ...(params ? { params } : {}) };
}
