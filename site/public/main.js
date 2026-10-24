// Demo videos: 4K only where it shows (large or high-density screens), 1080p
// elsewhere, phones included. Posters and videos below the fold load as they
// come near the screen, and videos play only while visible (never on their
// own with reduced motion).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const big = matchMedia('(min-width: 1100px) and (min-resolution: 1.5dppx), (min-width: 2200px)').matches;
const videos = [...document.querySelectorAll('video[data-video]')];
// /media is cached as immutable: bump this (and the posters' ?v= in index.html) after re-recording.
const MEDIA_VERSION = 2;

function load(v) {
  if (v.dataset.poster && !v.getAttribute('poster')) v.poster = v.dataset.poster;
  if (!v.getAttribute('src')) v.src = `/media/${v.dataset.video}-${big ? '4k' : '1080p'}.mp4?v=${MEDIA_VERSION}`;
}

if (reduce) {
  for (const v of videos) {
    v.removeAttribute('autoplay');
    v.controls = true;
    load(v);
  }
} else {
  for (const v of videos) if ('eager' in v.dataset) load(v);
  if ('IntersectionObserver' in window) {
    // Fetch a little ahead of scrolling, play only what's actually on screen.
    const near = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && load(e.target)), { rootMargin: '600px 0px' });
    const seen = new IntersectionObserver((entries) => {
      for (const { target: v, isIntersecting } of entries) {
        if (isIntersecting) v.play().catch(() => {});
        else v.pause();
      }
    });
    for (const v of videos) {
      near.observe(v);
      seen.observe(v);
    }
  } else {
    for (const v of videos) load(v);
  }
}
