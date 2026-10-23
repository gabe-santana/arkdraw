import { describe, expect, it } from 'vitest';
import { parseInline, parseTable, serializeRuns, stripFormatting, type InlineStyle } from '@/text/richFormat';
import { domToRich, htmlToRich, richToDrawioHtml, richToEditorHtml } from '@/text/richDom';

const base: InlineStyle = { bold: false, italic: false, underline: false, strike: false, code: false, size: 14 };
const B = { bold: false, italic: false, underline: false, strike: false, size: 14, color: '#0f172a' };

const runs = (t: string) => parseInline(t, base).map(({ text, bold, italic, underline, strike, code, href, size, color, highlight, script, font, img }) => ({
  text, ...(bold && { bold }), ...(italic && { italic }), ...(underline && { underline }), ...(strike && { strike }), ...(code && { code }),
  ...(href && { href }), ...(size !== 14 && { size }), ...(color && { color }), ...(highlight && { highlight }), ...(script && { script }), ...(font && { font }), ...(img && { img }),
}));

describe('formatted text parsing', () => {
  it('keeps the Markdown subset working', () => {
    expect(runs('a **b** *c* __d__ ~~e~~ `f` [g](https://x.y)')).toEqual([
      { text: 'a ' }, { text: 'b', bold: true }, { text: ' ' }, { text: 'c', italic: true }, { text: ' ' }, { text: 'd', underline: true }, { text: ' ' },
      { text: 'e', strike: true }, { text: ' ' }, { text: 'f', code: true }, { text: ' ' }, { text: 'g', underline: true, href: 'https://x.y' },
    ]);
  });

  it('parses the inline HTML subset (colour, size, highlight, sub/sup, font)', () => {
    expect(runs('H<sub>2</sub>O x<sup>2</sup> <span style="color:#dc2626;font-size:20px;background-color:#fef08a;font-family:Roboto">hot</span> <font color="red">r</font>')).toEqual([
      { text: 'H' }, { text: '2', script: 'sub' }, { text: 'O x' }, { text: '2', script: 'sup' }, { text: ' ' },
      { text: 'hot', color: '#dc2626', size: 20, highlight: '#fef08a', font: 'Roboto' }, { text: ' ' }, { text: 'r', color: 'red' },
    ]);
  });

  it('nests Markdown inside HTML and HTML inside Markdown', () => {
    expect(runs('**a <i>b</i>**')).toEqual([{ text: 'a ', bold: true }, { text: 'b', bold: true, italic: true }]);
    expect(runs('<span style="color:blue">**x**</span>')).toEqual([{ text: 'x', bold: true, color: 'blue' }]);
  });

  it('sanitizes links, colours, images and unknown tags', () => {
    expect(runs('<a href="javascript:alert(1)">x</a>')).toEqual([{ text: 'x' }]);
    expect(runs('[x](javascript:alert(1))')[0].href).toBeUndefined();
    expect(runs('<span style="color:url(evil)">x</span>')).toEqual([{ text: 'x' }]);
    expect(runs('<img src="javascript:x">')).toEqual([]);
    expect(runs('<img src="data:image/png;base64,AA" width="10" height="8">')[0].img).toEqual({ src: 'data:image/png;base64,AA', w: 10, h: 8 });
    // Unknown tags stay literal text (rendered as SVG text, never as markup).
    expect(runs('a <script>b</script>').map((r) => r.text).join('')).toBe('a <script>b</script>');
    expect(runs('1 < 2 && 3 > 2')).toEqual([{ text: '1 < 2 && 3 > 2' }]);
  });

  it('honours backslash escapes and entities', () => {
    expect(runs('\\*not italic\\* \\<b> &amp; &lt;')).toEqual([{ text: '*not italic* <b> & <' }]);
  });

  it('round-trips runs through serialization', () => {
    for (const t of ['plain', 'a **b** c', 'x <sub>2</sub>', '**<i>bi</i>**', '<span style="color:#dc2626">red</span> and *it*', '2\\*3\\*4', '[l](https://a.b)', '- item', '* item']) {
      const r = parseInline(t, base);
      const back = serializeRuns(r, B);
      expect(parseInline(back, base)).toEqual(r);
    }
  });

  it('serializes literal Markdown characters escaped', () => {
    expect(serializeRuns([{ ...base, text: 'a*b*c [x]' }], B)).toBe('a\\*b\\*c \\[x\\]');
    expect(serializeRuns([{ ...base, text: '* bullet' }], B)).toBe('* bullet');
  });

  it('strips formatting but keeps block prefixes', () => {
    expect(stripFormatting('# **Title**\n- <span style="color:red">x</span>')).toBe('# Title\n- x');
  });

  it('parses simple tables', () => {
    const t = parseTable('<table border="1"><tr><th>A</th><th>B</th></tr><tr><td>1</td><td><b>2</b></td></tr></table>');
    expect(t?.border).toBe(true);
    expect(t?.rows.map((r) => r.map((c) => c.text))).toEqual([['A', 'B'], ['1', '<b>2</b>']]);
    expect(t?.rows[0][0].header).toBe(true);
  });
});

describe('HTML ↔ formatted text', () => {
  it('reads the editor DOM (execCommand output) into formatted text', () => {
    const div = document.createElement('div');
    div.innerHTML = 'Hello <b>bold</b> <font color="#dc2626">red</font> <span data-size="20" style="font-size:40px">big</span><br>H<sub>2</sub>O <a href="https://x.y">link</a>';
    expect(domToRich(div, B)).toBe('Hello **bold** <span style="color:#dc2626">red</span> <span style="font-size:20px">big</span>\nH<sub>2</sub>O [link](https://x.y)');
  });

  it('builds editor HTML that reads back to the same text', () => {
    const text = 'a **b** <span style="color:#dc2626;font-size:20px">c</span>\n- x <sup>2</sup>';
    const div = document.createElement('div');
    div.innerHTML = richToEditorHtml(text, B, 2);
    expect(div.querySelector('[data-size]')?.getAttribute('style')).toContain('font-size:40px');
    expect(domToRich(div, B)).toBe(text);
  });

  it('never passes stored markup to the editor unescaped', () => {
    const html = richToEditorHtml('\\<img src=x onerror=alert(1)> <a href="javascript:x">y</a>', B, 1);
    expect(html).not.toMatch(/<img|javascript/);
  });

  it('imports draw.io html labels, dropping anything unsafe', () => {
    const rich = htmlToRich('<div><b>Title</b></div><div>H<sub>2</sub>O <font color="#ff0000" style="font-size: 18px">hot</font></div><script>alert(1)</script><img src="x" onerror="alert(1)">', B);
    expect(rich).toBe('**Title**\nH<sub>2</sub>O <span style="color:#ff0000;font-size:18px">hot</span>');
  });

  it('imports lists and tables', () => {
    const rich = htmlToRich('<ul><li>a</li><li>b</li></ul><table border="1"><tr><td>x</td><td><i>y</i></td></tr></table>after', B);
    expect(rich.split('\n')).toEqual(['- a', '- b', '<table border="1"><tr><td>x</td><td>*y*</td></tr></table>', 'after']);
  });

  it('writes draw.io html', () => {
    expect(richToDrawioHtml('a **b**\n<span style="color:#dc2626">r</span>', B)).toBe('a <b>b</b><br><span style="color:#dc2626">r</span>');
  });
});
