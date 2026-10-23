import { describe, expect, it } from 'vitest';
import { IMPORTERS, importerFor } from '@/io/import';
import { parseMermaid } from '@/io/import/mermaid';
import { isConnector, isShape } from '@/model/types';

describe('importer discovery', () => {
  it('discovers every importer once and skips _shared', () => {
    const ids = IMPORTERS.map((i) => i.id);
    for (const id of ['csv', 'embedded', 'gliffy', 'lucid', 'mermaid', 'sql', 'text', 'vsdx']) expect(ids).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(importerFor('a.vsdx')?.id).toBe('vsdx');
    expect(importerFor('a.VSSX')?.id).toBe('vsdx');
    expect(importerFor('a.gliffy')?.id).toBe('gliffy');
    expect(importerFor('a.png')?.id).toBe('embedded');
    expect(importerFor('a.mmd')?.id).toBe('mermaid');
  });

  it('every built-in example imports cleanly', async () => {
    for (const imp of IMPORTERS.filter((i) => i.example && ['csv', 'lucid', 'mermaid', 'sql', 'text'].includes(i.id))) {
      const res = await imp.run(imp.example!);
      expect(res.pages.length, imp.id).toBeGreaterThan(0);
      const els = Object.values(res.pages[0].doc.elements);
      expect(els.filter(isShape).length, imp.id).toBeGreaterThan(1);
      expect(els.filter(isConnector).length, imp.id).toBeGreaterThan(0);
      // Attached endpoints reference existing shapes.
      for (const c of els.filter(isConnector)) {
        for (const end of [c.source, c.target]) if (end.elementId) expect(res.pages[0].doc.elements[end.elementId], imp.id).toBeTruthy();
      }
    }
  });
});

describe('mermaid edge cases', () => {
  it('handles quoted labels with brackets, entities and markdown strings', () => {
    const d = parseMermaid(`flowchart TB
  a["Label [with] (parens)"] -->b("#quot;quoted#quot; &amp; more")
  c["\`**Bold** text\`"]-- "edge text" ---d[Multi<br/>line]
  e-->f-->|x|g`).pages[0].doc;
    const s = Object.values(d.elements).filter(isShape);
    expect(s.map((x) => x.text)).toEqual(expect.arrayContaining(['Label [with] (parens)', '"quoted" & more', 'Bold text', 'Multi\nline']));
    const cs = Object.values(d.elements).filter(isConnector);
    expect(cs).toHaveLength(4);
    expect(cs.find((c) => c.text === 'edge text')!.endArrow).toBe('none');
    expect(cs.find((c) => c.text === 'x')).toBeTruthy();
  });

  it('nodes referenced only inside a subgraph and edges to subgraphs', () => {
    const d = parseMermaid(`graph LR
  subgraph one
    a1-->a2
  end
  subgraph two [Second]
    b1-->b2
  end
  one --> two
  c1 --> a2`).pages[0].doc;
    const s = Object.values(d.elements).filter(isShape);
    const one = s.find((x) => x.text === 'one')!;
    const two = s.find((x) => x.text === 'Second')!;
    expect(s.find((x) => x.text === 'a1')!.containerId).toBe(one.id);
    expect(s.find((x) => x.text === 'b2')!.containerId).toBe(two.id);
    expect(s.find((x) => x.text === 'c1')!.containerId).toBeUndefined();
    const cs = Object.values(d.elements).filter(isConnector);
    expect(cs.some((c) => c.source.elementId === one.id && c.target.elementId === two.id)).toBe(true);
  });
});
