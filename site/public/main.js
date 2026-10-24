// Demo videos play only while on screen (and not at all with reduced motion);
// the ones further down load when they are about to scroll into view.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const videos = [...document.querySelectorAll('video.demo')];

if (reduce) {
  for (const v of videos) {
    v.removeAttribute('autoplay');
    v.pause();
    v.controls = true;
  }
} else if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const { target: v, isIntersecting } of entries) {
        if (isIntersecting) {
          if (v.dataset.src && !v.src) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      }
    },
    { rootMargin: '200px 0px' },
  );
  videos.forEach((v) => io.observe(v));
} else {
  for (const v of videos) if (v.dataset.src) v.src = v.dataset.src;
}
