import { useEditor } from '@/store/editor';
import { useUi } from '@/store/ui';
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
    useUi.getState().toast('Nothing to animate yet. Select a connector and choose an animation in the properties panel.');
    return;
  }
  stopClock(true);
  startClock();
  s.setPlaying(true);
}
