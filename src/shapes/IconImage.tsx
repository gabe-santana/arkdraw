import { createContext, useContext } from 'react';

/**
 * Vendor icons (AWS, Azure, GCP, ...) render through <image> rather than being
 * inlined: their SVGs reuse gradient/clip ids like "a" and "b", which would
 * collide when many icons share one document. An <image> isolates each one.
 *
 * On canvas the href is the bundled asset URL; exporters provide data URIs
 * through this context so exported files are fully self-contained.
 */
export type IconHrefResolver = (path: string) => string;

export const iconUrl: IconHrefResolver = (path) =>
  /^(data:|https?:|blob:)/.test(path) ? path : `${import.meta.env.BASE_URL}icons/${path}`;

export const IconHrefContext = createContext<IconHrefResolver>(iconUrl);

export function IconImage({ path, w, h, stretch }: { path: string; w: number; h: number; stretch?: boolean }) {
  const resolve = useContext(IconHrefContext);
  return (
    <image
      className="od-keep-color"
      href={resolve(path)}
      width={w}
      height={h}
      preserveAspectRatio={stretch ? 'none' : 'xMidYMid meet'}
    />
  );
}
