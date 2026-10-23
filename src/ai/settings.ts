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
  /** Auth header style for the custom endpoint (`api-key` for Azure). */
  customAuth: CustomAuthStyle;
  /** Endpoint each Ollama/custom key entry was saved for (UI hint only; Rust enforces it). */
  authorizedBaseUrls: Partial<Record<ProviderId, string>>;
}

const STORAGE_KEY = 'opendraw.ai.settings.v1';
const PROVIDER_IDS: ProviderId[] = ['anthropic', 'openai', 'gemini', 'ollama', 'custom'];

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'anthropic',
  models: {},
  baseUrls: {},
  customAuth: 'bearer',
  authorizedBaseUrls: {},
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
      authorizedBaseUrls: typeof parsed.authorizedBaseUrls === 'object' && parsed.authorizedBaseUrls ? parsed.authorizedBaseUrls : {},
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

export function providerConfig(s: AiSettings, provider: ProviderId = s.provider): ProviderConfig {
  return { provider, model: modelFor(s, provider), baseUrl: baseUrlFor(s, provider) };
}
