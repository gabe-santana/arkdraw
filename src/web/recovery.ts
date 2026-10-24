/**
 * Guards the editor's crash-recovery draft (see app/fileCommands.ts) from
 * documents that arrive via the URL or an embedding page, so opening a share
 * link or an embedded editor never silently clobbers the user's own work.
 */

/** Must match RECOVERY_KEY in src/app/fileCommands.ts. */
export const RECOVERY_KEY = 'arkdraw:recovery';

/** Removes the draft from storage (so the editor won't auto-restore it) and returns it. */
export function takeRecoveryDraft(): string | null {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (raw !== null) localStorage.removeItem(RECOVERY_KEY);
    return raw;
  } catch {
    return null;
  }
}

export function putBackRecoveryDraft(raw: string | null) {
  try {
    if (raw === null) localStorage.removeItem(RECOVERY_KEY);
    else localStorage.setItem(RECOVERY_KEY, raw);
  } catch {
    /* storage unavailable */
  }
}

/** True if a draft holds at least one element worth asking about. */
export function draftHasContent(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const { data } = JSON.parse(raw) as { data?: string };
    const file = JSON.parse(data ?? '{}') as { pages?: Array<{ elements?: unknown[] }>; elements?: unknown[] };
    return !!file.elements?.length || !!file.pages?.some((p) => p.elements?.length);
  } catch {
    return false;
  }
}

/**
 * Embed mode: the editor must neither restore the user's own draft into a
 * host-controlled document (the host could export it) nor mirror the host's
 * document into the user's draft slot. The draft is taken out, writes to the
 * key are dropped for this page, and the original is put back on pagehide.
 */
export function shieldRecoveryDraft(): () => void {
  let draft = takeRecoveryDraft();
  // (Storage.prototype in browsers; resolved from the instance so test DOMs work too.)
  const proto = Object.getPrototypeOf(localStorage) as Storage;
  const { setItem, removeItem } = proto;
  // Only the recovery key is affected (nothing else uses it, in either storage).
  proto.setItem = function (this: Storage, key: string, value: string) {
    if (String(key) !== RECOVERY_KEY) setItem.call(this, key, value);
  };
  proto.removeItem = function (this: Storage, key: string) {
    if (String(key) !== RECOVERY_KEY) removeItem.call(this, key);
  };
  const restore = () => {
    try {
      if (draft === null) removeItem.call(localStorage, RECOVERY_KEY);
      else setItem.call(localStorage, RECOVERY_KEY, draft);
    } catch {
      /* storage unavailable */
    }
  };
  // Back from the bfcache: hide it again.
  const retake = (e: PageTransitionEvent) => {
    if (!e.persisted) return;
    try {
      draft = localStorage.getItem(RECOVERY_KEY);
      if (draft !== null) removeItem.call(localStorage, RECOVERY_KEY);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('pagehide', restore);
  window.addEventListener('pageshow', retake);
  return () => {
    window.removeEventListener('pagehide', restore);
    window.removeEventListener('pageshow', retake);
    proto.setItem = setItem;
    proto.removeItem = removeItem;
    restore();
  };
}
