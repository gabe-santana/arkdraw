/**
 * Small, self-contained UI primitives for the AI feature (kept local so the
 * feature doesn't depend on in-flux core UI files). Visual language matches
 * the app: 13px Inter, rounded-lg, subtle rings, quick transitions.
 */
import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Laptop, LoaderCircle, Plug } from 'lucide-react';
import { cn } from '@/lib/cn';
import { t, type MessageKey } from '@/i18n';
import { PROVIDER_META, type ProviderId } from '../providers';
import { isTauri } from '../transport';

/** Opens a web page or mail link in the system browser or mail app. */
export async function openLink(url: string) {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else if (url.startsWith('mailto:')) {
    // A mail link hands off to the mail app; a new window would stay behind empty.
    const a = Object.assign(document.createElement('a'), { href: url });
    a.click();
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_1px_2px_rgb(0_0_0/0.15),inset_0_1px_0_rgb(255_255_255/0.18)] hover:bg-accent-hover active:translate-y-px',
  secondary: 'bg-panel text-fg shadow-[0_0_0_1px_var(--line-strong),0_1px_2px_rgb(0_0_0/0.05)] hover:bg-hover active:bg-active',
  ghost: 'text-fg hover:bg-hover active:bg-active',
  danger: 'text-danger hover:bg-danger/10 active:bg-danger/15',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  loading?: boolean;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = 'secondary', size = 'md', icon, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-[background,transform,box-shadow,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[14px]',
        size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
}

export const IconBtn = forwardRef<HTMLButtonElement, IconBtnProps>(function IconBtn({ label, size = 'md', className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg text-muted transition-[background,color,transform] duration-150 hover:bg-hover hover:text-fg active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35',
        size === 'sm' ? 'size-7 [&_svg]:size-[15px]' : 'size-8 [&_svg]:size-[17px]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/**
 * Provider logos, resolved at runtime from the icon packs `npm run icons:fetch`
 * installs (vendor marks are never committed): official service icons for the
 * cloud platforms, the Tech Logos pack for the rest.
 */
const PROVIDER_LOGOS: Partial<Record<ProviderId, string>> = {
  azure: 'azure/ai-machine-learning/ai-foundry.svg',
  bedrock: 'aws/artificial-intelligence/amazon-bedrock.svg',
  vertex: 'gcp/products/vertex-ai.svg',
  cloudflare: 'logos/icons/cloudflare.svg',
  anthropic: 'logos/icons/anthropic.svg',
  openai: 'logos/icons/openai.svg',
  gemini: 'logos/icons/google-gemini.svg',
  xai: 'logos/icons/grok.svg',
  deepseek: 'logos/icons/deepseek.svg',
  mistral: 'logos/icons/mistral-ai.svg',
  openrouter: 'logos/icons/openrouter.svg',
  moonshot: 'logos/icons/moonshot-ai.svg',
  qwen: 'logos/icons/qwen.svg',
  together: 'logos/icons/togetherai.svg',
  cerebras: 'logos/icons/cerebras.svg',
};

/** Logo files that loaded / failed, so remounts don't flash the monogram. */
const logoState = new Map<string, 'ok' | 'failed'>();

/** A provider's logo on a neutral tile; the monogram shows while it loads or when the icon pack isn't installed. */
export function ProviderMark({ provider, size = 28, className }: { provider: ProviderId; size?: number; className?: string }) {
  const path = PROVIDER_LOGOS[provider];
  const [, rerender] = useState(0);
  const state = path ? logoState.get(path) : 'failed';
  if (!path || state === 'failed') return <ProviderMonogram provider={provider} size={size} className={className} />;
  const settle = (result: 'ok' | 'failed') => {
    logoState.set(path, result);
    rerender((n) => n + 1);
  };
  const logo = (
    <img
      src={`${import.meta.env.BASE_URL}icons/${path}`}
      alt=""
      draggable={false}
      onLoad={() => state !== 'ok' && settle('ok')}
      onError={() => settle('failed')}
      className={state === 'ok' ? 'size-full object-contain' : 'hidden'}
    />
  );
  if (state !== 'ok') {
    return (
      <>
        <ProviderMonogram provider={provider} size={size} className={className} />
        {logo}
      </>
    );
  }
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-line', className)}
      style={{ width: size, height: size, padding: Math.max(2, Math.round(size * 0.16)) }}
    >
      {logo}
    </span>
  );
}

/** Monogram / glyph identifying a provider, when its logo isn't available. */
function ProviderMonogram({ provider, size = 28, className }: { provider: ProviderId; size?: number; className?: string }) {
  const base = 'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold text-white';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.46) };
  switch (provider) {
    case 'anthropic':
      return <span className={cn(base, 'bg-[#cc785c]', className)} style={style}>A</span>;
    case 'openai':
      return <span className={cn(base, 'bg-[#10a37f]', className)} style={style}>O</span>;
    case 'gemini':
      return <span className={cn(base, 'bg-gradient-to-br from-[#4285f4] to-[#9b72cb]', className)} style={style}>G</span>;
    case 'xai':
      return <span className={cn(base, 'bg-[#111111] ring-1 ring-white/15', className)} style={style}>X</span>;
    case 'deepseek':
      return <span className={cn(base, 'bg-[#4d6bfe]', className)} style={style}>D</span>;
    case 'mistral':
      return <span className={cn(base, 'bg-gradient-to-br from-[#ffd800] via-[#ff8205] to-[#e10500]', className)} style={style}>M</span>;
    case 'openrouter':
      return <span className={cn(base, 'bg-[#6467f2]', className)} style={style}>R</span>;
    case 'groq':
      return <span className={cn(base, 'bg-[#f55036]', className)} style={style}>Q</span>;
    case 'moonshot':
      return <span className={cn(base, 'bg-[#1a1a2e]', className)} style={style}>K</span>;
    case 'qwen':
      return <span className={cn(base, 'bg-[#615ced]', className)} style={style}>Q</span>;
    case 'zai':
      return <span className={cn(base, 'bg-[#2d2d2d]', className)} style={style}>Z</span>;
    case 'together':
      return <span className={cn(base, 'bg-[#0f6fff]', className)} style={style}>T</span>;
    case 'fireworks':
      return <span className={cn(base, 'bg-[#6720ff]', className)} style={style}>F</span>;
    case 'cerebras':
      return <span className={cn(base, 'bg-[#f05a28]', className)} style={style}>C</span>;
    case 'azure':
      return <span className={cn(base, 'bg-gradient-to-br from-[#0078d4] to-[#50e6ff]', className)} style={style}>Az</span>;
    case 'bedrock':
      return <span className={cn(base, 'bg-[#232f3e] text-[#ff9900]', className)} style={style}>B</span>;
    case 'vertex':
      return <span className={cn(base, 'bg-gradient-to-br from-[#4285f4] to-[#34a853]', className)} style={style}>V</span>;
    case 'cloudflare':
      return <span className={cn(base, 'bg-[#f38020]', className)} style={style}>CF</span>;
    case 'ollama':
      return (
        <span className={cn(base, 'bg-[#111111] ring-1 ring-white/15', className)} style={style}>
          <Laptop style={{ width: size * 0.55, height: size * 0.55 }} />
        </span>
      );
    default:
      return (
        <span className={cn(base, 'bg-muted', className)} style={style}>
          <Plug style={{ width: size * 0.55, height: size * 0.55 }} />
        </span>
      );
  }
}

const TAGLINES: Record<ProviderId, MessageKey> = {
  anthropic: 'ai.provider.anthropic.tagline',
  openai: 'ai.provider.openai.tagline',
  gemini: 'ai.provider.gemini.tagline',
  xai: 'ai.provider.xai.tagline',
  deepseek: 'ai.provider.deepseek.tagline',
  mistral: 'ai.provider.mistral.tagline',
  openrouter: 'ai.provider.openrouter.tagline',
  groq: 'ai.provider.groq.tagline',
  moonshot: 'ai.provider.moonshot.tagline',
  qwen: 'ai.provider.qwen.tagline',
  zai: 'ai.provider.zai.tagline',
  together: 'ai.provider.together.tagline',
  fireworks: 'ai.provider.fireworks.tagline',
  cerebras: 'ai.provider.cerebras.tagline',
  azure: 'ai.provider.azure.tagline',
  bedrock: 'ai.provider.bedrock.tagline',
  vertex: 'ai.provider.vertex.tagline',
  cloudflare: 'ai.provider.cloudflare.tagline',
  ollama: 'ai.provider.ollama.tagline',
  custom: 'ai.provider.custom.tagline',
};

const MODEL_HINTS: Record<string, MessageKey> = {
  'claude-opus-5-5': 'ai.model.hint.mostCapable',
  'claude-sonnet-5-5': 'ai.model.hint.fastCapable',
  'claude-haiku-5-5': 'ai.model.hint.fastest',
  'claude-fable-5-1': 'ai.model.hint.frontier',
  qwen3: 'ai.model.hint.goodTools',
};

/** Display texts of PROVIDER_META, translated at call time (brand names stay as they are). */
export const providerName = (id: ProviderId) => (id === 'custom' ? t('ai.provider.custom.name') : PROVIDER_META[id].name);
export const providerTagline = (id: ProviderId) => (TAGLINES[id] ? t(TAGLINES[id]) : PROVIDER_META[id].tagline);
export const providerKeyPlaceholder = (id: ProviderId) => (id === 'custom' ? t('ai.provider.custom.keyPlaceholder') : PROVIDER_META[id].keyPlaceholder);
export const modelHint = (id: string, hint: string | undefined) => (hint && MODEL_HINTS[id] ? t(MODEL_HINTS[id]) : hint);

export const inputClass =
  'h-8 w-full rounded-lg bg-panel-2 px-2.5 text-[12.5px] text-fg outline-none ring-1 ring-line transition-[box-shadow,background] placeholder:text-subtle hover:ring-line-strong focus:bg-panel focus:ring-2 focus:ring-accent/40';

/** Keeps typing inside the AI UI from triggering canvas shortcuts. */
export const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
