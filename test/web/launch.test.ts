import { describe, expect, it } from 'vitest';
import { normalizeSourceUrl, parseLaunchParams, resolvePageParam, urlWithoutSource } from '@/web/launch';

const BASE = 'https://draw.example.com/app/';

describe('parseLaunchParams', () => {
  it('defaults to a plain editor', () => {
    const p = parseLaunchParams(BASE);
    expect(p).toMatchObject({ mode: 'editor', source: null, error: null, autosave: false, saveButton: true, exitButton: true, toolbar: true });
  });

  it('detects viewer / lightbox / embed modes', () => {
    expect(parseLaunchParams(`${BASE}?viewer=1`).mode).toBe('viewer');
    expect(parseLaunchParams(`${BASE}?lightbox=1`).mode).toBe('viewer');
    expect(parseLaunchParams(`${BASE}?lightbox`).mode).toBe('viewer');
    expect(parseLaunchParams(`${BASE}?viewer=0`).mode).toBe('editor');
    expect(parseLaunchParams(`${BASE}?embed=1`).mode).toBe('embed');
    expect(parseLaunchParams(`${BASE}?embed=1&viewer=1`).mode).toBe('embed');
  });

  it('reads an inline #R diagram', () => {
    expect(parseLaunchParams(`${BASE}?viewer=1#RabcDEF`).source).toEqual({ kind: 'inline', hash: '#RabcDEF' });
  });

  it('reads ?url= and #U sources, resolving relative URLs', () => {
    expect(parseLaunchParams(`${BASE}?url=${encodeURIComponent('https://cdn.example.org/a b.drawio')}`).source).toEqual({
      kind: 'url',
      url: 'https://cdn.example.org/a%20b.drawio',
    });
    expect(parseLaunchParams(`${BASE}#U${encodeURIComponent('https://x.org/d.arkdraw')}`).source).toEqual({ kind: 'url', url: 'https://x.org/d.arkdraw' });
    expect(parseLaunchParams(`${BASE}?url=examples/flow.arkdraw`).source).toEqual({ kind: 'url', url: 'https://draw.example.com/app/examples/flow.arkdraw' });
  });

  it('prefers the fragment over ?url=', () => {
    expect(parseLaunchParams(`${BASE}?url=https://x.org/a.drawio#RZZZ`).source?.kind).toBe('inline');
  });

  it('refuses non-http(s) URLs', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/plain,hi', 'file:///etc/passwd', 'https://user:pw@x.org/a.drawio']) {
      const p = parseLaunchParams(`${BASE}?url=${encodeURIComponent(bad)}`);
      expect(p.source).toBeNull();
      expect(p.error).toMatch(/http/);
    }
  });

  it('rewrites GitHub blob URLs to raw files', () => {
    expect(normalizeSourceUrl('https://github.com/acme/docs/blob/main/arch/net.drawio', BASE)).toBe(
      'https://raw.githubusercontent.com/acme/docs/main/arch/net.drawio',
    );
  });

  it('parses embed options', () => {
    const p = parseLaunchParams(`${BASE}?embed=1&autosave=1&origin=https://host.example.com/page&proto=json&noSaveBtn=1&exitBtn=0`);
    expect(p).toMatchObject({ autosave: true, parentOrigin: 'https://host.example.com', jsonProtocol: true, saveButton: false, exitButton: false });
    expect(parseLaunchParams(`${BASE}?embed=1&origin=javascript:x`).parentOrigin).toBeNull();
  });

  it('parses title, page, theme and toolbar', () => {
    const p = parseLaunchParams(`${BASE}?viewer=1&title=Net%20map&page=2&theme=dark&toolbar=0`);
    expect(p).toMatchObject({ title: 'Net map', page: '2', theme: 'dark', toolbar: false });
    expect(parseLaunchParams(`${BASE}?dark=1`).theme).toBe('dark');
    expect(parseLaunchParams(`${BASE}?theme=purple`).theme).toBeNull();
  });
});

describe('urlWithoutSource', () => {
  it('drops the fragment and document params but keeps the rest', () => {
    expect(urlWithoutSource(`${BASE}?embed=1&url=https://x.org/a.drawio&title=x&page=2#Rabc`)).toBe(`${BASE}?embed=1`);
  });
});

describe('resolvePageParam', () => {
  const pages = [
    { id: 'a', name: 'Overview' },
    { id: 'b', name: 'Network' },
  ];
  it('accepts a 1-based index, an id or a (case-insensitive) name', () => {
    expect(resolvePageParam(pages, '2')?.id).toBe('b');
    expect(resolvePageParam(pages, 'a')?.id).toBe('a');
    expect(resolvePageParam(pages, 'network')?.id).toBe('b');
    expect(resolvePageParam(pages, '9')).toBeUndefined();
    expect(resolvePageParam(pages, null)).toBeUndefined();
  });
});
