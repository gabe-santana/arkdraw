import { anthropic } from './anthropic';
import { bedrock, BEDROCK_REGIONS } from './bedrock';
import { gemini, vertex } from './gemini';
import { ollama, OLLAMA_DEFAULT_BASE } from './ollama';
import { cloudflare, openai } from './openai';
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
  /** How this provider's API keys start, to catch a key pasted for the wrong service. */
  keyPrefix?: string | string[];
  /** Suggested models, best first. The first is the default. */
  models: Array<{ id: string; label: string; hint?: string }>;
  /** Runs without an internet connection. */
  local?: boolean;
  /** Section of the settings picker: the best-known first, then the rest, cloud platforms, then local/custom. */
  group: 'popular' | 'more' | 'cloud' | 'local';
  /** Extra settings shown only for this provider (stored in `AiSettings.params`). */
  fields?: ProviderField[];
}

export interface ProviderField {
  id: 'region' | 'accountId';
  /** A dropdown of these values; free text otherwise. */
  options?: string[];
  default?: string;
  placeholder?: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    tagline: 'Claude models',
    group: 'popular',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-ant-…',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-',
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
    group: 'popular',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-…',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    models: [
      { id: 'gpt-5', label: 'GPT-5' },
      { id: 'gpt-5-mini', label: 'GPT-5 mini' },
      { id: 'o3', label: 'o3' },
      { id: 'o4-mini', label: 'o4-mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-5-nano', label: 'GPT-5 nano' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'Gemini models',
    group: 'popular',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'AIza…',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    keyPrefix: 'AIza',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    tagline: 'Grok models',
    group: 'popular',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'xai-…',
    keyHelpUrl: 'https://console.x.ai',
    keyPrefix: 'xai-',
    models: [
      { id: 'grok-4', label: 'Grok 4' },
      { id: 'grok-4-fast-reasoning', label: 'Grok 4 Fast' },
      { id: 'grok-code-fast-1', label: 'Grok Code Fast 1' },
      { id: 'grok-3-mini', label: 'Grok 3 mini' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    tagline: 'DeepSeek models',
    group: 'popular',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-…',
    keyHelpUrl: 'https://platform.deepseek.com/api_keys',
    keyPrefix: 'sk-',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    tagline: 'Mistral models',
    group: 'more',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'API key',
    keyHelpUrl: 'https://console.mistral.ai/api-keys',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'mistral-medium-latest', label: 'Mistral Medium' },
      { id: 'codestral-latest', label: 'Codestral' },
      { id: 'ministral-8b-latest', label: 'Ministral 8B' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    tagline: 'Many models, one key',
    group: 'more',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-or-…',
    keyHelpUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-',
    models: [
      { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
      { id: 'openai/gpt-5', label: 'GPT-5' },
      { id: 'x-ai/grok-4', label: 'Grok 4' },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    tagline: 'Fast open models',
    group: 'more',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'gsk_…',
    keyHelpUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    models: [
      { id: 'openai/gpt-oss-120b', label: 'gpt-oss 120B' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot Kimi',
    tagline: 'Kimi models',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-…',
    keyHelpUrl: 'https://platform.moonshot.ai/console/api-keys',
    keyPrefix: 'sk-',
    group: 'more',
    models: [
      { id: 'kimi-k2-0905-preview', label: 'Kimi K2' },
      { id: 'kimi-k2-turbo-preview', label: 'Kimi K2 Turbo' },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    tagline: 'Alibaba Cloud Model Studio',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'sk-…',
    keyHelpUrl: 'https://modelstudio.console.alibabacloud.com/',
    keyPrefix: 'sk-',
    group: 'more',
    models: [
      { id: 'qwen3-max', label: 'Qwen3 Max' },
      { id: 'qwen-plus', label: 'Qwen Plus' },
      { id: 'qwen-flash', label: 'Qwen Flash' },
    ],
  },
  {
    id: 'zai',
    name: 'Z.ai',
    tagline: 'GLM models',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'API key',
    keyHelpUrl: 'https://z.ai/manage-apikey/apikey-list',
    group: 'more',
    models: [
      { id: 'glm-4.6', label: 'GLM-4.6' },
      { id: 'glm-4.5-air', label: 'GLM-4.5 Air' },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    tagline: 'Open models, hosted',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'API key',
    keyHelpUrl: 'https://api.together.ai/settings/api-keys',
    group: 'more',
    models: [
      { id: 'moonshotai/Kimi-K2-Instruct-0905', label: 'Kimi K2' },
      { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507-tput', label: 'Qwen3 235B' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo' },
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    tagline: 'Open models, hosted',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'fw_…',
    keyHelpUrl: 'https://app.fireworks.ai/settings/users/api-keys',
    group: 'more',
    models: [
      { id: 'accounts/fireworks/models/kimi-k2-instruct-0905', label: 'Kimi K2' },
      { id: 'accounts/fireworks/models/deepseek-v3p1', label: 'DeepSeek V3.1' },
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    tagline: 'Very fast inference',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'csk-…',
    keyHelpUrl: 'https://cloud.cerebras.ai/',
    keyPrefix: 'csk-',
    group: 'more',
    models: [
      { id: 'gpt-oss-120b', label: 'gpt-oss 120B' },
      { id: 'qwen-3-235b-a22b-instruct-2507', label: 'Qwen3 235B' },
    ],
  },
  {
    id: 'azure',
    name: 'Azure AI Foundry',
    tagline: 'Azure OpenAI & Foundry models',
    needsKey: true,
    needsBaseUrl: true,
    baseUrlPlaceholder: 'https://<resource>.services.ai.azure.com',
    keyHelpUrl: 'https://ai.azure.com/',
    group: 'cloud',
    // Deployment names are the user's own: typed, not suggested.
    models: [],
  },
  {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    tagline: 'Claude, Nova, Llama & more on AWS',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'Bedrock API key',
    keyHelpUrl: 'https://console.aws.amazon.com/bedrock/home#/api-keys',
    group: 'cloud',
    fields: [{ id: 'region', options: BEDROCK_REGIONS, default: BEDROCK_REGIONS[0] }],
    models: [
      { id: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', label: 'Claude Sonnet 4.5' },
      { id: 'us.anthropic.claude-opus-4-1-20250805-v1:0', label: 'Claude Opus 4.1' },
      { id: 'us.amazon.nova-pro-v1:0', label: 'Amazon Nova Pro' },
      { id: 'us.meta.llama3-3-70b-instruct-v1:0', label: 'Llama 3.3 70B' },
      { id: 'us.deepseek.r1-v1:0', label: 'DeepSeek R1' },
    ],
  },
  {
    id: 'vertex',
    name: 'Google Vertex AI',
    tagline: 'Gemini on Google Cloud',
    needsKey: true,
    needsBaseUrl: false,
    keyHelpUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview',
    group: 'cloud',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    tagline: 'Open models at the edge',
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: 'API token',
    keyHelpUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    group: 'cloud',
    fields: [{ id: 'accountId', placeholder: '0123456789abcdef0123456789abcdef' }],
    models: [
      { id: '@cf/openai/gpt-oss-120b', label: 'gpt-oss 120B' },
      { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B' },
      { id: '@cf/qwen/qwen2.5-coder-32b-instruct', label: 'Qwen2.5 Coder 32B' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    tagline: 'Local & offline',
    group: 'local',
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
    group: 'local',
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
  xai: openai,
  deepseek: openai,
  mistral: openai,
  openrouter: openai,
  groq: openai,
  moonshot: openai,
  qwen: openai,
  zai: openai,
  together: openai,
  fireworks: openai,
  cerebras: openai,
  azure: openai,
  bedrock,
  vertex,
  cloudflare,
  ollama,
  custom: openai,
};

const prefixes = (id: ProviderId): string[] => {
  const p = PROVIDER_META[id].keyPrefix;
  return p === undefined ? [] : Array.isArray(p) ? p : [p];
};

export type KeyCheck =
  /** A grok.com key (for the Grok app) pasted as an xAI API key. */
  | { kind: 'grokApp' }
  /** The key carries another provider's distinctive prefix. */
  | { kind: 'otherProvider'; other: ProviderId }
  /** The key doesn't start the way this provider's keys do. */
  | { kind: 'unexpected'; prefix: string };

/** A gentle sanity check of a pasted key (never blocks saving): null when it looks right or can't be judged. */
export function checkKeyPrefix(provider: ProviderId, rawKey: string): KeyCheck | null {
  const key = rawKey.trim();
  const own = prefixes(provider);
  if (!key || !own.length) return null;
  if (provider === 'xai' && key.startsWith('grok_')) return { kind: 'grokApp' };
  // The most specific known prefix wins: "sk-ant-…" is Anthropic's even though OpenAI keys start with "sk-".
  let best: { prefix: string; ids: ProviderId[] } | null = null;
  for (const p of PROVIDERS) {
    for (const pre of prefixes(p.id)) {
      if (!key.startsWith(pre)) continue;
      if (!best || pre.length > best.prefix.length) best = { prefix: pre, ids: [p.id] };
      else if (pre === best.prefix) best.ids.push(p.id);
    }
  }
  if (best?.ids.includes(provider)) return null;
  if (best?.ids.length === 1) return { kind: 'otherProvider', other: best.ids[0] };
  return { kind: 'unexpected', prefix: own[0] };
}
