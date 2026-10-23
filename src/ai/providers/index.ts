import { anthropic } from './anthropic';
import { gemini } from './gemini';
import { ollama, OLLAMA_DEFAULT_BASE } from './ollama';
import { openai } from './openai';
import type { ProviderAdapter, ProviderId } from './types';

export * from './types';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  tagline: string;
  /** Whether an API key is required (optional for Ollama / custom). */
  needsKey: boolean;
  /** Whether the user configures the endpoint. */
  needsBaseUrl: boolean;
  defaultBaseUrl?: string;
  baseUrlPlaceholder?: string;
  keyPlaceholder?: string;
  keyHelpUrl?: string;
  /** Suggested models, best first. The first is the default. */
  models: Array<{ id: string; label: string; hint?: string }>;
  /** Runs without an internet connection. */
  local?: boolean;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    tagline: 'Claude models',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-ant-…',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', hint: 'Most capable Opus · recommended' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', hint: 'Fast and capable' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', hint: 'Fastest, lowest cost' },
      { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', hint: 'Frontier reasoning, premium price' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'GPT models',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-…',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-5', label: 'GPT-5' },
      { id: 'gpt-5-mini', label: 'GPT-5 mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'Gemini models',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'AIza…',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    tagline: 'Local & offline',
    needsKey: false,
    needsBaseUrl: true,
    defaultBaseUrl: OLLAMA_DEFAULT_BASE,
    baseUrlPlaceholder: OLLAMA_DEFAULT_BASE,
    local: true,
    models: [
      { id: 'qwen3', label: 'Qwen 3', hint: 'Good tool calling' },
      { id: 'llama3.1', label: 'Llama 3.1' },
      { id: 'mistral-small3.2', label: 'Mistral Small 3.2' },
      { id: 'gpt-oss', label: 'gpt-oss' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom endpoint',
    tagline: 'OpenAI-compatible API',
    needsKey: false,
    needsBaseUrl: true,
    baseUrlPlaceholder: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'Optional for local servers',
    models: [],
  },
];

export const PROVIDER_META = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderMeta>;

export const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  anthropic,
  openai,
  gemini,
  ollama,
  custom: openai,
};
