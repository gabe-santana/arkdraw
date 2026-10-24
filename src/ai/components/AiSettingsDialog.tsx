/**
 * BYOK settings: pick a provider, store its key in the OS keychain, choose a
 * model, configure the endpoint (Ollama / OpenAI-compatible), test it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, ChevronDown, CircleAlert, CircleCheck, ExternalLink, Eye, EyeOff, KeyRound, LoaderCircle, Lock, ShieldCheck, Trash,
  TriangleAlert, X, Zap,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t as tNow, useT, type MessageKey } from '@/i18n';
import { ADAPTERS, AiError, checkKeyPrefix, PROVIDERS, PROVIDER_META, type ModelInfo, type ProviderField, type ProviderId, type ProviderMeta } from '../providers';
import { azureBase, normalizeBaseUrl } from '../providers/openai';
import { authStyleFor, baseUrlFor, modelFor, paramFor, providerConfig, updateAiSettings, useAiSettings, type CustomAuthStyle } from '../settings';
import { deleteKey, hasKey, isTauri, saveKey, setRememberKeys, testConnection } from '../transport';
import { Btn, IconBtn, inputClass, modelHint, ProviderMark, providerKeyPlaceholder, providerName, providerTagline, stopKeys } from './ui';
import { notifyKeysChanged, useHasKey } from './useAiReady';

export interface AiSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type TestState = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok'; models: number } | { kind: 'error'; message: string; detail?: string };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : tNow('ai.settings.somethingWrong'));

/** Opens a provider's key page in the system browser. */
async function openLink(url: string) {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

const GROUPS: Array<{ id: ProviderMeta['group']; label: MessageKey }> = [
  { id: 'popular', label: 'ai.settings.group.popular' },
  { id: 'more', label: 'ai.settings.group.more' },
  { id: 'cloud', label: 'ai.settings.group.cloud' },
  { id: 'local', label: 'ai.settings.group.local' },
];

/** One-line setup help under the cloud platforms' fields. */
const CLOUD_HELP: Partial<Record<ProviderId, MessageKey>> = {
  azure: 'ai.provider.azure.help',
  bedrock: 'ai.provider.bedrock.help',
  vertex: 'ai.provider.vertex.help',
  cloudflare: 'ai.provider.cloudflare.help',
};

const FIELD_LABEL: Record<ProviderField['id'], MessageKey> = {
  region: 'ai.settings.field.region',
  accountId: 'ai.settings.field.accountId',
};

export function AiSettingsDialog({ open, onClose }: AiSettingsDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="animate-fade fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
        className="animate-pop flex max-h-[min(720px,calc(100vh-32px))] w-[560px] max-w-full flex-col overflow-hidden rounded-xl bg-panel text-[13px] text-fg shadow-pop"
        onKeyDown={stopKeys}
      >
        <SettingsBody onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}

function SettingsBody({ onClose }: { onClose: () => void }) {
  const t = useT();
  const settings = useAiSettings();
  const provider = settings.provider;
  const meta = PROVIDER_META[provider];
  const [has, refreshHas] = useHasKey(provider);
  const [keyDraft, setKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [showMore, setShowMore] = useState(false);
  const [fetched, setFetched] = useState<Partial<Record<ProviderId, ModelInfo[]>>>({});
  const [urlDraft, setUrlDraft] = useState(baseUrlFor(settings) ?? '');
  const keyInput = useRef<HTMLInputElement>(null);
  /** A key save in flight (from blur), so "Test connection" waits for it instead of saving twice. */
  const saving = useRef<Promise<boolean> | null>(null);
  /** Azure's endpoint was copied from the custom provider (its key can't be: keys are write-only). */
  const [prefilled, setPrefilled] = useState(false);

  // Reset per-provider UI state when switching providers.
  useEffect(() => {
    setKeyDraft('');
    setShowKey(false);
    setReplacing(false);
    setKeyError(null);
    setTest({ kind: 'idle' });
    setPrefilled(false);
    let url = baseUrlFor(settings, provider) ?? '';
    const custom = settings.baseUrls.custom;
    if (provider === 'azure' && !url && custom) {
      try {
        azureBase(custom);
        url = custom;
        updateAiSettings({ baseUrls: { ...settings.baseUrls, azure: custom } });
        setPrefilled(true);
      } catch {
        /* not an Azure resource */
      }
    }
    setUrlDraft(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const baseUrl = baseUrlFor(settings);
  const endpointChanged = meta.needsBaseUrl && !!has && !!baseUrl && settings.authorizedBaseUrls[provider] !== undefined && settings.authorizedBaseUrls[provider] !== baseUrl;
  const showKeyInput = has === false || replacing || endpointChanged;

  const authorize = async (key: string) => {
    await saveKey(provider, key, { baseUrl: meta.needsBaseUrl ? baseUrl : undefined, auth: authStyleFor(settings, provider) });
    if (meta.needsBaseUrl && baseUrl) updateAiSettings({ authorizedBaseUrls: { ...settings.authorizedBaseUrls, [provider]: baseUrl } });
    notifyKeysChanged();
    refreshHas();
  };

  /** Saves what's typed in the key field (on blur, Enter, Save or before a test). Resolves false when it failed. */
  const saveDraft = (): Promise<boolean> => {
    const k = keyDraft.trim();
    if (!k) return saving.current ?? Promise.resolve(true);
    if (saving.current) return saving.current;
    if (meta.needsBaseUrl && !baseUrl) {
      setKeyError(t('ai.settings.setEndpointFirst'));
      return Promise.resolve(false);
    }
    setBusy(true);
    setKeyError(null);
    saving.current = authorize(k)
      .then(() => {
        setKeyDraft('');
        setReplacing(false);
        setShowKey(false);
        return true;
      })
      .catch((e: unknown) => {
        setKeyError(errMsg(e));
        return false;
      })
      .finally(() => {
        setBusy(false);
        saving.current = null;
      });
    return saving.current;
  };

  const runTest = async () => {
    if (!(await saveDraft())) return;
    // Never call the provider without a key: say so and point at the field.
    if (meta.needsKey && !(await hasKey(provider).catch(() => false))) {
      setTest({ kind: 'idle' });
      setKeyError(t('ai.settings.saveKeyFirst'));
      keyInput.current?.focus();
      return;
    }
    setTest({ kind: 'testing' });
    try {
      // Ollama / custom without a key: make sure the endpoint is authorized first.
      if (!meta.needsKey && meta.needsBaseUrl && !has && baseUrl && settings.authorizedBaseUrls[provider] !== baseUrl) await authorize('');
      const models = await testConnection(providerConfig(settings));
      setFetched((f) => ({ ...f, [provider]: models }));
      setTest({ kind: 'ok', models: models.length });
    } catch (e) {
      setTest({ kind: 'error', message: errMsg(e), detail: e instanceof AiError ? e.detail : undefined });
    }
  };

  const onSaveKey = async () => {
    if (!keyDraft.trim()) return;
    if (await saveDraft()) void runTest();
  };

  const onDeleteKey = async () => {
    setBusy(true);
    try {
      await deleteKey(provider);
      const { [provider]: _removed, ...rest } = settings.authorizedBaseUrls;
      updateAiSettings({ authorizedBaseUrls: rest });
      notifyKeysChanged();
      refreshHas();
      setTest({ kind: 'idle' });
    } catch (e) {
      setKeyError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const commitUrl = async () => {
    const v = urlDraft.trim();
    if (v === (settings.baseUrls[provider] ?? meta.defaultBaseUrl ?? '')) return;
    try {
      if (v) new URL(v);
    } catch {
      setKeyError(t('ai.settings.enterFullUrl', { example: provider === 'azure' ? 'https://<resource>.services.ai.azure.com' : 'https://openrouter.ai/api/v1' }));
      return;
    }
    if (provider === 'azure' && v) {
      try {
        azureBase(v);
      } catch (e) {
        setKeyError(errMsg(e));
        return;
      }
    }
    setKeyError(null);
    setTest({ kind: 'idle' });
    updateAiSettings({ baseUrls: { ...settings.baseUrls, [provider]: v || undefined } });
  };

  const setAuthStyle = (auth: CustomAuthStyle) => {
    if (auth === authStyleFor(settings, provider)) return;
    updateAiSettings(provider === 'azure' ? { azureAuth: auth } : { customAuth: auth });
    if (has) setReplacing(true); // the auth style is stored with the key
  };

  const setParam = (field: string, value: string) => {
    setTest({ kind: 'idle' });
    updateAiSettings({ params: { ...settings.params, [provider]: { ...settings.params[provider], [field]: value } } });
  };

  const models = useMemo(() => {
    const suggested = meta.models.map((m) => ({ id: m.id, label: m.label, hint: modelHint(m.id, m.hint) }));
    const seen = new Set(suggested.map((m) => m.id));
    const extra = (fetched[provider] ?? []).filter((m) => !seen.has(m.id)).map((m) => ({ id: m.id, label: m.label ?? m.id, hint: undefined }));
    return [...suggested, ...extra];
  }, [meta, fetched, provider, t]);

  // Providers that can't list models are tested with a tiny chat, which needs a model.
  const canTest = (!meta.needsBaseUrl || !!baseUrl) && (!endpointChanged || !!keyDraft.trim()) && (!!ADAPTERS[provider].buildListModels || !!modelFor(settings));

  return (
    <>
      <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-4">
        <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <KeyRound className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="ai-settings-title" className="text-[14px] font-semibold leading-tight">{t('ai.settings.title')}</h2>
          <p className="mt-0.5 text-[12px] text-muted">{t('ai.settings.subtitle')}</p>
        </div>
        <IconBtn label={t('common.close')} size="sm" onClick={onClose}>
          <X />
        </IconBtn>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
        <SectionLabel>{t('ai.settings.provider')}</SectionLabel>
        <div className="space-y-3">
          {GROUPS.map((g) => {
            const items = PROVIDERS.filter((p) => p.group === g.id);
            const folded = g.id === 'more' && !showMore && meta.group !== 'more';
            return (
              <div key={g.id}>
                <button
                  type="button"
                  disabled={g.id !== 'more'}
                  onClick={() => setShowMore((v) => !v)}
                  aria-expanded={g.id === 'more' ? !folded : undefined}
                  className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-subtle enabled:hover:text-fg"
                >
                  {g.id === 'more' && <ChevronDown className={cn('size-3 transition-transform', folded && '-rotate-90')} />}
                  {t(g.label)}
                  {g.id === 'more' && <span className="font-normal normal-case tracking-normal">· {items.length}</span>}
                </button>
                {!folded && (
                  <div className="animate-fade grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {items.map((p) => (
                      <ProviderCard key={p.id} id={p.id} active={p.id === provider} onSelect={() => updateAiSettings({ provider: p.id })} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div key={provider} className="animate-slide-up mt-5 space-y-4">
          {meta.needsBaseUrl && (
            <Field
              label={provider === 'ollama' ? t('ai.settings.ollamaUrl') : provider === 'azure' ? t('ai.settings.azureEndpoint') : t('ai.settings.baseUrl')}
              hint={provider === 'custom' ? t('ai.settings.customHint') : undefined}
            >
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={commitUrl}
                onKeyDown={(e) => {
                  stopKeys(e);
                  if (e.key === 'Enter') void commitUrl();
                }}
                placeholder={meta.baseUrlPlaceholder}
                spellCheck={false}
                className={inputClass}
              />
              <ResolvedEndpoint provider={provider} url={urlDraft} />
              {(provider === 'custom' || provider === 'azure') && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                  <span>{t('ai.settings.authHeader')}</span>
                  <Segmented
                    value={authStyleFor(settings, provider)!}
                    onChange={setAuthStyle}
                    options={
                      provider === 'azure'
                        ? [
                            { value: 'api-key', label: 'api-key' },
                            { value: 'bearer', label: 'Authorization: Bearer' },
                          ]
                        : [
                            { value: 'bearer', label: 'Authorization: Bearer' },
                            { value: 'api-key', label: 'api-key (Azure)' },
                          ]
                    }
                  />
                </div>
              )}
            </Field>
          )}

          {meta.fields?.map((f) => (
            <Field key={f.id} label={t(FIELD_LABEL[f.id])}>
              {f.options ? (
                <select value={paramFor(settings, provider, f.id)} onChange={(e) => setParam(f.id, e.target.value)} className={cn(inputClass, 'font-mono text-[12px]')}>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  defaultValue={paramFor(settings, provider, f.id)}
                  onBlur={(e) => e.target.value.trim() !== paramFor(settings, provider, f.id) && setParam(f.id, e.target.value.trim())}
                  onKeyDown={(e) => {
                    stopKeys(e);
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  placeholder={f.placeholder}
                  spellCheck={false}
                  className={cn(inputClass, 'font-mono text-[12px]')}
                />
              )}
            </Field>
          ))}

          {CLOUD_HELP[provider] && <p className="-mt-1 text-[11.5px] leading-relaxed text-subtle">{t(CLOUD_HELP[provider]!)}</p>}

          <Field
            label={meta.needsKey ? t('ai.settings.apiKey') : t('ai.settings.apiKeyOptional')}
            aside={
              meta.keyHelpUrl && (
                <button
                  type="button"
                  onClick={() => void openLink(meta.keyHelpUrl!)}
                  title={meta.keyHelpUrl}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline"
                >
                  {t('ai.settings.getKey')} <ExternalLink className="size-3" />
                </button>
              )
            }
          >
            {has === null ? (
              <div className="flex h-8 items-center gap-2 text-[12px] text-muted">
                <LoaderCircle className="size-3.5 animate-spin" /> {t('ai.settings.checking')}
              </div>
            ) : showKeyInput ? (
              <div className="space-y-1.5">
                {endpointChanged && !replacing && (
                  <p className="flex items-center gap-1.5 text-[12px] text-[#d48806]">
                    <TriangleAlert className="size-3.5" /> {t('ai.settings.endpointChanged')}
                  </p>
                )}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={keyInput}
                      autoFocus={replacing}
                      type={showKey ? 'text' : 'password'}
                      value={keyDraft}
                      onChange={(e) => {
                        setKeyDraft(e.target.value);
                        setKeyError(null);
                      }}
                      onBlur={() => void saveDraft()}
                      onKeyDown={(e) => {
                        stopKeys(e);
                        if (e.key === 'Enter') void onSaveKey();
                      }}
                      placeholder={providerKeyPlaceholder(provider) ?? t('ai.settings.apiKeyPlaceholder')}
                      spellCheck={false}
                      autoComplete="off"
                      className={cn(inputClass, 'pr-8 font-mono text-[12px]')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-1 top-1 rounded-md p-1 text-subtle hover:bg-hover hover:text-fg"
                      aria-label={showKey ? t('ai.settings.hideKey') : t('ai.settings.showKey')}
                      title={showKey ? t('ai.settings.hideKey') : t('ai.settings.showKey')}
                    >
                      {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <Btn variant="primary" onClick={onSaveKey} disabled={!keyDraft.trim()} loading={busy}>
                    {t('ai.settings.saveKey')}
                  </Btn>
                  {replacing && (
                    <Btn variant="ghost" onClick={() => setReplacing(false)}>
                      {t('common.cancel')}
                    </Btn>
                  )}
                </div>
                <KeyHint provider={provider} draft={keyDraft} />
                {prefilled && !keyDraft && <p className="text-[11.5px] leading-snug text-muted">{t('ai.settings.azureKeyNeeded')}</p>}
              </div>
            ) : (
              <div className="flex h-9 items-center gap-2.5 rounded-lg bg-panel-2 px-3 ring-1 ring-line">
                <Lock className="size-3.5 text-success" />
                <span className="font-mono text-[12px] tracking-widest text-muted">••••••••••••</span>
                <span className="flex-1 truncate text-[12px] text-muted">{isTauri() ? t('ai.settings.storedKeychain') : settings.rememberKeys ? t('ai.settings.storedBrowser') : t('ai.settings.keptInMemory')}</span>
                <Btn size="sm" variant="ghost" onClick={() => setReplacing(true)}>
                  {t('ai.settings.replace')}
                </Btn>
                <IconBtn label={t('ai.settings.deleteKey')} size="sm" onClick={onDeleteKey} disabled={busy} className="hover:text-danger">
                  <Trash />
                </IconBtn>
              </div>
            )}
            {keyError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-danger">
                <CircleAlert className="size-3.5" /> {keyError}
              </p>
            )}
            {!isTauri() && (
              <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12px] leading-snug text-muted" title={t('ai.settings.rememberKeyHint')}>
                <input
                  type="checkbox"
                  className="mt-px size-3.5 shrink-0 accent-[var(--accent)]"
                  checked={settings.rememberKeys}
                  onChange={(e) => {
                    updateAiSettings({ rememberKeys: e.target.checked });
                    void setRememberKeys(e.target.checked);
                  }}
                />
                <span>{t('ai.settings.rememberKey')}</span>
              </label>
            )}
          </Field>

          <Field
            label={t('ai.settings.model')}
            hint={provider === 'azure' ? t('ai.settings.modelHintAzure') : provider === 'bedrock' ? t('ai.settings.modelHintBedrock') : t('ai.settings.modelHint')}
          >
            <ModelPicker value={modelFor(settings)} options={models} onChange={(m) => updateAiSettings({ models: { ...settings.models, [provider]: m } })} placeholder={provider === 'custom' ? t('ai.settings.customModelPlaceholder', { model: 'anthropic/claude-opus-5-5' }) : t('ai.settings.modelPlaceholder')} />
          </Field>

          <div className="flex items-center gap-3">
            <Btn onClick={runTest} disabled={!canTest} loading={test.kind === 'testing'} icon={<Zap />}>
              {t('ai.settings.testConnection')}
            </Btn>
            <TestStatus state={test} />
          </div>
        </div>

        <div className="mt-6 flex gap-2.5 rounded-lg bg-panel-2 px-3 py-2.5 text-[12px] leading-relaxed text-muted ring-1 ring-line">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <p>
            {isTauri() ? `${t('ai.settings.privacyKeychain')} ` : ''}
            {t('ai.settings.privacy')}{' '}
            {provider === 'ollama' ? t('ai.settings.privacyOllama') : t('ai.settings.privacyChooseOllama')}
          </p>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-line bg-panel-2/60 px-5 py-3">
        <Btn variant="primary" onClick={onClose}>
          {t('common.done')}
        </Btn>
      </footer>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-subtle">{children}</div>;
}

function Field({ label, hint, aside, children }: { label: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px] font-medium text-fg">
        <span>{label}</span>
        {aside}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] text-subtle">{hint}</p>}
    </div>
  );
}

function ProviderCard({ id, active, onSelect }: { id: ProviderId; active: boolean; onSelect: () => void }) {
  const t = useT();
  const meta = PROVIDER_META[id];
  const [has] = useHasKey(id);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left ring-1 transition-[box-shadow,background,transform] duration-150 active:scale-[0.98]',
        active ? 'bg-accent-soft ring-2 ring-accent' : 'bg-panel ring-line hover:bg-hover hover:ring-line-strong',
      )}
    >
      <ProviderMark provider={id} size={28} />
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium text-fg" title={providerName(id)}>{providerName(id)}</span>
        <span className="block truncate text-[11px] text-muted" title={providerTagline(id)}>{providerTagline(id)}</span>
      </span>
      {(has || (meta.local && !meta.needsKey)) && (
        <span className="absolute right-2 top-2 size-1.5 rounded-full bg-success" title={has ? t('ai.settings.keySaved') : t('ai.settings.noKeyNeeded')} />
      )}
    </button>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="inline-flex rounded-lg bg-panel-2 p-0.5 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('h-6 rounded-md px-2 text-[11.5px] transition-colors', value === o.value ? 'bg-panel text-fg shadow-[0_0_0_1px_var(--line),0_1px_2px_rgb(0_0_0/0.06)]' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ModelPicker({
  value, options, onChange, placeholder,
}: { value: string; options: Array<{ id: string; label: string; hint?: string }>; onChange: (v: string) => void; placeholder: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [open]);
  const q = draft.trim().toLowerCase();
  const shown = q && draft !== value ? options.filter((o) => o.id.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)) : options;
  const commit = (v: string) => {
    const t = v.trim();
    if (t && t !== value) onChange(t);
    else setDraft(value);
  };
  return (
    <div ref={root} className="relative">
      <div className="relative">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (options.length) setOpen(true);
          }}
          onFocus={() => options.length && setOpen(true)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            stopKeys(e);
            if (e.key === 'Enter') {
              commit(draft);
              setOpen(false);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          spellCheck={false}
          className={cn(inputClass, 'pr-8 font-mono text-[12px]')}
        />
        {options.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((o) => !o)}
            className="absolute right-1 top-1 rounded-md p-1 text-subtle hover:bg-hover hover:text-fg"
            aria-label={tr('ai.settings.showModels')}
          >
            <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && shown.length > 0 && (
        <div className="animate-pop scroll-thin absolute inset-x-0 top-[calc(100%+4px)] z-10 max-h-60 overflow-y-auto rounded-lg bg-panel p-1 shadow-pop">
          {shown.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o.id);
                setDraft(o.id);
                setOpen(false);
              }}
              className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-hover', o.id === value && 'bg-accent-soft')}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-fg">{o.label}</span>
                <span className="block truncate font-mono text-[11px] text-subtle">
                  {o.id}
                  {o.hint ? <span className="font-sans"> · {o.hint}</span> : null}
                </span>
              </span>
              {o.id === value && <Check className="size-3.5 text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Requests go to …" when a pasted URL is cleaned up (".../v1/responses" → ".../v1"). */
function ResolvedEndpoint({ provider, url }: { provider: ProviderId; url: string }) {
  const t = useT();
  const raw = url.trim();
  if (!raw || (provider !== 'azure' && provider !== 'custom')) return null;
  let resolved: string;
  try {
    resolved = provider === 'azure' ? azureBase(raw) : normalizeBaseUrl(raw);
  } catch {
    return null;
  }
  if (resolved === raw.replace(/\/+$/, '')) return null;
  return (
    <p className="mt-1.5 truncate text-[11.5px] text-subtle" title={resolved}>
      {t('ai.settings.usingEndpoint', { url: resolved })}
    </p>
  );
}

/** Gentle warning when the typed key doesn't look like this provider's (saving still works). */
function KeyHint({ provider, draft }: { provider: ProviderId; draft: string }) {
  const t = useT();
  const check = checkKeyPrefix(provider, draft);
  if (!check) return null;
  const meta = PROVIDER_META[provider];
  const url = meta.keyHelpUrl?.replace(/^https:\/\//, '') ?? '';
  const text =
    check.kind === 'grokApp'
      ? t('ai.settings.keyGrokApp', { url })
      : check.kind === 'otherProvider'
        ? t('ai.settings.keyOtherProvider', { other: providerName(check.other), provider: providerName(provider), url })
        : t('ai.settings.keyUnexpected', { provider: providerName(provider), prefix: check.prefix, url });
  return (
    <p role="status" className="animate-fade flex items-start gap-1.5 text-[11.5px] leading-snug text-[#d48806]">
      <TriangleAlert className="mt-px size-3.5 shrink-0" /> <span>{text}</span>
    </p>
  );
}

function TestStatus({ state }: { state: TestState }) {
  const t = useT();
  if (state.kind === 'idle') return null;
  if (state.kind === 'testing') return <span className="text-[12px] text-muted">{t('ai.settings.connecting')}</span>;
  if (state.kind === 'ok')
    return (
      <span className="animate-fade flex items-center gap-1.5 text-[12px] text-success">
        <CircleCheck className="size-3.5" /> {state.models ? t('ai.settings.connectedModels', { count: state.models }) : t('ai.settings.connected')}
      </span>
    );
  return (
    <span className="animate-fade flex min-w-0 items-start gap-1.5 text-[12px] text-danger">
      <CircleAlert className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">
        <span className="line-clamp-3 break-words">{state.message}</span>
        {state.detail && (
          <span className="mt-0.5 block truncate text-[11px] text-subtle" title={state.detail}>
            {t('ai.settings.errorDetails')}: {state.detail}
          </span>
        )}
      </span>
    </span>
  );
}
