import { useCallback, useEffect, useState } from 'react';
import { PROVIDER_META, type ProviderId } from '../providers';
import { baseUrlFor, modelFor, useAiSettings } from '../settings';
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

/** Whether the active provider is configured well enough to send a request. */
export function useAiReady(): { ready: boolean | null; reason?: string } {
  const s = useAiSettings();
  const meta = PROVIDER_META[s.provider];
  const [has] = useHasKey(s.provider);
  if (!modelFor(s)) return { ready: false, reason: 'Choose a model' };
  if (meta.needsBaseUrl && !baseUrlFor(s)) return { ready: false, reason: 'Set the endpoint URL' };
  if (meta.needsKey) {
    if (has === null) return { ready: null };
    if (!has) return { ready: false, reason: `Add your ${meta.name} API key` };
  }
  return { ready: true };
}
