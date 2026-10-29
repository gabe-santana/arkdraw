// Light by default; the toggle in the nav switches to dark and remembers it.
// Loaded without defer in <head>, so the theme applies before the first paint.
(() => {
  const KEY = 'arkdraw:theme';
  const root = document.documentElement;
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}').theme === 'dark';
    } catch {
      return false;
    }
  };
  const apply = (dark) => {
    if (dark) root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0b12' : '#f7f7fb');
    const button = document.querySelector('.theme-toggle');
    if (button) button.title = button.ariaLabel = dark ? 'Light theme' : 'Dark theme';
  };
  apply(read());
  document.addEventListener('DOMContentLoaded', () => {
    apply(read());
    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      apply(dark);
      try {
        localStorage.setItem(KEY, JSON.stringify({ theme: dark ? 'dark' : 'light' }));
      } catch {}
    });
  });
})();
