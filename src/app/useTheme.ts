import { useEffect, useState } from 'react';
import { useUi } from '@/store/ui';

/** Resolves the theme (system/light/dark), applies the `.dark` class, and returns whether dark is active. */
export function useTheme(): boolean {
  const mode = useUi((s) => s.theme);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dark = mode === 'dark' || (mode === 'system' && systemDark);
  useEffect(() => {
    const root = document.documentElement;
    // Suppress transitions during the switch so everything flips in one frame.
    root.classList.add('theme-switching');
    root.classList.toggle('dark', dark);
    const t = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
    return () => cancelAnimationFrame(t);
  }, [dark]);
  return dark;
}
