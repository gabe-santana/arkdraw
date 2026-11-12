/**
 * `--fg-subtle` is the colour behind `text-subtle`, which is used for small
 * hints and section headers. It must reach WCAG AA (4.5:1) on every panel
 * surface it sits on, in both light and dark themes.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `block ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
}

function token(scope: string, name: string): string {
  const match = block(scope).match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
  expect(match, `--${name} in ${scope}`).not.toBeNull();
  return match![1];
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('subtle text token contrast (WCAG AA)', () => {
  for (const scope of [':root', '.dark']) {
    it(`--fg-subtle meets 4.5:1 on panel and panel-2 in ${scope}`, () => {
      const fg = token(scope, 'fg-subtle');
      for (const surface of ['panel', 'panel-2']) {
        const bg = token(scope, surface);
        const ratio = contrast(fg, bg);
        expect(ratio, `${scope} --fg-subtle ${fg} on --${surface} ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
