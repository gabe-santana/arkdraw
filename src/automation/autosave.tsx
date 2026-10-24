/**
 * Autosave to the open file (Preferences → Autosave): a debounced write after
 * changes, to the desktop path, the web File System Access handle, or the
 * browser library entry the document came from. Untitled documents and
 * imports are never autosaved (they have nowhere to go yet). Desktop writes
 * go through `writeTextFile`, which keeps a `.bkp` of the previous version
 * when backups are enabled.
 */
import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { usePreferences } from '@/app/preferences';
import { isDirty } from '@/app/fileCommands';
import { serializePages } from '@/io/fileFormat';
import { writeTextFile } from '@/io/native';
import { isTauri } from '@/lib/platform';
import { Switch } from '@/ui/controls';
import { docOrigin, writeHandle } from '@/storage/origin';
import { commitSavedMeta, metaForSave } from './fileProperties';
import { t } from '@/i18n';

const DELAY = 1500;

/** Where an autosave would write, if anywhere. */
export function autosaveTarget(): 'path' | 'handle' | 'library' | null {
  const s = useEditor.getState();
  if (s.file.path && isTauri()) return 'path';
  const o = docOrigin();
  return o ? (o.kind === 'handle' ? 'handle' : 'library') : null;
}

let failedOnce = false;

/** Writes the document to its current target without dialogs. Returns true on success. */
export async function autosaveNow(): Promise<boolean> {
  const target = autosaveTarget();
  if (!target || !isDirty()) return false;
  const s = useEditor.getState();
  const docAtStart = s.doc;
  const pagesAtStart = s.pages;
  try {
    if (target === 'library') {
      const { saveCurrentToLibrary } = await import('@/storage/library');
      return !!(await saveCurrentToLibrary());
    }
    const meta = metaForSave();
    const data = serializePages(s.allPages(), meta, s.aiHistory);
    if (target === 'path') {
      const { backupsEnabled } = await import('@/desktop/config');
      await writeTextFile(s.file.path!, data, { backup: backupsEnabled() });
    } else {
      const o = docOrigin();
      // No permission prompt here: autosave has no user gesture. Save (Mod+S) asks.
      if (o?.kind !== 'handle' || !(await writeHandle(o.handle, data, false))) return false;
    }
    commitSavedMeta(meta);
    // Only mark saved if nothing changed while writing.
    const now = useEditor.getState();
    if (now.doc === docAtStart && now.pages === pagesAtStart) now.markSaved(now.file.path, now.file.name);
    failedOnce = false;
    return true;
  } catch (e) {
    if (!failedOnce) useUi.getState().toast(t('prefs.autosaveFailed', { error: (e as Error)?.message ?? String(e) }), 'error');
    failedOnce = true;
    return false;
  }
}

/** Starts watching for changes; returns the unsubscribe function. */
export function startAutosave(): () => void {
  let timer = 0;
  const off = useEditor.subscribe((s, prev) => {
    if (s.doc === prev.doc && s.pages === prev.pages && s.docMeta === prev.docMeta && s.aiHistory === prev.aiHistory) return;
    if (!usePreferences.getState().autosave || s.interactionBase) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void autosaveNow(), DELAY);
  });
  return () => {
    window.clearTimeout(timer);
    off();
  };
}

/** Preferences rows for autosave and the start screen. */
export function PrefsAutomationSection() {
  const autosave = usePreferences((p) => !!p.autosave);
  const startScreen = usePreferences((p) => p.startScreen !== false);
  const update = usePreferences((p) => p.update);
  return (
    <div className="space-y-0.5">
      <Switch label={t('prefs.autosave')} checked={autosave} onChange={(v) => update({ autosave: v })} />
      <Switch label={t('prefs.startScreen')} checked={startScreen} onChange={(v) => update({ startScreen: v })} />
      {autosave && (
        <p className="text-[11.5px] text-subtle">
          {isTauri()
            ? t('prefs.autosaveDesktop')
            : t('prefs.autosaveWeb')}
        </p>
      )}
    </div>
  );
}
