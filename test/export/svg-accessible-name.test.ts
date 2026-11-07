import { describe, expect, it } from 'vitest';
import { renderSvg } from '@/io/export/svg';
import { sampleDoc } from './fixtures';

describe('SVG export accessible name', () => {
  it('names the root svg with role="img" and a <title> when a title is given', () => {
    const { svg } = renderSvg(sampleDoc(), { background: '#ffffff', embedFont: false, title: 'My diagram' });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>My diagram</title>');
  });

  it('adds a <desc> to the root svg when a description is given', () => {
    const { svg } = renderSvg(sampleDoc(), { background: '#ffffff', embedFont: false, title: 'My diagram', desc: 'Flow of the login process' });
    expect(svg).toContain('<desc>Flow of the login process</desc>');
  });

  it('leaves the markup unchanged when no title is given', () => {
    const { svg } = renderSvg(sampleDoc(), { background: '#ffffff', embedFont: false });
    expect(svg).not.toContain('role="img"');
    expect(svg).not.toContain('<title>');
  });
});
