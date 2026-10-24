import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
import { t } from '@/i18n';
import { hasAnimation, startClock, stopClock } from '@/animation/timeline';

/** Toggles the canvas animation preview (docs/specs/animation.md §4). */
export function togglePlayback() {
  const s = useEditor.getState();
  if (s.playing) {
    stopClock();
    s.setPlaying(false);
    return;
  }
  if (!hasAnimation(s.doc)) {
    useUi.getState().toast(t('app.playback.nothing'));
    return;
  }
  stopClock(true);
  startClock();
  s.setPlaying(true);
}

/** Plays the animation preview from the beginning, if the document has anything to play. */
export function startPlayback(): boolean {
  const s = useEditor.getState();
  if (!hasAnimation(s.doc)) return false;
  stopClock(true);
  startClock();
  if (!s.playing) s.setPlaying(true);
  return true;
}

export function stopPlayback() {
  const s = useEditor.getState();
  if (!s.playing) return;
  stopClock();
  s.setPlaying(false);
}
