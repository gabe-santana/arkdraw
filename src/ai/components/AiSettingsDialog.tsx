/**
 * BYOK settings: pick a provider, store its key in the OS keychain, choose a
 * model, configure the endpoint (Ollama / OpenAI-compatible), test it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, ChevronDown, CircleAlert, CircleCheck, Eye, EyeOff, KeyRound, LoaderCircle, Lock, ShieldCheck, Trash,
  TriangleAlert, X, Zap,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t as tNow, useT } from '@/i18n';
import { PROVIDERS, PROVIDER_META, type ModelInfo, type ProviderId } from '../providers';
import { baseUrlFor, modelFor, providerConfig, updateAiSettings, useAiSettings, type CustomAuthStyle } from '../settings';
import { deleteKey, isTauri, saveKey, testConnection } from '../transport';
import { Btn, IconBtn, inputClass, modelHint, ProviderMark, providerKeyPlaceholder, providerName, providerTagline, stopKeys } from './ui';
import { notifyKeysChanged, useHasKey } from './useAiReady';

export interface AiSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type TestState = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok'; models: number } | { kind: 'error'; message: string };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : tNow('ai.settings.somethingWrong'));

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
  const [fetched, setFetched] = useState<Partial<Record<ProviderId, ModelInfo[]>>>({});
  const [urlDraft, setUrlDraft] = useState(baseUrlFor(settings) ?? '');
  const keyInput = useRef<HTMLInputElement>(null);

  // Reset per-provider UI state when switching providers.
  useEffect(() => {
    setKeyDraft('');
    setShowKey(false);
    setReplacing(false);
    setKeyError(null);
    setTest({ kind: 'idle' });
    setUrlDraft(baseUrlFor(settings, provider) ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const baseUrl = baseUrlFor(settings);
  const endpointChanged = meta.needsBaseUrl && !!has && !!baseUrl && settings.authorizedBaseUrls[provider] !== undefined && settings.authorizedBaseUrls[provider] !== baseUrl;
  const showKeyInput = has === false || replacing || endpointChanged;

  const authorize = async (key: string) => {
    await saveKey(provider, key, { baseUrl: meta.needsBaseUrl ? baseUrl : undefined, auth: provider === 'custom' ? settings.customAuth : undefined });
    if (meta.needsBaseUrl && baseUrl) updateAiSettings({ authorizedBaseUrls: { ...settings.authorizedBaseUrls, [provider]: baseUrl } });
    notifyKeysChanged();
    refreshHas();
  };

  const runTest = async () => {
    setTest({ kind: 'testing' });
    try {
      // Ollama / custom without a key: make sure the endpoint is authorized first.
      if (meta.needsBaseUrl && !has && baseUrl && settings.authorizedBaseUrls[provider] !== baseUrl) await authorize('');
      const models = await testConnection(providerConfig(settings));
      setFetched((f) => ({ ...f, [provider]: models }));
      setTest({ kind: 'ok', models: models.length });
    } catch (e) {
      setTest({ kind: 'error', message: errMsg(e) });
    }
  };

  const onSaveKey = async () => {
    const k = keyDraft.trim();
    if (!k) return;
    if (meta.needsBaseUrl && !baseUrl) {
      setKeyError(t('ai.settings.setEndpointFirst'));
      return;
    }
    setBusy(true);
    setKeyError(null);
    try {
      await authorize(k);
      setKeyDraft('');
      setReplacing(false);
      setShowKey(false);
      void runTest();
    } catch (e) {
      setKeyError(errMsg(e));
    } finally {
      setBusy(false);
    }
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
      setKeyError(t('ai.settings.enterFullUrl', { example: 'https://openrouter.ai/api/v1' }));
      return;
    }
    setKeyError(null);
    setTest({ kind: 'idle' });
    updateAiSettings({ baseUrls: { ...settings.baseUrls, [provider]: v || undefined } });
  };

  const setAuthStyle = (auth: CustomAuthStyle) => {
    if (auth === settings.customAuth) return;
    updateAiSettings({ customAuth: auth });
    if (has) setReplacing(true); // the auth style is stored with the key
  };

  const models = useMemo(() => {
    const suggested = meta.models.map((m) => ({ id: m.id, label: m.label, hint: modelHint(m.id, m.hint) }));
    const seen = new Set(suggested.map((m) => m.id));
    const extra = (fetched[provider] ?? []).filter((m) => !seen.has(m.id)).map((m) => ({ id: m.id, label: m.label ?? m.id, hint: undefined }));
    return [...suggested, ...extra];
  }, [meta, fetched, provider, t]);

  const canTest = (!meta.needsKey || !!has) && (!meta.needsBaseUrl || !!baseUrl) && !endpointChanged;

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
        {!isTauri() && (
          <div className="mb-4 flex gap-2 rounded-lg bg-[#f5a524]/12 px-3 py-2 text-[12px] text-fg ring-1 ring-[#f5a524]/30">
            <TriangleAlert className="mt-px size-3.5 shrink-0 text-[#d48806]" />
            <span>{t('ai.settings.browserWarning')}</span>
          </div>
        )}

        <SectionLabel>{t('ai.settings.provider')}</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <ProviderCard key={p.id} id={p.id} active={p.id === provider} onSelect={() => updateAiSettings({ provider: p.id })} />
          ))}
        </div>

        <div key={provider} className="animate-slide-up mt-5 space-y-4">
          {meta.needsBaseUrl && (
            <Field label={provider === 'ollama' ? t('ai.settings.ollamaUrl') : t('ai.settings.baseUrl')} hint={provider === 'custom' ? t('ai.settings.customHint') : undefined}>
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
              {provider === 'custom' && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                  <span>{t('ai.settings.authHeader')}</span>
                  <Segmented
                    value={settings.customAuth}
                    onChange={setAuthStyle}
                    options={[
                      { value: 'bearer', label: 'Authorization: Bearer' },
                      { value: 'api-key', label: 'api-key (Azure)' },
                    ]}
                  />
                </div>
              )}
            </Field>
          )}

          <Field label={meta.needsKey ? t('ai.settings.apiKey') : t('ai.settings.apiKeyOptional')}>
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
                      onChange={(e) => setKeyDraft(e.target.value)}
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
                {meta.keyHelpUrl && <p className="text-[11.5px] text-subtle">{t('ai.settings.createKeyAt', { url: meta.keyHelpUrl.replace(/^https:\/\//, '') })}</p>}
              </div>
            ) : (
              <div className="flex h-9 items-center gap-2.5 rounded-lg bg-panel-2 px-3 ring-1 ring-line">
                <Lock className="size-3.5 text-success" />
                <span className="font-mono text-[12px] tracking-widest text-muted">••••••••••••</span>
                <span className="flex-1 truncate text-[12px] text-muted">{isTauri() ? t('ai.settings.storedKeychain') : t('ai.settings.keptInMemory')}</span>
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
          </Field>

          <Field label={t('ai.settings.model')}>
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-medium text-fg">{label}</div>
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
          onChange={(e) => setDraft(e.target.value)}
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
      {open && options.length > 0 && (
        <div className="animate-pop scroll-thin absolute inset-x-0 top-[calc(100%+4px)] z-10 max-h-60 overflow-y-auto rounded-lg bg-panel p-1 shadow-pop">
          {options.map((o) => (
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
      <CircleAlert className="mt-px size-3.5 shrink-0" /> <span className="line-clamp-3 break-words">{state.message}</span>
    </span>
  );
}
