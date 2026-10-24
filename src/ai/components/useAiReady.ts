import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { PROVIDER_META, type ProviderId } from '../providers';
import { baseUrlFor, modelFor, paramFor, useAiSettings } from '../settings';
import { hasKey } from '../transport';

const listeners = new Set<() => void>();
/** Tell every key-status hook to re-check (after saving/deleting a key). */
export function notifyKeysChanged() {
  listeners.forEach((l) => l());
}

/** Whether a key is stored for `provider` (null while checking). */
export function useHasKey(provider: ProviderId): [boolean | null, () => void] {
  const [state, setState] = useState<boolean | null>(null);
  const refresh = useCallback(() => {
    let alive = true;
    hasKey(provider)
      .then((v) => alive && setState(v))
      .catch(() => alive && setState(false));
    return () => {
      alive = false;
    };
  }, [provider]);
  useEffect(() => {
    setState(null);
    const cancel = refresh();
    const l = () => void refresh();
    listeners.add(l);
    return () => {
      cancel();
      listeners.delete(l);
    };
  }, [refresh]);
  return [state, refresh];
}

export type AiSetupNeed = 'model' | 'endpoint' | 'settings' | 'key';

/**
 * Whether the active provider is configured well enough to send a request
 * (`reason`: a whole, translated sentence; `need`: what is missing).
 */
export function useAiReady(): { ready: boolean | null; reason?: string; need?: AiSetupNeed } {
  const t = useT();
  const s = useAiSettings();
  const meta = PROVIDER_META[s.provider];
  const [has] = useHasKey(s.provider);
  if (!modelFor(s)) return { ready: false, reason: t('ai.ready.chooseModel'), need: 'model' };
  if (meta.needsBaseUrl && !baseUrlFor(s)) return { ready: false, reason: t('ai.ready.setEndpoint'), need: 'endpoint' };
  if (meta.fields?.some((f) => !paramFor(s, s.provider, f.id))) return { ready: false, reason: t('ai.ready.completeSettings', { provider: meta.name }), need: 'settings' };
  if (meta.needsKey) {
    if (has === null) return { ready: null };
    if (!has) return { ready: false, reason: t('ai.ready.addKey', { provider: meta.name }), need: 'key' };
  }
  return { ready: true };
}
