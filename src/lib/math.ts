/**
 * LaTeX → SVG via MathJax (mxGraph's "Mathematical Typesetting").
 *
 * MathJax is large, so it's loaded on first use. Rendering is synchronous
 * from the caller's point of view: `mathSvg()` returns a cached result or
 * null (and starts rendering); components re-render when `useMathVersion`
 * bumps. Output is pure SVG with paths (fontCache: none), so it embeds in
 * every export format without fonts.
 */
import { create } from 'zustand';

export interface MathResult {
  /** Standalone SVG markup. */
  svg: string;
  /** Size in px at the requested font size. */
  w: number;
  h: number;
  /** Distance from the box bottom to the text baseline (px). */
  descent: number;
}

export const useMathVersion = create<{ v: number }>(() => ({ v: 0 }));

type Converter = (tex: string, display: boolean) => string;
let converter: Converter | null = null;
let loading: Promise<void> | null = null;
const cache = new Map<string, MathResult | 'error'>();
const pending = new Set<string>();

async function load() {
  loading ??= (async () => {
    const [{ mathjax }, { TeX }, { SVG }, { liteAdaptor }, { RegisterHTMLHandler }, { AllPackages }] = await Promise.all([
      import('mathjax-full/js/mathjax.js'),
      import('mathjax-full/js/input/tex.js'),
      import('mathjax-full/js/output/svg.js'),
      import('mathjax-full/js/adaptors/liteAdaptor.js'),
      import('mathjax-full/js/handlers/html.js'),
      import('mathjax-full/js/input/tex/AllPackages.js'),
    ]);
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const doc = mathjax.document('', {
      InputJax: new TeX({ packages: AllPackages.filter((p: string) => p !== 'bussproofs') }),
      OutputJax: new SVG({ fontCache: 'none' }),
    });
    converter = (tex, display) => adaptor.innerHTML(doc.convert(tex, { display, em: 16, ex: 8, containerWidth: 1200 }));
  })();
  return loading;
}

const EX_PX = 8; // at em = 16px

export function mathSvg(tex: string, display: boolean, fontSize: number, color: string): MathResult | null {
  const key = `${display ? 'D' : 'I'}|${fontSize}|${color}|${tex}`;
  const hit = cache.get(key);
  if (hit === 'error') return null;
  if (hit) return hit;
  if (converter) {
    try {
      const raw = converter(tex, display);
      const scale = fontSize / 16;
      const ex = (attr: string) => Number(raw.match(new RegExp(`${attr}="(-?[\\d.]+)ex"`))?.[1] ?? 0) * EX_PX * scale;
      const valign = Number(raw.match(/vertical-align:\s*(-?[\d.]+)ex/)?.[1] ?? 0) * EX_PX * scale;
      const w = ex('width');
      const h = ex('height');
      const svg = raw
        .replace(/currentColor/g, color)
        .replace(/width="[^"]+"/, `width="${w}"`)
        .replace(/height="[^"]+"/, `height="${h}"`)
        .replace(/style="[^"]*"/, '')
        .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      const res = { svg, w, h, descent: -valign };
      cache.set(key, res);
      return res;
    } catch {
      cache.set(key, 'error');
      return null;
    }
  }
  if (!pending.has(key)) {
    pending.add(key);
    load()
      .then(() => {
        pending.delete(key);
        useMathVersion.setState((s) => ({ v: s.v + 1 }));
      })
      .catch(() => cache.set(key, 'error'));
  }
  return null;
}

/** Preloads MathJax for a set of elements (exports call this before rendering). */
export async function ensureMathLoaded() {
  await load();
}

/** Splits text into plain and math segments: `$$…$$` (display) and `\(…\)` (inline). */
export function splitMath(text: string): Array<{ math: boolean; display: boolean; text: string }> {
  const out: Array<{ math: boolean; display: boolean; text: string }> = [];
  const re = /\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ math: false, display: false, text: text.slice(last, m.index) });
    out.push({ math: true, display: m[1] !== undefined, text: m[1] ?? m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ math: false, display: false, text: text.slice(last) });
  return out;
}
