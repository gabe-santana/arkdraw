import { describe, expect, it } from 'vitest';
import { deflateSync, strToU8 } from 'fflate';
import { buildShareUrl, decodeShareHash, encodeShareHash, ShareLinkError } from '@/web/shareLink';

const sample = JSON.stringify({ format: 'opendraw', version: 2, pages: [{ id: 'p1', name: 'Página ✓ 图', elements: [] }] }, null, 2);

describe('share hash', () => {
  it('round-trips JSON, including non-ASCII text', () => {
    const hash = encodeShareHash(sample);
    expect(hash.startsWith('#R')).toBe(true);
    expect(decodeShareHash(hash)).toBe(sample);
  });

  it('is URL-safe (base64url, no padding)', () => {
    const hash = encodeShareHash(sample.repeat(50));
    expect(hash.slice(2)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('compresses repetitive diagrams well', () => {
    const big = JSON.stringify({ els: Array.from({ length: 500 }, (_, i) => ({ id: `e${i}`, kind: 'rectangle', x: i, y: i })) });
    expect(encodeShareHash(big).length).toBeLessThan(big.length / 4);
    expect(decodeShareHash(encodeShareHash(big))).toBe(big);
  });

  it('accepts the fragment without "#", or inside a full URL', () => {
    const hash = encodeShareHash(sample);
    expect(decodeShareHash(hash.slice(1))).toBe(sample);
    expect(decodeShareHash(`https://draw.example.com/app/?viewer=1${hash}`)).toBe(sample);
  });

  it('decodes draw.io-style links (standard base64 of URI-encoded XML)', () => {
    const xml = '<mxfile><diagram name="Página">abc</diagram></mxfile>';
    const bytes = deflateSync(strToU8(encodeURIComponent(xml)));
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    expect(decodeShareHash(`#R${btoa(bin)}`)).toBe(xml);
    // …and when the fragment itself was percent-encoded by a mail client.
    expect(decodeShareHash(`#R${encodeURIComponent(btoa(bin))}`)).toBe(xml);
  });

  it('rejects damaged or foreign fragments', () => {
    expect(() => decodeShareHash('#Rnot-really-deflate!!')).toThrow(ShareLinkError);
    expect(() => decodeShareHash('#Uhttps://x')).toThrow(ShareLinkError);
    expect(() => decodeShareHash('')).toThrow(ShareLinkError);
  });

  it('builds full share URLs', () => {
    const url = buildShareUrl(sample, { base: 'https://draw.example.com/opendraw/?foo=1#old', viewer: true, params: { title: 'Net map' } });
    expect(url.startsWith('https://draw.example.com/opendraw/?viewer=1&title=Net+map#R')).toBe(true);
    expect(decodeShareHash(url)).toBe(sample);
  });
});
